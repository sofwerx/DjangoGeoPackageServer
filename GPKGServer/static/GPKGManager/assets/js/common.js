/*
TODO:
Change Templates to have their own generators, maybe make a templating object for easier table type addition.
Change Logic of the feature and tile loads for faster response times
Change implementation of templating generation for smoother UI experience (allowing timeouts for UI updates)
*/
var tableDaos;
(function (window, document, undefined) {

  L.Control.ZoomIndicator = L.Control.extend({
  	options: {
  		position: 'topleft',
  		enabled: true
  	},

  	onAdd: function (map) {
  		var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-zoom-indicator');
      this._link = L.DomUtil.create('a', '', container);
      this._link.innerHTML = map.getZoom();
      map.on('zoomend', function() {
        this._link.innerHTML = map.getZoom();
      }, this);

      return container;
    }
  });

}(this, document));

var map = L.map('map', {
  center: [45,0],
  zoom: 3,
  worldCopyJump: true,
  // maxBounds: [
  //   [-85, -180],
  //   [85, 180]
  // ],
  attributionControl: false
});

map.addControl(new L.Control.ZoomIndicator());

var baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.mapbox.com/map-feedback/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>'
});

baseLayer.on("load",function(){console.log("Base Map Loaded");$('body').addClass('loaded');baseLayer.off('load')});
baseLayer.addTo(map);

var geoPackage;
var tableLayers;
var imageOverlay;
var currentTile = {};
var tableInfos;
var fileName;
var allTableNames = [];

// Save GPKG Function
/* The next two functions are Downloading the geopackage by exporting and transforming the data in the geopackage into a Blob*/
var saveByteArray = (function () {
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    return function (data, name) {
        var blob = new Blob(data, {type: "octet/stream"}),
            url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = name;
        a.click();
        window.URL.revokeObjectURL(url);
    };
}());

window.saveGeoPackage = function() {
  geoPackage.export(function(err, data) {
    fileName = fileName || 'geopackage.gpkg';
    saveByteArray([data.buffer], fileName.substring(0, fileName.lastIndexOf('.')) + '.gpkg');
  });
}

// Save GeoJSON Function
window.downloadGeoJSON = function(tableName) {
  GeoJSONToGeoPackage.extract(geoPackage, tableName, function(err, geoJson) {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(geoJson));

    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    a.href = dataStr;
    a.download = tableName + '.geojson';
    a.click();
  });
}

//Load GeoPackage
/*  This function parses common files and assembles data into a useable geopackage format
	There is also a custom function that uploads the package to the server, this logic should be seperated later*/
