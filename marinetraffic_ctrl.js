//Marker Settings in Leaflet
//(START IGNORING ME)
(function() {
    var proto_initIcon = L.Marker.prototype._initIcon;
    var proto_setPos = L.Marker.prototype._setPos;

    var oldIE = (L.DomUtil.TRANSFORM === 'msTransform');

    L.Marker.addInitHook(function () {
        var iconOptions = this.options.icon && this.options.icon.options;
        var iconAnchor = iconOptions && this.options.icon.options.iconAnchor;
        if (iconAnchor) {
            iconAnchor = (iconAnchor[0] + 'px ' + iconAnchor[1] + 'px');
        }
        this.options.rotationOrigin = this.options.rotationOrigin || iconAnchor || 'center bottom' ;
        this.options.rotationAngle = this.options.rotationAngle || 0;

        // Ensure marker keeps rotated during dragging
        this.on('drag', function(e) { e.target._applyRotation(); });
    });

    L.Marker.include({
        _initIcon: function() {
            proto_initIcon.call(this);
            var TRANSFORM_ORIGIN=L.DomUtil.testProp(
             ['transformOrigin', 'WebkitTransformOrigin', 'OTransformOrigin', 'MozTransformOrigin', 'msTransformOrigin']);
             this._icon.style[TRANSFORM_ORIGIN] = '50% 50%';
        },

        _setPos: function (pos) {
            proto_setPos.call(this, pos);
            this._applyRotation();
        },

        _applyRotation: function () {
            if(this.options.rotationAngle) {
                this._icon.style[L.DomUtil.TRANSFORM+'Origin'] = this.options.rotationOrigin;
                this._icon.style[L.DomUtil.TRANSFORM] += 'rotateZ(' + this.options.rotationAngle + 'deg)';
                // if(oldIE) {
                //     // for IE 9, use the 2D rotation
                //
                // } else {
                //     // for modern browsers, prefer the 3D accelerated version
                //     this._icon.style[L.DomUtil.TRANSFORM] += ' rotateZ(' + this.options.rotationAngle + 'deg)';
                // }
            }
        },

        setRotationAngle: function(angle) {
            this.options.rotationAngle = angle;
            this.update();
            return this;
        },

        setRotationOrigin: function(origin) {
            this.options.rotationOrigin = origin;
            this.update();
            return this;
        }
    });
})();
//(STOP IGNORING ME)

//Function to calculate average
function getAvg(array) {
  return array.reduce(function (p, c) {
    return p + c;
  }) / array.length;
}

//Get ship positions with GET method
$.ajax({
  type: 'GET',
  url: 'http://services.marinetraffic.com/api/exportvessels/v:8/1631e874f4fadef926a05a7d734334630ab6d6e8/timespan:500/protocol:csv',
  dataType: 'text',
}).done(successFunction);

//When GET sucessfully, execute this function
function successFunction(data) {

  var allRows = data.split(/\r?\n|\r/);
  var MMSIOfShip = [];
  var lat = [];
  var lon = [];
  var speed = [];
  var course = [];
  var timestamp = [];
  for (var singleRow = 0; singleRow < allRows.length - 1; singleRow++) {
    var rowCells = allRows[singleRow+1].split(',');
    MMSIOfShip[singleRow] = rowCells[0];
    lat[singleRow] = parseFloat(rowCells[3]);
    lon[singleRow] = parseFloat(rowCells[4]);
    speed[singleRow] = parseInt(rowCells[5])/10;
    course[singleRow] = parseInt(rowCells[7]);
    timestamp[singleRow] = rowCells[9];
  }
  var avglat = getAvg(lat);
  var avglon = getAvg(lon);

  var div_select = document.getElementById("selector_menu");
  var selectElement = document.createElement("select");
  selectElement.id = 'selector';
  selectElement.onchange =  function getSelect() {
        var selectorObj = document.getElementById("selector");
        var selectedText = selectorObj.options[selectorObj.selectedIndex].text;
        for (var i = 0; i < MMSIOfShip.length; i++){
          if (MMSIOfShip[i] == selectedText) {
            var j = i;
            mymap.setView([lat[j],lon[j]], 7);
            markers[j].openPopup();
          }  else if (selectedText == 'Select Ship MMSI Here') {
            mymap.setView([avglat, avglon], 4);
            mymap.closePopup();
          }
        }

    };

  var initial = document.createElement("option");
  initial.value = '';
  initial.textContent = 'Select Ship MMSI Here';
  selectElement.appendChild(initial);

  for (var k = 0; k < MMSIOfShip.length; k++) {
      var opt = MMSIOfShip[k];
      var option_element = document.createElement("option");
      option_element.textContent = opt;
      option_element.value = opt;
      selectElement.appendChild(option_element);
    }
  div_select.appendChild(selectElement);

  var mymap = L.map('mapid').setView([avglat, avglon], 4);

  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
      maxZoom: 18,
      id: 'mapbox.streets',
      accessToken: 'pk.eyJ1Ijoid2VuYmlubGl1IiwiYSI6ImNqNWNxYjB4czBjeXkzMnA4NTZ0ajB1cXEifQ.veZKTS1UQby3tu6G6tsVNQ'
  }).addTo(mymap);

  var pinAnchor = new L.Point(10, 20);
  var arrowIcon_moving = L.icon({
      iconUrl: 'https://image.flaticon.com/icons/svg/275/275000.svg',
      //'https://image.flaticon.com/icons/svg/275/275143.svg',
      //'https://image.flaticon.com/icons/png/512/274/274975.png',
      //'http://www.iconsdb.com/icons/preview/orange/arrow-up-8-xxl.png'
      iconSize:  [15,20],
      //iconAnchor:  pinAnchor
  });
  var arrowIcon_stop = L.icon({
      iconUrl: 'https://s-media-cache-ak0.pinimg.com/originals/cb/9a/d5/cb9ad5dadd3a5b406956b5c37288d64d.png',
      iconSize:  [15,15]
  });

  var mark_group = new L.LayerGroup();
  var markers = [];

  for (var i=0; i < MMSIOfShip.length; i++){
    if (speed[i] == 0) {
      markers[i] = L.marker([lat[i], lon[i]],
                              {icon: arrowIcon_stop})
                      .bindPopup("<b>MMSI: </b>"+MMSIOfShip[i]+"<br>"+"<b>Latitude: </b>"+lat[i]+"<br>"+"<b>Longitude: </b>"+lon[i]+"<br>"+"<b>Speed: </b>"+speed[i]+" knots<br>"+"<b>UTC Time: </b>"+timestamp[i]);
                      //.addTo(mymap);
      mark_group.addLayer(markers[i]);
    } else {
      markers[i] = L.marker([lat[i], lon[i]],
                              {icon: arrowIcon_moving,
                               rotationAngle:course[i],
                               rotationOrigin: [lat[i], lon[i]]})
                      .bindPopup("<b>MMSI: </b>"+MMSIOfShip[i]+"<br>"+"<b>Latitude: </b>"+lat[i]+"<br>"+"<b>Longitude: </b>"+lon[i]+"<br>"+"<b>Speed: </b>"+speed[i]+" knots<br>"+"<b>UTC Time: </b>"+timestamp[i]);
                      //.addTo(mymap);
      mark_group.addLayer(markers[i]);
    }
  }
  mark_group.addTo(mymap);

}
