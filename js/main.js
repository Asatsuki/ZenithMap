var yx = L.latLng;

var xy = function(x, y) {
    if (L.Util.isArray(x)) {    // When doing xy([x, y]);
        return yx(x[1], x[0]);
    }
    return yx(y, x);  // When doing xy(x, y);
};

function init() {
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
        wheelPxPerZoomLevel: 60
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

    var fastTravelIcon = L.icon({
        iconUrl: './icon/fast_travel.png',
        shadowUrl: './icon/fast_travel_shadow.png',
        iconSize:       [64, 64],
        shadowSize:     [64, 64],
        iconAnchor:     [32, 32],
        shadowAnchor:   [32, 32],
        popupAnchor:    [0, 0]
    })

    var features = [
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [2263, 3544]
            },
            "properties": {
                "name": "Zenith City"
            }
        },
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [3408, 3526]
            },
            "properties": {
                "name": "Fractured Plains"
            }
        }
    ]

    var fastTravelLayer = L.geoJSON(features, {
        pointToLayer: function (feature, latlng) {
            return L.marker(latlng, {
                icon: fastTravelIcon
            }).bindPopup(feature.properties.name);
        }
    }).addTo(map);

    L.control.Legend({
        position: "bottomleft",
        collapsed: false,
        legends: [
            {
                label: "Fast Travel",
                type: "image",
                url: "./icon/fast_travel.png",
                layers: fastTravelLayer
            }
        ]
    }).addTo(map);
}