window.loadGeoPackage = function(files) {
  var f = files[0];
  console.log(f);
  fileName = f.name;
  $('#choose-label').find('i').toggle();
  $('#choose-label').find('span').text(f.name);
  $('#status').removeClass('gone');

  var r = new FileReader();
  var uploadReader = new FileReader();
  r.onload = function() {
    var array = new Uint8Array(r.result);
	//var blobString = new Blob(r.result);
    // if it is a GeoPackage file
    if (f.name.lastIndexOf('gpkg') === f.name.lastIndexOf('.')+1) {
      ga('send', {
        hitType: 'event',
        eventCategory: 'GeoPackage',
        eventAction: 'load',
        eventLabel: 'File Size',
        eventValue: array.byteLength
      });
      loadByteArray(array, function() {
        $('#choose-label').find('i').toggle();
        $('#download').removeClass('gone');
      });
    }
    // if it is a GeoJSON file
    else if (f.name.lastIndexOf('json') > f.name.lastIndexOf('.')) {
      ga('send', {
        hitType: 'event',
        eventCategory: 'GeoJSON',
        eventAction: 'load',
        eventLabel: 'File Size',
        eventValue: array.byteLength
      });
      var jsonString = '';
      var len = array.byteLength;
      for (var i = 0; i < len; i++) {
        jsonString += String.fromCharCode( array[ i ] );
      }
      var json = JSON.parse(jsonString);
      GeoJSONToGeoPackage.convert(json, function(status, callback) {
        var text = status.status;
        if (status.completed) {
          text += ' - ' + ((status.completed / status.total) * 100).toFixed(2) + ' (' + status.completed + ' of ' + status.total + ')';
        }
        $('#status').text(text);
        setTimeout(callback, 0);
      }, function(err, gp) {
        geoPackage = gp;
        clearInfo();
        readGeoPackage(function() {
          $('#choose-label').find('i').toggle();
          $('#download').removeClass('gone');
          $('#status').addClass('gone');
        });
      });
    }
    // if it is a Shapefile zip
    else if (f.name.lastIndexOf('zip') > f.name.lastIndexOf('.')) {
      ga('send', {
        hitType: 'event',
        eventCategory: 'Shapefile Zip',
        eventAction: 'load',
        eventLabel: 'File Size',
        eventValue: array.byteLength
      });
      ShapefileToGeoPackage.convert({
        shapezipData: array
      }, function(status, callback) {
        var text = status.status;
        if (status.completed) {
          text += ' - ' + ((status.completed / status.total) * 100).toFixed(2) + ' (' + status.completed + ' of ' + status.total + ')';
        }
        $('#status').text(text);
        setTimeout(callback, 0);
      }, function(err, gp) {
        geoPackage = gp;
        clearInfo();
        readGeoPackage(function() {
          $('#choose-label').find('i').toggle();
          $('#download').removeClass('gone');
          $('#status').addClass('gone');
        });
      });
    }
    // if it is a Shapefile shp
    else if (f.name.lastIndexOf('shp') > f.name.lastIndexOf('.')) {
      ga('send', {
        hitType: 'event',
        eventCategory: 'Shapefile',
        eventAction: 'load',
        eventLabel: 'File Size',
        eventValue: array.byteLength
      });
      ShapefileToGeoPackage.convert({
        shapeData: array
      }, function(status, callback) {
        var text = status.status;
        if (status.completed) {
          text += ' - ' + ((status.completed / status.total) * 100).toFixed(2) + ' (' + status.completed + ' of ' + status.total + ')';
        }
        $('#status').text(text);
        setTimeout(callback, 0);
      }, function(err, gp) {
        geoPackage = gp;
        clearInfo();
        readGeoPackage(function() {
          $('#choose-label').find('i').toggle();
          $('#download').removeClass('gone');
          $('#status').addClass('gone');
        });
      });
    }
    // if it is a MBTiles file
    else if (f.name.lastIndexOf('mbtiles') > f.name.lastIndexOf('.')) {
      ga('send', {
        hitType: 'event',
        eventCategory: 'MBTiles',
        eventAction: 'load',
        eventLabel: 'File Size',
        eventValue: array.byteLength
      });
      MBTilesToGeoPackage.convert({
        mbtilesData: array
      }, function(status, callback) {
        var text = status.status;
        if (status.completed) {
          text += ' - ' + ((status.completed / status.total) * 100).toFixed(2) + ' (' + status.completed + ' of ' + status.total + ')';
        }
        $('#status').text(text);
        setTimeout(callback, 0);
      }, function(err, gp) {
        geoPackage = gp;
        clearInfo();
        readGeoPackage(function() {
          $('#choose-label').find('i').toggle();
          $('#download').removeClass('gone');
          $('#status').addClass('gone');
        });
      });
    }
    // if it is a PBF file
    else if (f.name.lastIndexOf('pbf') > f.name.lastIndexOf('.')) {
      ga('send', {
        hitType: 'event',
        eventCategory: 'PBF',
        eventAction: 'load',
        eventLabel: 'File Size',
        eventValue: array.byteLength
      });
      PBFToGeoPackage.convert({
        pbf: array
      }, function(status, callback) {
        var text = status.status;
        if (status.completed) {
          text += ' - ' + ((status.completed / status.total) * 100).toFixed(2) + ' (' + status.completed + ' of ' + status.total + ')';
        }
        $('#status').text(text);
        setTimeout(callback, 0);
      }, function(err, gp) {
        geoPackage = gp;
        clearInfo();
        readGeoPackage(function() {
          $('#choose-label').find('i').toggle();
          $('#download').removeClass('gone');
          $('#status').addClass('gone');
        });
      });
    }
  }
  r.readAsArrayBuffer(f);
  //uploadReader.readAsText(f);
    var data = new FormData();
	jQuery.each(jQuery('#file')[0].files, function(i, file) {
		data.append('file-'+i, file);
	});
	data.append("Name", jQuery('#file')[0].files[0].name);
	jQuery.ajax({
		url: '/createGeoPackage/',
		data: data,
		cache: false,
		contentType: false,
		processData: false,
		method: 'POST',
		type: 'POST', // For jQuery < 1.9
		success: function(data){
			//alert(data);
			//console.log(data);
			$("#listOfPackages").append($("<li>",{"class":"list-group-item","onclick":"loadSavedPackage("+data.name + ")"}).text(data.name))
		},
		xhr: function () {
			var myXhr = $.ajaxSettings.xhr();
			if (myXhr.upload) {
				myXhr.upload.addEventListener('progress', function (event) {
					var percent = 0;
					var position = event.loaded || event.position;
					var total = event.total;
					var progress_bar_id = "#progress-wrp";
					if (event.lengthComputable) {
						percent = Math.ceil(position / total * 100);
					}
					console.log(percent);
  					var elem = document.getElementById("myBar"); 
  					var cont = document.getElementById("myProgress"); 
					elem.style.width = percent + '%'; 
					elem.innerHTML = percent * 1  + '%';
					cont.style.display = (percent<100)?"visible":"none";
				}, false);
			}
			return myXhr;
		},
	});
	$("#EditingTab")[0].click();
}

