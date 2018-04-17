/**
 * TileMatrixSet module.
 * @module tiles/matrixset
 * @see module:dao/dao
 */

var Dao = require('../../dao/dao')
  , BoundingBox = require('../../boundingBox')
  , SpatialReferenceSystemDao = require('../../core/srs').SpatialReferenceSystemDao;
  // , ContentsDao = require('../../core/contents').ContentsDao;

var util = require('util');

/**
 * Tile Matrix Set object. Defines the minimum bounding box (min_x, min_y,
 * max_x, max_y) and spatial reference system (srs_id) for all content in a tile
 * pyramid user data table.
 * @class TileMatrixSet
 */
var TileMatrixSet = function() {

  /**
   * TilePyramid User Data Table Name
   * @member {string}
   */
  this.table_name;

  /**
   * Unique identifier for each Spatial Reference System within a GeoPackage
   * @member {Number}
   */
  this.srs_id;

  /**
   * Bounding box minimum easting or longitude for all content in table_name
   * @member {Number}
   */
  this.min_x;

  /**
   * Bounding box minimum northing or latitude for all content in table_name
   * @member {Number}
   */
  this.min_y;

  /**
   * Bounding box maximum easting or longitude for all content in table_name
   * @member {Number}
   */
  this.max_x;

  /**
   * Bounding box maximum northing or latitude for all content in table_name
   * @member {Number}
   */
  this.max_y;
};

TileMatrixSet.prototype.setBoundingBox = function (boundingBox) {
  this.min_x = boundingBox.minLongitude;
  this.max_x = boundingBox.maxLongitude;
  this.min_y = boundingBox.minLatitude;
  this.max_y = boundingBox.maxLatitude;
};

TileMatrixSet.prototype.getBoundingBox = function () {
  return new BoundingBox(this.min_x, this.max_x, this.min_y, this.max_y);
};

TileMatrixSet.prototype.setContents = function(contents) {
  if (contents && contents.data_type === 'tiles') {
    this.table_name = contents.table_name;
  }
}

TileMatrixSet.prototype.setSrs = function(srs) {
  if (srs) {
    this.srs_id = srs.srs_id;
  }
}

/**
 * Tile Matrix Set Data Access Object
 * @class TileMatrixSetDao
 * @extends {module:dao/dao~Dao}
 */
var TileMatrixSetDao = function(connection) {
  Dao.call(this, connection);
  this.connection = connection;
}

util.inherits(TileMatrixSetDao, Dao);

TileMatrixSetDao.prototype.createObject = function () {
  return new TileMatrixSet();
};

/**
 * Get the tile table names
 * @param  {Function} callback returns the tile table names
 */
TileMatrixSetDao.prototype.getTileTables = function (callback) {
  var tableNames = [];
  this.connection.each('select ' + TileMatrixSetDao.COLUMN_TABLE_NAME + ' from ' + TileMatrixSetDao.TABLE_NAME, function(err, result, rowDone) {
    if (err) return rowDone(err);
    tableNames.push(result[TileMatrixSetDao.COLUMN_TABLE_NAME]);
    rowDone();
  }, function(err, numberOfResults) {
    callback(err, tableNames);
  });
};

TileMatrixSetDao.prototype.getProjection = function (tileMatrixSet, callback) {
  this.getSrs(tileMatrixSet, function(err, srs) {
    if (err) return callback(err);
    if (!srs) return callback();
    var srsDao = this.getSpatialReferenceSystemDao();
    callback(null, srsDao.getProjection(srs));
  }.bind(this));
};

/**
 * Get the Spatial Reference System of the Tile Matrix set
 * @param  {TileMatrixSet}   tileMatrixSet tile matrix set
 * @param  {Function} callback      called with an error if one occurred and the srs
 */
TileMatrixSetDao.prototype.getSrs = function (tileMatrixSet, callback) {
  var dao = this.getSpatialReferenceSystemDao();
  dao.queryForIdObject(tileMatrixSet.srs_id, callback);
};

TileMatrixSetDao.prototype.getContents = function (tileMatrixSet, callback) {
  var dao = this.getContentsDao();
  dao.queryForIdObject(tileMatrixSet.table_name, callback);
};

TileMatrixSetDao.prototype.getSpatialReferenceSystemDao = function () {
  return new SpatialReferenceSystemDao(this.connection);
};

TileMatrixSetDao.prototype.getContentsDao = function () {
  var ContentsDao = require('../../core/contents').ContentsDao;
  return new ContentsDao(this.connection);
};

TileMatrixSet.TABLE_NAME = "tableName";
TileMatrixSet.MIN_X = "minX";
TileMatrixSet.MIN_Y = "minY";
TileMatrixSet.MAX_X = "maxX";
TileMatrixSet.MAX_Y = "maxY";
TileMatrixSet.SRS_ID = "srsId";

TileMatrixSetDao.TABLE_NAME = "gpkg_tile_matrix_set";
TileMatrixSetDao.COLUMN_PK = "table_name";
TileMatrixSetDao.COLUMN_TABLE_NAME = "table_name";
TileMatrixSetDao.COLUMN_SRS_ID = "srs_id";
TileMatrixSetDao.COLUMN_MIN_X = "min_x";
TileMatrixSetDao.COLUMN_MIN_Y = "min_y";
TileMatrixSetDao.COLUMN_MAX_X = "max_x";
TileMatrixSetDao.COLUMN_MAX_Y = "max_y";

TileMatrixSetDao.prototype.gpkgTableName = 'gpkg_tile_matrix_set';
TileMatrixSetDao.prototype.idColumns = [TileMatrixSetDao.COLUMN_PK];
TileMatrixSetDao.prototype.columns = [TileMatrixSetDao.COLUMN_TABLE_NAME, TileMatrixSetDao.COLUMN_SRS_ID, TileMatrixSetDao.COLUMN_MIN_X, TileMatrixSetDao.COLUMN_MIN_Y, TileMatrixSetDao.COLUMN_MAX_X, TileMatrixSetDao.COLUMN_MAX_Y];

TileMatrixSetDao.prototype.columnToPropertyMap = {};
TileMatrixSetDao.prototype.columnToPropertyMap[TileMatrixSetDao.COLUMN_TABLE_NAME] = TileMatrixSet.TABLE_NAME;
TileMatrixSetDao.prototype.columnToPropertyMap[TileMatrixSetDao.COLUMN_SRS_ID] = TileMatrixSet.SRS_ID;
TileMatrixSetDao.prototype.columnToPropertyMap[TileMatrixSetDao.COLUMN_MIN_X] = TileMatrixSet.MIN_X;
TileMatrixSetDao.prototype.columnToPropertyMap[TileMatrixSetDao.COLUMN_MIN_Y] = TileMatrixSet.MIN_Y;
TileMatrixSetDao.prototype.columnToPropertyMap[TileMatrixSetDao.COLUMN_MAX_X] = TileMatrixSet.MAX_X;
TileMatrixSetDao.prototype.columnToPropertyMap[TileMatrixSetDao.COLUMN_MAX_Y] = TileMatrixSet.MAX_Y;

module.exports.TileMatrixSetDao = TileMatrixSetDao;
module.exports.TileMatrixSet = TileMatrixSet;
