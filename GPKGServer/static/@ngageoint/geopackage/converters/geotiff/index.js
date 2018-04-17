var GeoPackage = require('@ngageoint/geopackage')
  , BoundingBox = GeoPackage.BoundingBox
  , TileUtilities = GeoPackage.TileUtilities;

var fs = require('fs')
  , async = require('async')
  , path = require('path')
  , stream = require('stream')
  , GeoTIFF = require('geotiff');

var initialResolution = 156543.03392804062;
var zoomToResolution = [];

for (var i = 0; i <= 18; i++) {
  zoomToResolution[i] = initialResolution / Math.pow(2, i);
}

module.exports.addLayer = function(options, progressCallback, doneCallback) {
  doneCallback = arguments[arguments.length - 1];
  progressCallback = typeof arguments[arguments.length - 2] === 'function' ? arguments[arguments.length - 2] : undefined;

  options.append = true;

  setupConversion(options, progressCallback, doneCallback);
};

module.exports.convert = function(options, progressCallback, doneCallback) {
  doneCallback = arguments[arguments.length - 1];
  progressCallback = typeof arguments[arguments.length - 2] === 'function' ? arguments[arguments.length - 2] : undefined;

  options.append = false;

  setupConversion(options, progressCallback, doneCallback);
};

module.exports.extract = function(geopackage, tableName, callback) {
  var geoJson = {
    type: 'FeatureCollection',
    features: []
  };
  GeoPackage.iterateGeoJSONFeaturesFromTable(geopackage, tableName, function(err, feature, done) {
    geoJson.features.push(feature);
    done();
  }, function(err) {
    var zip = shpwrite.zip(geoJson);
    callback(err, zip);
  });
};

function maxZoomForResolution(res) {
  for (var i = 0; i < zoomToResolution.length; i++) {
    if (zoomToResolution[i] < res) return i-1;
  }
  return zoomToResolution.length - 1;
};