//Clear Info
/* This function clears the map and the data structures that hold geopackage information */
function clearInfo() {
  var tileTableNode = $('#tile-tables');
  tileTableNode.empty();
  var featureTableNode = $('#feature-tables');
  featureTableNode.empty();

  for (layerName in tableLayers) {
    map.removeLayer(tableLayers[layerName]);
  }
  tableLayers = {};
  if (imageOverlay) {
    map.removeLayer(imageOverlay);
  }
  $('#information').removeClass('hidden').addClass('visible');
}

//Load Byte Array
/*This is a helper function to clear the map and open the new geopackage*/
function loadByteArray(array, callback) {
  clearInfo();

  GeoPackageAPI.openGeoPackageByteArray(array, function(err, gp) {
    geoPackage = gp;
    readGeoPackage(callback);
  });
}

//Read GeoPackage
/*This function iterates through the Feature and Tile daos and retrieves their information
  It now also establishes a data structure for related tables
  It also starts to render the templates for the tables */
function readGeoPackage(callback) {
  tableInfos = {};
  tableDaos = {};
  allTableRelations = {};
  var featureTableTemplate = $('#feature-table-template').html();
  Mustache.parse(featureTableTemplate);

  var tileTableTemplate = $('#tile-table-template').html();
  Mustache.parse(tileTableTemplate);

  var tileTableNode = $('#tile-tables');
  var featureTableNode = $('#feature-tables');

  async.parallel([
    function(callback) {
      geoPackage.getTileTables(function(err, tables) {
        async.eachSeries(tables, function(table, callback) {
          geoPackage.getTileDaoWithTableName(table, function(err, tileDao) {
            geoPackage.getInfoForTable(tileDao, function(err, info) {
			  let tableWords = info.tableName.split("_");
				for (let word in tableWords) {
					tableWords[word] = tableWords[word].charAt(0).toUpperCase() + tableWords[word].substr(1);
				}
			  info["displayName"] = tableWords.join(" ");
              tableInfos[table] = info;
			  
			  
              tableDaos[table] = tileDao;
              var rendered = Mustache.render(tileTableTemplate, info);
              tileTableNode.append(rendered);
              callback();
            });
          });
        }, callback);
      });
    }, function(callback) {
      geoPackage.getFeatureTables(function(err, tables) {
        async.eachSeries(tables, function(table, callback) {
          geoPackage.getFeatureDaoWithTableName(table, function(err, featureDao) {
            if (err) {
              return callback();
            }
            geoPackage.getInfoForTable(featureDao, function(err, info) {
			  let tableWords = info.tableName.split("_");
				for (let word in tableWords) {
					tableWords[word] = tableWords[word].charAt(0).toUpperCase() + tableWords[word].substr(1);
				}
			  info["displayName"] = tableWords.join(" ");
              tableInfos[table] = info;
				
              tableDaos[table] = featureDao;
              var rendered = Mustache.render(featureTableTemplate, info);
              featureTableNode.append(rendered);
              callback();
            });
          });
        }, callback);
      });
    }, function(callback) {
      geoPackage.getContentsDao().queryForAll(function(err, tableNames) {
        console.log(tableNames);
      });
		// We're getting all of the table names from this package
		//Now we suss out data from the relations table
		geoPackage.connection.all("select * from gpkgext_relations", function (err, data) {
			console.log(data);
			data.forEach(function(tableRelationObj){
				console.log(tableRelationObj);
				if(! (tableRelationObj.base_table_name in allTableRelations)){
					allTableRelations[tableRelationObj.base_table_name] = {};
				}
				if(! (tableRelationObj.related_table_name in allTableRelations)){
					allTableRelations[tableRelationObj.related_table_name] = {};
				}
				allTableRelations[tableRelationObj.base_table_name] = {"FirstKey": tableRelationObj.base_primary_colum,"SecondKey":tableRelationObj.related_primary_colum};
				geoPackage.connection.all("select * from "+tableRelationObj.mapping_table_name, function (err, relations) {
					console.log(relations);
					for(let index in relations){
						if(allTableRelations[tableRelationObj.base_table_name][relations[index].base_id] == undefined){
							allTableRelations[tableRelationObj.base_table_name][relations[index].base_id] = {};
						}
						if(allTableRelations[tableRelationObj.related_table_name][relations[index].related_id] == undefined){
							allTableRelations[tableRelationObj.related_table_name][relations[index].related_id] = {};
						}
						if(allTableRelations[tableRelationObj.base_table_name][relations[index].base_id][tableRelationObj.related_table_name] == undefined){
							allTableRelations[tableRelationObj.base_table_name][relations[index].base_id][tableRelationObj.related_table_name] = {};
						}
						if(allTableRelations[tableRelationObj.related_table_name][relations[index].related_id][tableRelationObj.base_table_name] == undefined){
							allTableRelations[tableRelationObj.related_table_name][relations[index].related_id][tableRelationObj.base_table_name] = {};
						}
						allTableRelations[tableRelationObj.base_table_name][relations[index].base_id][tableRelationObj.related_table_name][relations[index].related_id] = {"type":tableRelationObj.relation_name};
						allTableRelations[tableRelationObj.related_table_name][relations[index].related_id][tableRelationObj.base_table_name][relations[index].base_id] = {"type":tableRelationObj.relation_name};
					}
				});
				//allTableNames[tableName.name] = {};
			})
		});
    }
  ], callback);
}

