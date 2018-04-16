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
			//GeoPackageAPI.addGeoJSONFeatureToGeoPackage(geoPackage, new L.geoJSON(e.layer.toGeoJSON()), tObj, function(){console.log("Hello");});
			tObj.addFeature();
		}
		if (type === 'circlemarker') {
			layer.bindPopup('A popup!');
		}

		//editableLayers.addLayer(layer);
	});
	this.tableName = "";
	this.tableType = "";

  }
  removeControls(){
	if(this.FeatureControl){
		this.map.removeControl(this.FeatureControl);
	}
	if(this.TileControl){
		this.map.removeControl(this.TileControl);
	}
  }
  startFeatureEdit(tableName = "") {
	if(this.map != null){
		this.removeControls();
		this.map.addControl(this.FeatureControl);
		this.tableName = tableName;
		this.tableType = "Feature";
	}
  }
  startTileEdit(tableName = "") {
	//Coming soon
    //return this.height * this.width; What?
	if(this.map != null){
		this.removeControls();
		//this.map.addControl(this.TileControl);
		this.tableName = tableName;
		this.tableType = "Tile";
	}
  }
  addFeature(){
     geoPackage.getFeatureDaoWithTableName(this.tableName, function(err, featureDao) {
        var featureRow = featureDao.newRow();
        //var geometryData = new GeometryData();
        geometryData.setSrsId(4326);
        var point = new wkx.Point(1, 2);
        geometryData.setGeometry(point);
        featureRow.setGeometry(geometryData);

        featureDao.create(featureRow, function(err, result) {
          console.log("Created");
        });
      });
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
	}
	
	gpkgDrawControl.startFeatureEdit(table);
	$(".editLayerButton").removeClass("active");
	$(btnObj).addClass("active");
}

function EditTileTable(table, btnObj){
	if(!tableLayers[table]){
		toggleLayer('tile', table);
	}
	
	gpkgDrawControl.startTileEdit(table);
	$(".editLayerButton").removeClass("active");
	$(btnObj).addClass("active");
}

//THis shows the modal of the info
function showInfoModal(elementToCopy){
	$clone = elementToCopy.clone( true );
	$("#showInfoModal").find(".modal-body").empty();
	$("#showInfoModal").find(".modal-body").append($clone.removeAttr('style'));
	jQuery("#showInfoModal").modal("show");
}

//This Creates a new Bar chart with the supplied data
function newBarChart(ctx,data){
	var myChart = new Chart(ctx, {
		type: 'bar',
		data: {
			labels: (data["Label"]?data["Label"]:["Red", "Blue", "Yellow", "Green", "Purple", "Orange"]),
			datasets: [{
				label: (data["Title"]?data["Title"]:'# of Votes'),
				data: (data["Data"]?data["Data"]:[12, 19, 3, 5, 2, 3]),
				backgroundColor: 'rgba(92, 132, 255, 0.2)',
				borderColor: 'rgba(92,132,255,1)',
				borderWidth: 1
			}]
		},
		options: {
			scales: {
				yAxes: [{
					ticks: {
						beginAtZero:true
					}
				}]
			}
		}
	});
}

//This Creates a new Line chart with the supplied data
function newLineChart(ctx,data){
	var myLineChart = new Chart(ctx, {
		type: 'line',
		data: {
			labels: (data["Label"]?data["Label"]:["January", "February", "March", "April", "May", "June", "July"]),
			datasets: [
				{
					label: (data["Title"]?data["Title"]:"Sample Data"),
					fillColor: "rgba(220,220,220,0.2)",
					strokeColor: "rgba(220,220,220,1)",
					pointColor: "rgba(220,220,220,1)",
					pointStrokeColor: "#fff",
					pointHighlightFill: "#fff",
					pointHighlightStroke: "rgba(220,220,220,1)",
					data: (data["Data"]?data["Data"]:[65, 59, 80, 81, 56, 55, 40])
				}
			]
		},
		options: {
			responsive: true
		}    
	});
}

/*
* This will make the container for a chart with the data. 
* The data will be in the format : {Title: string, Label:string[], data: int[], and Type: "Bar" || "Line" }
*/
function generateChart(data){
	$newGridCont = $("<div>",{class:"mt-1 col-md-12"});
	$newCard = $("<div>",{class:"card card-body"});
	$newCardTitle = $("<div>",{class:"card-title"});
	$newCardTitleText = $("<span>").text(data["Title"]);
	$newCardFilterButton = $("<button>",{class:"btn btn-sm btn-primary dropdown-toggle float-right","data-toggle":"dropdown","aria-haspopup":"true","aria-expandanded":"false"}).text("Filter");
	$dropDownMenu = $("<div>",{class:"dropdown-menu"});
	$dailyLink = $("<div>",{class:"dropdown-item",href:"#"}).text("Daily");
	$monthlyLink = $("<div>",{class:"dropdown-item",href:"#"}).text("Monthly");
	$yearlyLink = $("<div>",{class:"dropdown-item",href:"#"}).text("Yearly");
	$canvas = $("<canvas>");
	$dropDownMenu.append($dailyLink);
	$dropDownMenu.append($monthlyLink);
	$dropDownMenu.append($yearlyLink);
	$newCardTitle.append($newCardTitleText);
	$newCardTitle.append($newCardFilterButton);
	$newCardTitle.append($dropDownMenu);
	$newCard.append($newCardTitle);
	$newCard.append($canvas);
	$newGridCont.append($newCard);
	//$chartsCont.append($newGridCont);
	var ctx = $canvas[0].getContext('2d')
	console.log(data);
	if(data["Type"] == "Bar"){
		newBarChart(ctx,data);
	}
	if(data["Type"] == "Line"){
		newLineChart(ctx,data);
	}
	return $newGridCont;
}