var lwip = require('lwip');
function setupConversion(options, progressCallback, doneCallback) {
  if (!progressCallback) {
    progressCallback = function(status, cb) {
      cb();
    }
  }

  var geotiff = options.geotiff;
  var geopackage = options.geopackage;
  var tableName = options.tableName || 'image';

  async.waterfall([
  function(callback) {
    // create or open the geopackage
    if (typeof geopackage === 'object') {
      return progressCallback({status: 'Opening GeoPackage'}, function() {
        callback(null, geopackage);
      });
    }

    try {
      var stats = fs.statSync(geopackage);
      if (!options.append) {
        console.log('GeoPackage file already exists, refusing to overwrite ' + geopackage);
        return callback(new Error('GeoPackage file already exists, refusing to overwrite ' + geopackage));
      } else {
        return GeoPackage.openGeoPackage(geopackage, callback);
      }
    } catch (e) {}
    return progressCallback({status: 'Creating GeoPackage'}, function() {
      GeoPackage.createGeoPackage(geopackage, callback);
    });
  },
  function(gp, callback) {
    if (typeof options.geotiff === 'string') {
      tableName = path.basename(options.geotiff, path.extname(options.geotiff));
    }
    geopackage = gp;
    geopackage.getTileTables(function(err, tables) {
      var count = 1;
      while(tables.indexOf(tableName) !== -1) {
        tableName = tableName + '_' + count;
        count++;
      }
      callback();
    });
  }, function(callback) {
    fs.readFile(geotiff, function(err, data) {
      if (err) throw err;
      var ab = new ArrayBuffer(data.length);
      var view = new Uint8Array(ab);
      for (var i = 0; i < data.length; i++) {
        view[i] = data[i];
      }
      var tiff = GeoTIFF.parse(ab);

      var image = tiff.getImage();

      console.log('width', image.getWidth());
      console.log('height', image.getHeight());
      console.log('samples per pixel', image.getSamplesPerPixel());
      console.log('geokeys', image.getGeoKeys());
      console.log('tilewidth', image.getTileWidth());
      console.log('tileheight', image.getTileHeight());
      console.log('gdal', image.getGDALMetadata());
      console.log('tiepoints', image.getTiePoints());
      console.log('pixel scale', image.getPixelScale());
      console.log('model transformation', image.getModelTransformation());

      var corners = image.getCorners();
      console.log('corners', corners);



      var colorSpace = image.getFileDirectory().PhotometricInterpretation;
      console.log('colorSpace', colorSpace);
      callback(null, image);
    });
  }, function(image, callback) {
    var srsName = 'ESRI:'+image.getGeoKeys().ProjectedCSTypeGeoKey;
    var srsDef = GeoPackage.proj4Defs['EPSG:'+image.getGeoKeys().ProjectedCSTypeGeoKey];
    console.log('srsDef', srsDef);

    var srsDao = geopackage.getSpatialReferenceSystemDao();
    var srs = srsDao.createObject();
    srs.srs_name = srsName;
    srs.srs_id = image.getGeoKeys().ProjectedCSTypeGeoKey;
    srs.organization_coordsys_id = image.getGeoKeys().ProjectedCSTypeGeoKey;
    srs.organization = 'EPSG';
    srs.definition = srsDef;
    srsDao.create(srs, function(err) {
      callback(null, image, image.getGeoKeys().ProjectedCSTypeGeoKey);
    });
  }, function(image, srsId, callback) {

    var tileHeight = 256;
    var tileWidth = 256;

    var baseZoom = maxZoomForResolution(image.getPixelScale()[0]);

    var baseMatrixWidth = Math.ceil(image.getWidth() / tileWidth);
    var baseMatrixHeight = Math.ceil(image.getHeight() / tileHeight);

    var basePixelXSize = image.getPixelScale()[0];
    var basePixelYSize = image.getPixelScale()[1];

    var maxXPixel = baseMatrixWidth * tileWidth;
    var maxYPixel = baseMatrixHeight * tileHeight;

    var ul = image.imageToPCS(0, 0);
    var lr = image.imageToPCS(maxXPixel, maxYPixel);

    var contentsBoundingBox = new BoundingBox(ul.x, lr.x, lr.y, ul.y);
    var contentsSrsId = srsId;
    var tileMatrixSetBoundingBox = new BoundingBox(ul.x, lr.x, lr.y, ul.y);
    var tileMatrixSetSrsId = srsId;

    geopackage.createTileTableWithTableName(tableName, contentsBoundingBox, contentsSrsId, tileMatrixSetBoundingBox, tileMatrixSetSrsId, function(err, tileMatrixSet) {
      var tileMatrixDao = geopackage.getTileMatrixDao();

      var zoom = options.minZoom || 0;
      var maxZoom = options.maxZoom || 18;

      async.whilst(
        function() {
          return zoom <= maxZoom;
        },
        function(callback) {

          var tileMatrix = tileMatrixDao.createObject();
          tileMatrix.table_name = tileMatrixSet.table_name;
          tileMatrix.zoom_level = zoom;
          tileMatrix.matrix_width = Math.max(1, baseMatrixWidth * (Math.pow(2, zoom - baseZoom)));
          tileMatrix.matrix_height = Math.max(1, baseMatrixHeight * (Math.pow(2, zoom - baseZoom)));
          tileMatrix.tile_width = tileWidth;
          tileMatrix.tile_height = tileHeight;
          tileMatrix.pixel_x_size = basePixelXSize / (Math.pow(2, zoom - baseZoom));
          tileMatrix.pixel_y_size = basePixelYSize / (Math.pow(2, zoom - baseZoom));

          zoom++;

          tileMatrixDao.create(tileMatrix, callback);
        },
        function(err) {
          console.log('err', err);
          geopackage.getTileDaoWithTileMatrixSet(tileMatrixSet, function(err, tileDao) {
            callback(null, image, srsId, tileDao);
          });
        }
      );
    });
  }, function(image, srsId, tileDao, callback) {

    var tileHeight = 256;
    var tileWidth = 256;

    var baseZoom = maxZoomForResolution(image.getPixelScale()[0]);

    var baseMatrixWidth = Math.ceil(image.getWidth() / tileWidth);
    var baseMatrixHeight = Math.ceil(image.getHeight() / tileHeight);

    var basePixelXSize = image.getPixelScale()[0];
    var basePixelYSize = image.getPixelScale()[1];

    var maxXPixel = baseMatrixWidth * tileWidth;
    var maxYPixel = baseMatrixHeight * tileHeight;

    var ul = image.imageToPCS(0, 0);
    var lr = image.imageToPCS(maxXPixel, maxYPixel);

    var contentsBoundingBox = new BoundingBox(ul.x, lr.x, lr.y, ul.y);
    var contentsSrsId = srsId;
    var tileMatrixSetBoundingBox = new BoundingBox(ul.x, lr.x, lr.y, ul.y);
    var tileMatrixSetSrsId = srsId;

    var zoom = options.minZoom || 0;
    var maxZoom = options.maxZoom || 18;

    var imageWidth = image.getWidth();
    var imageHeight = image.getHeight();

    var xTile = 0;
    var yTile = 0;

    async.whilst(function() {
      return zoom <= maxZoom;
    },
    function(zoomDone) {

      var xTile = 0;
      var yTile = 0;

      var zoomMatrixWidth = Math.max(1, baseMatrixWidth * (Math.pow(2, zoom - baseZoom)));
      var zoomMatrixHeight = Math.max(1, baseMatrixHeight * (Math.pow(2, zoom - baseZoom)));
      var zoomPixelXSize = basePixelXSize * (Math.pow(2, zoom - baseZoom));
      var zoomPixelYSize = basePixelYSize * (Math.pow(2, zoom - baseZoom));

      var widthScale = zoomPixelXSize / basePixelXSize;
      var heightScale = zoomPixelYSize / basePixelYSize;

      console.log('Zoom Matrix Width: ' + zoomMatrixWidth);
      console.log('Zoom Matrix Height: ' + zoomMatrixHeight);

      async.whilst(function() {
        return xTile < zoomMatrixWidth;
      },
      function(yDone) {
        async.whilst(function() {
          return yTile < zoomMatrixHeight;
        }, function(tileDone) {
          console.log('Creating Tile zoom: %d, x: %d, y: %d', zoom, xTile, yTile);

          var window = [
            ~~(xTile * (imageWidth / zoomMatrixWidth)),
            ~~(yTile * (imageHeight / zoomMatrixHeight)),
            ~~(Math.min(imageWidth, ((xTile+1) * (imageWidth / zoomMatrixWidth)))),
            ~~(Math.min(imageHeight, ((yTile+1) * (imageHeight / zoomMatrixHeight))))
          ];

          // var window = [
          //   ~~(xTile * (imageWidth / zoomMatrixWidth)),
          //   ~~(yTile * (imageHeight / zoomMatrixHeight)),
          //   ~~(((xTile+1) * (imageWidth / zoomMatrixWidth))),
          //   ~~(((yTile+1) * (imageHeight / zoomMatrixHeight)))
          // ];

          console.log('window', window);

          image.readRasters({
            window: window
          }, function(data) {
            var width = (window[2] - window[0]);
            var height = (window[3] - window[1]);

            console.log('data[0].length', data[0].length);
            console.log('width %d height %d w*h %d', width, height, width*height);

            createPNGLwip(width, height, data[0], data[1], data[2], undefined, tileWidth, tileHeight, widthScale, heightScale, function(err, buffer) {
              var newRow = tileDao.newRow();
              newRow.setZoomLevel(zoom);
              newRow.setTileColumn(xTile);
              newRow.setTileRow(yTile);
              newRow.setTileData(buffer);
              tileDao.create(newRow, function(err) {
                console.log('err', err);
                yTile++;
                tileDone();
              });
            });
          });
        }, function() {
          xTile++;
          yTile = 0;
          yDone();
        });
      },
      function() {
        zoom++;
        zoomDone();
      });
    }, function() {
      callback();
    });
  }], function() {
    doneCallback();
  });
}

function createPNGLwip(width, height, redArray, greenArray, blueArray, alphaOrArray, finalWidth, finalHeight, widthScale, heightScale, callback) {
  var lwip = require('lwip');
  var r = [];
  var g = [];
  var b = [];
  var buff = new Buffer(width * height * 3);

  var length = redArray.length;
  for (var i = 0; i < length; i++) {
    r.push(redArray[i]);
    g.push(greenArray[i]);
    b.push(blueArray[i]);
  }
  var buff = new Buffer(r.concat(g, b));
  // lwip.open(buff, {width: width, height: height}, function(err, image) {
  //   image.resize(finalWidth, finalHeight, function(err, image) {
  //     image.writeFile('/tmp/small.png', function(err){
  //       image.toBuffer('png', {
  //         transparency: true
  //       }, callback);
  //     });
  //   });
  // });

  lwip.open(buff, {width: width, height: height}, function(err, image) {
    image.scale(widthScale, heightScale, function(err, image) {
      // image.writeFile('/tmp/scale.png', function(err){
        image.toBuffer('png', {
          transparency: true
        }, callback);
      // });
    });
  });
}