/*This function zooms to the bounding box of an object*/
window.zoomTo = function(minX, minY, maxX, maxY, projection) {
  try {
    var sw = proj4(projection, 'EPSG:4326', [minX, minY]);
    var ne = proj4(projection, 'EPSG:4326', [maxX, maxY]);
    map.fitBounds([[sw[1], sw[0]], [ne[1], ne[0]]]);
  } catch (e) {
    map.fitBounds([[minY, minX], [maxY, maxX]]);
  }
}

//Get Relation Content
/**
* This Function is basically a catch all for generating most MIME type content
* It also generates special content related to the x-SOFWERX-timeseries0001 protocol
*
*/
function getRelationContent(data,relTableName){
	let retListArray = [];
	console.log(data);
	pictures = [];
	let graphlabel=[];
	let graphTData=[];
	let graphData = {};
	//="highlightFeature({{id}}, '{{tableName}}')"
	//$('.your-class').slick({setting-name: setting-value});
	for(let index in data){
		//console.log(data[index]);
		if(data[index].content_type!=undefined && data[index].content_type.startsWith("image")){
			//Need to make a better data management structure, potential memory leak here if browser doesn't handle unused memory correctly
			let blobURI = URL.createObjectURL(new Blob( [ data[index].data ], { type: data[index].content_type } ));
			//console.log(blobURI);
			pictures.push(blobURI);
			$newListItem = $("<li>",{class:"list-group-item text-center"});
			$newImage = $("<img />",{src:blobURI, class:"img img-responsive",width:"100%","max-height":"300px"});
			$newListItem.append($newImage);
			retListArray.push($newListItem);
		}
		else if(data[index].content_type!=undefined && data[index].content_type.startsWith("audio")){
			//Need to make a better data management structure, potential memory leak here if browser doesn't handle unused memory correctly
			let blobURI = URL.createObjectURL(new Blob( [ data[index].data ], { type: data[index].content_type } ));
			//console.log(blobURI);
			$newListItem = $("<li>",{class:"list-group-item text-center"});
			$newAudio = $("<audio />",{controls:"true",width:"100%",height:"50px"});
			$newSource = $("<source />",{src:blobURI, type: data[index].content_type});
			$newListItem.append($("<h4/>",{text: data[index].content_type.substring( data[index].content_type.indexOf('/') + 1 )}));
			$newAudio.append($newSource);
			$newListItem.append($newAudio);
			retListArray.push($newListItem);
		}
		else if(data[index].content_type!=undefined && data[index].content_type.startsWith("text")){
			if (data[index].content_type.endsWith("html")){
				$newListItem = $("<li>",{class:"list-group-item text-center",html:new TextDecoder("utf-8").decode(data[index].data)});
			}else{
				$newListItem = $("<li>",{class:"list-group-item text-center",text:new TextDecoder("utf-8").decode(data[index].data)});
			}
			
			retListArray.push($newListItem);
		}
		else if(data[index].content_type!=undefined && data[index].content_type.startsWith("video")){
			//Need to make a better data management structure, potential memory leak here if browser doesn't handle unused memory correctly
			let blobURI = URL.createObjectURL(new Blob( [ data[index].data ], { type: data[index].content_type } ));
			//console.log(blobURI);
			$newListItem = $("<li>",{class:"list-group-item text-center"});
			$newVideo = $("<video />",{controls:"true",width:"100%",height:"300px"});
			$newSource = $("<source />",{src:blobURI, type: data[index].content_type});
			$newVideo.append($newSource);
			$newListItem.append($newVideo);
			retListArray.push($newListItem);
		}
		else if(data[index].content_type!=undefined && data[index].content_type.startsWith("application")){
			let blobURI = URL.createObjectURL(new Blob( [ data[index].data ], { type: data[index].content_type } ));
			$newListItem = $("<li>",{class:"list-group-item text-center"});
			$newListItem.append($("<h2/>",{class:"btn btn-info large", html:"<i class='fa fa-download'></i> PDF File", onclick:"var link = document.createElement('a');link.href = '"+blobURI+"';link.download='file.pdf';link.click();"}));
			retListArray.push($newListItem);
		}
		else if(data[index].type!=undefined && data[index].type == "x-SOFWERX-timeseries0001"){
			
			playCount = data[index].playtimes || 0;
			graphlabel.push(new Date(data[index]["timestamp"]).toString().split(" ")[4]);
			graphTData.push(playCount);
			if(index == data.length-1){
				graphData["Title"] = "Times Played With"
				graphData["Type"] = "Line";
				graphData["Label"] = graphlabel;
				graphData["Data"] = graphTData;
				retListArray.push(generateChart(graphData));
				
			}
		}
		else{ //F2F assumed default, going to be a problem if there's no differentiator for customs
			//console.log("Hello");
			$newListItem = $("<li>",{class:"list-group-item text-center",text:"Feature #" + index,onmouseover:"highlightFeature("+data[index]["id"]+",'"+relTableName+"')"});
			retListArray.push($newListItem);
		}
	}
	console.log(retListArray);
	return retListArray;
}

