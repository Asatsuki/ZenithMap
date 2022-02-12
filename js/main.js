var yx = L.latLng;

var xy = function(x, y) {
    if (L.Util.isArray(x)) {    // When doing xy([x, y]);
        return yx(x[1], x[0]);
    }
    return yx(y, x);  // When doing xy(x, y);
};

function init() {

    // indexedDB
    var db = new Dexie('ZenithMapClientDB');
    //v1
    db.version(1).stores({
        waypoints: '&uuid,lng,lat,name,icon'
    })

    loadWaypoints(); // load waypoints

    var factorX = 256 / 16384;
    var factorY = 256 / 16384;
    var constantX = 0;
    var constantY = 0;
    CRS_Substatica_v_1_2 = L.extend({}, L.CRS.Simple, {
        transformation: new L.Transformation(factorX, constantX, factorY, constantY),
    });

    var bounds = [[0,0], [8784,14764]];
    var map = L.map('map', {
        fullscreenControl: true,
        crs: CRS_Substatica_v_1_2,
        minZoom: 0,
        maxZoom: 8,
        zoomSnap: 1,
        zoomDelta: 1,
        wheelPxPerZoomLevel: 60,

        contextmenu: true,
        contextmenuWidth: 140,
        contextmenuItems: [{
            text: 'Add a waypoint here',
            callback: createWaypoint
        }]
    });
    
    L.tileLayer.fallback('./tile/{z}/{x}/{y}.png', {
        attribution: '<a href="https://twitter.com/ZenithMMO/status/1489691004357812226" target="_blank">Original Map</a>',
        noWrap: true
    }).addTo(map);
    
    //var image = L.imageOverlay('./overlay/ZenithMap.jpg', bounds).addTo(map);

    var options = {
        position: 'bottomleft',
        decimals: 2,
        labelTemplateLng: 'X: {x}',
        labelTemplateLat: 'Y: {y}',
        useLatLngOrder: false
    }
    map.fitBounds(bounds, {
        animate: false
    });
    L.control.coordinates(options).addTo(map);

    

    var features = [
        {
            "type": "Feature",
            "geometry": {
               "type": "Point",
               "coordinates":  [ 503,4496 ]
            },
            "properties": {
            "name":"The Underside"
            }
          },
          {
            "type": "Feature",
            "geometry": {
               "type": "Point",
               "coordinates":  [ 1504,4553 ]
            },
            "properties": {
            "name":"Brimm's Tavern"
            }
          },
          {
            "type": "Feature",
            "geometry": {
               "type": "Point",
               "coordinates":  [ 2310,3570 ]
            },
            "properties": {
            "name":"Nexus District"
            }
          }
    ]

    // icons
    var icons = {};
    icons.fastTravel = L.icon({
        iconUrl: './icon/fast_travel.png',
        shadowUrl: './icon/fast_travel_shadow.png',
        iconSize:       [64, 64],
        shadowSize:     [64, 64],
        iconAnchor:     [32, 32],
        shadowAnchor:   [32, 32],
        popupAnchor:    [0, 0]
    })
    icons.waypoint = L.icon({
        iconUrl: './icon/waypoint.png',
        iconSize:       [48, 48],
        iconAnchor:     [24, 42],
        popupAnchor:    [0, -24]
    })

    // markers
    var layers = {};

    // GeoJson

    layers.fastTravel = L.geoJSON(features, {
        pointToLayer: function (feature, latlng) {
            return L.marker(latlng, {
                icon: icons.fastTravel,
                title: feature.properties.name
            });
        }
    }).addTo(map);

    // waypoints

    layers.waypoint = L.layerGroup().addTo(map);
    var waypoints = {}; // waypoint layers

    function createWaypoint (e) {
        var uuid = UUID.generate();

        db.waypoints.add({
            uuid: uuid,
            lng: e.latlng.lng,
            lat: e.latlng.lat,
            name: '',
            icon: 'default'
        });

        addWaypointToMap(uuid, e.latlng.lat, e.latlng.lng);
    }

    function deleteWaypoint (uuid) {
        if (uuid in waypoints) {
            var waypoint = waypoints[uuid];
            map.removeLayer(waypoint);
            delete waypoints[uuid];
            db.waypoints.delete(uuid);
        }
    }

    function addWaypointToMap (uuid, lat, lng) {
        var label = 'X: ' + lng + ' Y: ' + lat;

        var btn = document.createElement('button');
        btn.innerText = 'Delete'
        btn.onclick = function() {
            deleteWaypoint(uuid);
        }
        var popup = document.createElement('div');
        popup.textContent += label;
        popup.appendChild(document.createElement("br"));
        popup.appendChild(btn);
        
        var waypoint = L.marker(L.latLng(lat, lng), {
            title: label,
            icon: icons.waypoint
        }).bindPopup(popup).addTo(map);
        waypoints[uuid] = waypoint;
        layers.waypoint.addLayer(waypoint);

        return waypoint;
    }

    function loadWaypoints () {
        db.waypoints.toArray().then(function (records) {
            for (const rec of records) {
                addWaypointToMap(rec.uuid, rec.lat, rec.lng);
            }
        });
    }

    // legend

    L.control.Legend({
        position: 'bottomleft',
        collapsed: false,
        legends: [
            {
                label: 'Fast Travel',
                type: 'image',
                url: './icon/fast_travel_legend.png',
                layers: layers.fastTravel
            },
            {
                label: 'Waypoint',
                type: 'image',
                url: './icon/waypoint.png',
                layers: layers.waypoint
            }
        ]
    }).addTo(map);

}
