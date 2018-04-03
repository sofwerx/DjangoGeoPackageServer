//This code is for setting up the request for CSRF protection
$.ajaxSetup({ 
     beforeSend: function(xhr, settings) {
         function getCookie(name) {
             var cookieValue = null;
             if (document.cookie && document.cookie != '') {
                 var cookies = document.cookie.split(';');
                 for (var i = 0; i < cookies.length; i++) {
                     var cookie = jQuery.trim(cookies[i]);
                     // Does this cookie string begin with the name we want?
                     if (cookie.substring(0, name.length + 1) == (name + '=')) {
                         cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                         break;
                     }
                 }
             }
             return cookieValue;
         }
         if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
             // Only send the token to relative URLs i.e. locally.
             xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
         }
     } 
});

//Helper function to convert a string into a blob
function stringToBytes(str)
{
    let reader = new FileReader();
    let done = () => {};

    reader.onload = event =>
    {
        done(new Uint8Array(event.target.result), str);
    };
    reader.readAsArrayBuffer(new Blob([str], { type: "application/octet-stream" }));

    return { done: callback => { done = callback; } };
}

//This requests a file from the server by sending an ID and getting an base relative url from the server.
//The function finds the current location, so this can be accessed on any domain.
function loadSavedPackage(id){
	console.log("You loaded geopackage #" + id);
	
	$("#EditingTab")[0].click();
	$.ajax({
		  type: "Get",
		  url: "/retrieve/?id=" + id,
		  success: function(json){
			  console.log("Successful Load");
			  console.log(json);
			  var fullLink = location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: '') + json.url;
			  //console.log(full);
			  loadUrl(fullLink);
		  },
		});
}

var editableLayers = new L.FeatureGroup();
map.addLayer(editableLayers);

//This is a class containing the Leaflet Editor Controls
//Feature Control Options correspond to the Leaflet.Draw class
//Tile Control Options correspond to the Leaflet.MapPaint class
class GPKGLeafletEditor {
  constructor(FeatureControlOptions, TileControlOptions, map = map) {
    this.FeatureControl = new L.Control.Draw(FeatureControlOptions);
    //this.TileControl = new L.Control.Draw(FeatureControlOptions);
	this.map = map;
	var tObj = this;
	this.map.on(L.Draw.Event.CREATED, function (e) {
		var type = e.layerType,
			layer = e.layer;
		console.log(type);
		if (type === 'marker') {
			layer.bindPopup('A popup!');
			GeoPackageAPI.addGeoJSONFeatureToGeoPackage(geoPackage, new L.geoJSON(e.layer.toGeoJSON()), tObj, function(){console.log("Hello");});
		}
		if (type === 'circlemarker') {
			layer.bindPopup('A popup!');
		}

		//editableLayers.addLayer(layer);
	});
	this.tableName = "";

  }
  startFeatureEdit(tableName = "") {
	if(this.map != null){
		this.map.addControl(this.FeatureControl);
		//this.map.removeControl(this.TileControl);
		this.tableName = tableName;
	}
  }
  startTileEdit() {
	//Coming soon
    //return this.height * this.width;
  }
}


var MyCustomMarker = L.Icon.extend({
	options: {
		shadowUrl: null,
		iconAnchor: new L.Point(12, 24),
		popupAnchor: new L.Point(0, -24),
		iconSize: new L.Point(24, 24),
		iconUrl: 'https://png.icons8.com/metro/1600/marker.png'
	}
});

var FeatureOptions = {
	position: 'topright',
	draw: {
		polyline: {
			shapeOptions: {
				color: '#f357a1',
				weight: 10
			}
		},
		polygon: {
			allowIntersection: false, // Restricts shapes to simple polygons
			drawError: {
				color: '#e1e100', // Color the shape will turn when intersects
				message: '<strong>Oh snap!<strong> you can\'t draw that!' // Message that will show when intersect
			},
			shapeOptions: {
				color: '#bada55'
			}
		},
		circle: false, // Turns off this drawing tool
		circlemarker: false, 
		rectangle: false,
		marker: {}
	}
};

/*var drawControl = new L.Control.Draw(options);
map.addControl(drawControl);*/
gpkgDrawControl = new GPKGLeafletEditor(FeatureOptions,null,map);

function EditFeatureTable(table, btnObj){
	if(!tableLayers[table]){
		toggleLayer('feature', table);
		$("#myonoffswitch-" + table)[0].checked = true;
	}
	
	gpkgDrawControl.startFeatureEdit(table);
	$(".editLayerButton").removeClass("active");
	$(btnObj).addClass("active");
}

//THis shows the modal of the info
function showInfoModal(elementToCopy){
	$clone = elementToCopy.clone( true );
	$("#showInfoModal").find(".modal-body").empty();
	console.log($clone);
	$("#showInfoModal").find(".modal-body").append($clone.removeAttr('style'));
	jQuery("#showInfoModal").modal("show");
}