//This gets and generates a list of data from the gpkg;
//Will need to seperate the logic and functionality soon;
function popupRelationsModal(tableName,id){
	$relContainer = $("<div/>",{class:"overflowVert"});
	$("#showRelationsModal").find(".modal-body").empty();
	console.log(allTableRelations[tableName][id]);
	let relationArray = Object.keys(allTableRelations[tableName][id]);
	for(let key in relationArray){
		let $newRelationContainer = $("<div>",{class:"newRelation",id:"relation-"+tableName});
		let $newRelationHeader = $("<h4>",{class:"relationHeader",text:"\""+relationArray[key]+"\""});
		let $newRelationList = $("<ul>",{class:"list-group"});
		let relationIDString = Object.keys(allTableRelations[tableName][id][relationArray[key]]).join();
		geoPackage.connection.all("select * from "+relationArray[key]+" where id in ("+relationIDString+")", function (err, data) {
			$newRelationList.append(getRelationContent(data,relationArray[key]));
		});
		let $newRelationHR = $("<hr />");
		$newRelationContainer.append($newRelationContainer,$newRelationHeader,$newRelationList,$newRelationHR);
		$relContainer.append($newRelationContainer);
	}
	$("#showRelationsModal").find(".modal-body").append($relContainer);
	jQuery("#showRelationsModal").modal("show");
}

function generatePopupContent(feature,table){
	$container = $("<div/>",{});
	$button = $("<button />",{class:"btn btn-default",text:"View Related Data",onclick:"popupRelationsModal('"+table+"',"+feature["id"]+")"});
	$container.append($button);
	return $container.html();
}

//Toggle Layer
/* This function is toggling the views of the Layer
We may change the logic of this stop the deletion of objects that are unused, but this will lead to memory issues if not managed carefully */
window.toggleLayer = function(layerType, table) {
  if (tableLayers[table]) {
    map.removeLayer(tableLayers[table]);
    delete tableLayers[table];
    $("#"+layerType+"-"+table).removeClass("toggled");
    return;
  }
  $("#"+layerType+"-"+table).addClass("toggled");

  if (layerType === 'tile') {
    ga('send', {
      hitType: 'event',
      eventCategory: 'Layer',
      eventAction: 'load',
      eventLabel: 'Tile Layer'
    });
    geoPackage.getTileDaoWithTableName(table, function(err, tileDao) {

      var maxZoom = tileDao.maxZoom;
      var minZoom = tileDao.minZoom;
      var tableLayer = new L.GridLayer({noWrap: true, minZoom: minZoom, maxZoom: maxZoom});
      tableLayer.createTile = function(tilePoint, done) {
        var canvas = L.DomUtil.create('canvas', 'leaflet-tile');
        var size = this.getTileSize();
        canvas.width = size.x;
        canvas.height = size.y;
        setTimeout(function() {
          //console.time('Draw tile ' + tilePoint.x + ', ' + tilePoint.y + ' zoom: ' + tilePoint.z);
          GeoPackageAPI.drawXYZTileInCanvas(geoPackage, table, tilePoint.x, tilePoint.y, tilePoint.z, size.x, size.y, canvas, function(err) {
            //console.timeEnd('Draw tile ' + tilePoint.x + ', ' + tilePoint.y + ' zoom: ' + tilePoint.z);
            done(err, canvas);
          });
        }, 0);
        return canvas;
      }
      map.addLayer(tableLayer);
      tableLayer.bringToFront();
      tableLayers[table] = tableLayer;
    });
  } else if (layerType === 'feature') {
    ga('send', {
      hitType: 'event',
      eventCategory: 'Layer',
      eventAction: 'load',
      eventLabel: 'Feature Layer'
    });
    var geojsonLayer = L.geoJson([], {
        style: featureStyle,
        pointToLayer: pointToLayer,
        onEachFeature: function (feature, layer) {
          var string = "";
		  let content = undefined;
		  //console.log(feature);
          for (var key in feature.properties) {
            //string += '<div class="item"><span class="label">' + key + ': </span><span class="value">' + feature.properties[key] + '</span></div>';
			content = generatePopupContent(feature,table);
          }
          layer.bindPopup(content);
        },
        coordsToLatLng: function(coords) {
          // if (coords[0] < 0) {
          //   coords[0] = coords[0] + 360;
          // }
          return L.GeoJSON.coordsToLatLng(coords);
        }
    });
    var tableInfo = tableInfos[table];

    GeoPackageAPI.iterateGeoJSONFeaturesFromTable(geoPackage, table, function(err, geoJson, done) {
      geojsonLayer.addData(geoJson);
      async.setImmediate(function(){
        done();
      });
    }, function(err) {
		//console.log(geojsonLayer);
      geojsonLayer.addTo(map);
      geojsonLayer.bringToFront();
      tableLayers[table] = geojsonLayer;
    });
  }
}

//Marker Generation for Features
/* The next three functions are defining how to generate the looks for points */
function pointToLayer(feature, latlng) {
  // just key off of marker-symbol, otherwise create a circle marker
  if (feature.properties.hasOwnProperty('marker-symbol')) {
    return L.marker(latlng, {
      icon: L.icon.mapkey(pointStyle(feature))
    });
  }
  return L.circleMarker(latlng, pointStyle(feature));
}

function pointStyle(feature) {
  var radius = 6;
  var size = 26;
  if (feature.properties['marker-size']) {
    switch(feature.properties['marker-size']) {
      case 'small':
        radius = 6;
        size = 26;
        break;
      case 'medium':
        radius = 8;
        size = 32;
        break;
      case 'large':
        radius = 12;
        size = 38;
        break;
    }
  }
  return {
    icon: feature.properties['marker-symbol'] && feature.properties['marker-symbol'] !== "" ? feature.properties['marker-symbol'] : feature.properties['type'],
    background: feature.properties['marker-color'] || "#00F",
    weight: feature.properties['stroke-width'] ? Number(feature.properties['stroke-width']) : 2,
    opacity: feature.properties['stroke-opacity'] ? Number(feature.properties['stroke-opacity']) : 1,
    size: size,
    radius: radius
  };
}

function featureStyle(feature) {
  return {
    weight: feature.properties['stroke-width'] ? Number(feature.properties['stroke-width']) : 2,
    opacity: feature.properties['stroke-opacity'] ? Number(feature.properties['stroke-opacity']) : 1,
    fillColor: feature.properties['fill'] || "#00F",
    fillOpacity: feature.properties['fill-opacity'] ? Number(feature.properties['fill-opacity']) : .2,
    color: feature.properties['stroke'] || '#00F'
  };
}

//Load from URL
/* This function is defining the loading process from the url
We may add a listener to update the user on the loading process */
window.loadUrl = function(url, loadingElement, gpName) {
  ga('send', {
    hitType: 'event',
    eventCategory: 'URL',
    eventAction: 'load'
  });
  fileName = url.split('/').pop();
  //loadingElement.toggle();
  var xhr = new XMLHttpRequest();
  console.log(xhr);
  xhr.open('GET', url, true);
  xhr.responseType = 'arraybuffer';

  $('#choose-label').find('span').text(gpName);
  $('#choose-label').find('i').toggle();
  xhr.onload = function(e) {
    var uInt8Array = new Uint8Array(this.response);
    loadByteArray(uInt8Array, function() {
      $('#download').removeClass('gone');
      $('#choose-label').find('i').toggle();
      //loadingElement.toggle();
    });
  };
	xhr.onprogress = function(event){
		var percent = 0;
		var position = event.loaded || event.position;
		var total = event.total;
		if (event.lengthComputable) {
			percent = Math.ceil(position / total * 100);
		}
		$('#parsingTaskProgress').css('width', percent+'%').attr('aria-valuenow', percent);
		//console.log(percent);
		if(percent != 100){
			$('#parsingTaskCont').css("display","block");
		}else{
			$('#parsingTaskCont').css("display","none");
		}
	};
  xhr.send();
}

//Load Tiles based on Zoom
/* This will start parsing the data for any visible tiles on the same zoom level */
window.loadZooms = function(tableName, tilesElement) {
  var zoomsTemplate = $('#tile-zoom-levels-template').html();
  Mustache.parse(zoomsTemplate);

  geoPackage.getTileDaoWithTableName(tableName, function(err, tileDao) {
    var zooms = [];
    for (var i = tileDao.minZoom; i <= tileDao.maxZoom; i++) {
      zooms.push({zoom: i, tableName: tableName});
    }
    var zoomLevels = {
      zooms: zooms
    };
    var rendered = Mustache.render(zoomsTemplate, zoomLevels);
    tilesElement.empty();
    tilesElement.append(rendered);
  });
}

var visibleTileTables = {};

window.zoomMap = function(zoom) {
  map.setZoom(zoom);
}

window.registerTileTable = function(tableName, tilesElement) {
  visibleTileTables[tableName] = tilesElement;
  loadTiles(tableName, map.getZoom(), tilesElement);
}

window.unregisterTileTable = function(tableName) {
  delete visibleTileTables[tableName];
}

map.on('moveend', function() {
  for (var table in visibleTileTables) {
    window.loadTiles(table, map.getZoom(), visibleTileTables[table]);
  }
});

//Load Tiles
/*This is Loading the Tiles from visibleTileTables*/
window.loadTiles = function(tableName, zoom, tilesElement) {
  //map.setZoom(zoom);
  var mapBounds = map.getBounds();
  if (imageOverlay) map.removeLayer(imageOverlay);
  currentTile = {};

  var tilesTableTemplate = $('#all-tiles-template').html();
  Mustache.parse(tilesTableTemplate);

  GeoPackageAPI.getTilesInBoundingBox(geoPackage, tableName, zoom, Math.max(-180, mapBounds.getWest()), Math.min(mapBounds.getEast(), 180), mapBounds.getSouth(), mapBounds.getNorth(), function(err, tiles) {
    if (!tiles || !tiles.tiles || !tiles.tiles.length) {
      tilesElement.empty();
      tilesElement.html('<div class="section-title">No tiles exist in the GeoPackage for the current bounds and zoom level</div>')
      return;
    }
    var rendered = Mustache.render(tilesTableTemplate, tiles);
    tilesElement.empty();
    tilesElement.append(rendered);
  });
}

//Zoom Tile
/*This function will get the bounding box of a tile and pan to it on the map*/
window.zoomToTile = function(tileColumn, tileRow, zoom, minLongitude, minLatitude, maxLongitude, maxLatitude, projection, tableName) {
  if (imageOverlay) map.removeLayer(imageOverlay);
  if (tileColumn === currentTile.tileColumn
  && tileRow === currentTile.tileRow
  && zoom === currentTile.zoom
  && tableName === currentTile.tableName) {
    currentTile = {};
    return;
  }
  var sw = proj4(projection, 'EPSG:4326', [minLongitude, minLatitude]);
  var ne = proj4(projection, 'EPSG:4326', [maxLongitude, maxLatitude]);

  GeoPackageAPI.getTileFromTable(geoPackage, tableName, zoom, tileRow, tileColumn, function(err, tile) {
    var tileData = tile.getTileData();
    var type = fileType(tileData);
    var binary = '';
    var bytes = tileData;
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
      binary += String.fromCharCode( bytes[ i ] );
    }
    var base64Data = btoa( binary );
    var url = 'data:'+type.mime+';base64,' + base64Data;
    imageOverlay = L.imageOverlay(url, [[sw[1], sw[0]], [ne[1], ne[0]]]);
    currentTile.tileColumn = tileColumn;
    currentTile.tileRow = tileRow;
    currentTile.zoom = zoom;
    currentTile.tableName = tableName;
    imageOverlay.addTo(map);
  });
}

//Highlight Tile
/*This function will get the bounding box of a tile and display it on the map*/
window.highlightTile = function(minLongitude, minLatitude, maxLongitude, maxLatitude, projection) {

  var sw = proj4(projection, 'EPSG:4326', [minLongitude, minLatitude]);
  var ne = proj4(projection, 'EPSG:4326', [maxLongitude, maxLatitude]);
  var poly =  {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [[sw[0], sw[1]],
        [sw[0], ne[1]],
        [ne[0], ne[1]],
        [ne[0], sw[1]],
        [sw[0], sw[1]]]
      ]
    }
  };

  highlightLayer.clearLayers();
  highlightLayer.addData(poly);
  highlightLayer.bringToFront();
}


window.loadFeatures = function(tableName, featuresElement) {
  var featuresTableTemplate = $('#all-features-template').html();
  Mustache.parse(featuresTableTemplate);

  var features = {
    columns: tableInfos[tableName].columns,
    srs: tableInfos[tableName].srs,
    features: []
  };
  GeoPackageAPI.iterateGeoJSONFeaturesFromTable(geoPackage, tableName, function(err, feature, featureDone) {
    feature.tableName = tableName;
    feature.values = [];
    for (var i = 0; i < features.columns.length; i++) {
      var value = feature.properties[features.columns[i].name];
      if (value === null || value === 'null') {
        feature.values.push('');
      } else {
        feature.values.push(value.toString());
      }
    }
    features.features.push(feature);
    async.setImmediate(function(){
      featureDone();
    });
  }, function() {
    var rendered = Mustache.render(featuresTableTemplate, features);
    featuresElement.empty();
    featuresElement.append(rendered);
	var currentPage = 0;
	var numPerPage = 10;
	var $table = $(featuresElement);
	$(featuresElement).bind('repaginate', function() {
		$(featuresElement).find('tbody tr').hide().slice(currentPage * numPerPage, (currentPage + 1) * numPerPage).show();
	});
	$(featuresElement).trigger('repaginate');
	var numRows = $(featuresElement).find('tbody tr').length;
	var numPages = Math.ceil(numRows / numPerPage);
	var $pager = $('<div class="pager"></div>');
	for (var page = 0; page < numPages; page++) {
		$('<span class="page-number"></span>').text(page + 1).bind('click', {
			newPage: page
		}, function(event) {
			currentPage = event.data['newPage'];
			$(featuresElement).trigger('repaginate');
			$(this).addClass('active').siblings().removeClass('active');
		}).appendTo($pager).addClass('clickable');
	}
	$pager.insertBefore($(featuresElement).find("table").first()).find('span.page-number:first').addClass('active');
  });
}

var highlightLayer = L.geoJson([], {
    style: function (feature) {
        return {
          color: "#F00",
          weight: 3,
          opacity: 1
        };
    },
    onEachFeature: function (feature, layer) {
      var string = "";
      for (var key in feature.properties) {
        string += '<div class="item"><span class="label">' + key + ': </span><span class="value">' + feature.properties[key] + '</span></div>';
      }
      layer.bindPopup(string);
    },
    coordsToLatLng: function(coords) {
      // if (coords[0] < 0) {
      //   coords[0] = coords[0] + 360;
      // }
      return L.GeoJSON.coordsToLatLng(coords);
    }
});
map.addLayer(highlightLayer);

window.highlightFeature = function(featureId, tableName) {
  GeoPackageAPI.getFeature(geoPackage, tableName, featureId, function(err, geoJson) {
    highlightLayer.clearLayers();
    highlightLayer.addData(geoJson);
    highlightLayer.bringToFront();
  });
}

window.zoomToFeature = function(featureId, tableName) {
  window.toggleFeature(featureId, tableName, true, true);
}

var currentFeature;
var featureLayer = L.geoJson([], {
    style: function (feature) {
        return {
          color: "#8000FF",
          weight: 3,
          opacity: 1
        };
    },
    onEachFeature: function (feature, layer) {
      var string = "";
      for (var key in feature.properties) {
        string += '<div class="item"><span class="label">' + key + ': </span><span class="value">' + feature.properties[key] + '</span></div>';
      }
      layer.bindPopup(string);
    },
    coordsToLatLng: function(coords) {
      // if (coords[0] < 0) {
      //   coords[0] = coords[0] + 360;
      // }
      return L.GeoJSON.coordsToLatLng(coords);
    }
});
map.addLayer(featureLayer);

window.toggleFeature = function(featureId, tableName, zoom, force) {
  featureLayer.clearLayers();

  if (currentFeature === featureId && !force) {
    currentFeature = undefined;
    return;
  }

  currentFeature = featureId;

  GeoPackageAPI.getFeature(geoPackage, tableName, featureId, function(err, geoJson) {
    featureLayer.addData(geoJson);
    featureLayer.bringToFront();
    if (zoom) {
      map.fitBounds(featureLayer.getBounds());
    }
  });
}

window.clearHighlights = function() {
  highlightLayer.clearLayers();
}
console.log(GeoPackageAPI);