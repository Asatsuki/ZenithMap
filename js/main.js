var yx = L.latLng;

var xy = function(x, y) {
    if (L.Util.isArray(x)) {    // When doing xy([x, y]);
        return yx(x[1], x[0]);
    }
    return yx(y, x);  // When doing xy(x, y);
};

var langs = {
    'en-US': {
        'copyCoord': 'Copy coordinates',
        'addWaypoint': 'Add a waypoint here',
        'view': 'View',
        'waypoint': 'Waypoint',
        'fast_travel': 'Fast Travel',
        'remove': 'Remove',
        'copied': 'Copied!',
        'copyFailed': 'Failed to copy',
        'copyFailed_msg': 'Your browser may not support it.<br>Manually copy from the following text:<br>%{coord}'
    },
    'ja': {
        'copyCoord': '座標をコピー',
        'addWaypoint': 'ここに地点を追加',
        'view': '表示',
        'waypoint': '地点',
        'fast_travel': 'ファストトラベル',
        'remove': '削除',
        'copied': 'コピーしました！',
        'copyFailed': 'コピーに失敗しました',
        'copyFailed_msg': 'ブラウザが対応していない可能性があります。<br>↓以下のテキストを手動でコピーしてください<br>%{coord}'
    }
};
var polyglot = new Polyglot();

function init() {

    // constants
    var keys = {
        lang: 'zenithmap-lang',
        langSelected: 'zenithmap-langSelected'
    }
    var langCodes = ['en-US', 'ja'];
    var langNames = {
        'en-US': 'English',
        'ja': '日本語'
    }

    // settings init
    if(localStorage.getItem(keys.lang) == null){
        localStorage.setItem(keys.lang, 'en-US')
    }

    // i18n
    var lang = localStorage.getItem(keys.lang);
    if (lang in langs) {
        polyglot.extend(langs[lang]);
    } else {
        polyglot.extend(langs['en-US']);
    }

    // indexedDB
    var db = new Dexie('ZenithMapClientDB');
    //v1
    db.version(1).stores({
        waypoints: '&uuid,lng,lat,name,icon'
    })

    // crs
    var factorX = 256 / 16384;
    var factorY = 256 / 16384;
    var constantX = 0;
    var constantY = 0;
    CRS_Substatica_v_1_2 = L.extend({}, L.CRS.Simple, {
        transformation: new L.Transformation(factorX, constantX, factorY, constantY),
    });

    // map
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
            text: polyglot.t('copyCoord'),
            callback: copyCorrdinate,
            index: 0
        }, {
            text: polyglot.t('addWaypoint'),
            callback: createWaypoint,
            index: 100
        }]
    });
    
    // tile
    L.tileLayer.fallback('./tile/{z}/{x}/{y}.png', {
        attribution: '<a href="https://twitter.com/ZenithMMO/status/1489691004357812226" target="_blank">Original Map</a>',
        noWrap: true
    }).addTo(map);
    
    //var image = L.imageOverlay('./overlay/ZenithMap.jpg', bounds).addTo(map);

    var options = {
        position: 'bottomleft',
        enableUserInput: false,
        decimals: 2,
        labelTemplateLng: '({x},',
        labelTemplateLat: '{y})',
        useLatLngOrder: false
    }
    map.fitBounds(bounds, {
        animate: false
    });
    L.control.coordinates(options).addTo(map);

    // lang selector
    L.Control.LangSelector = L.Control.extend({
        onAdd: function (map) {
            var div = L.DomUtil.create('div', 'lang-selector');
            var select = L.DomUtil.create('select');
            for (const langCode of langCodes) {
                let option = L.DomUtil.create('option');
                option.setAttribute('value', langCode);
                option.innerText += langNames[langCode];
                if (localStorage.getItem(keys.lang) == langCode) {
                    option.setAttribute('selected', true);
                }
                select.appendChild(option);
            }

            div.appendChild(select);
    
            select.onmousedown = select.ondblclick = L.DomEvent.stopPropagation;
            select.addEventListener('change', (e) => {
                localStorage.setItem(keys.lang, e.target.value);
                location.reload();
            })
            return div;
        },
        onRemove: function(map) {
            // NOOP
        }
    });
    L.control.langSelector = function(opts) {
        return new L.Control.LangSelector(opts);
    }
    L.control.langSelector({position: 'topright'}).addTo(map);

    // notification
    var notification = L.control.notifications({
        timeout: 3000,
        position: 'topright',
        closable: true,
        dismissable: true,
        alert: 'fa-solid fa-circle-xmark',
        success: 'fa-solid fa-circle-check',
        warning: 'fa-solid fa-triangle-exclamation',
        info: 'fa-solid fa-circle-info',
        custom: 'fa-solid fa-gear'
    })
    .addTo(map);
    
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
        iconSize:       [26, 38],
        iconAnchor:     [13, 37],
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

    loadWaypoints(); // load waypoints

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
        var label = '(' + lng + ', ' + lat + ')';

        var btn = document.createElement('button');
        btn.innerText = polyglot.t('remove')
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
        title: polyglot.t('view'),
        legends: [
            {
                label: polyglot.t('fast_travel'),
                type: 'image',
                url: './icon/fast_travel_legend.png',
                layers: layers.fastTravel
            },
            {
                label: polyglot.t('waypoint'),
                type: 'image',
                url: './icon/waypoint.png',
                layers: layers.waypoint
            }
        ]
    }).addTo(map);

    // copy coord
    function copyCorrdinate(e) {
        var text = '(' + e.latlng.lng + ', ' + e.latlng.lat + ')';
        try {
            navigator.clipboard.writeText(text);
            notification.success(polyglot.t('copied'), text);
        } catch(error) {
            notification.alert(polyglot.t('copyFailed'), polyglot.t('copyFailed_msg', {coord: text}), {
                dismissable: false,
                timeout: 8000
            });
        }
        
    }

    // lang select
    function selectLang(e) {
        var dialog = L.control.dialog({})
        .setContent('Select your language')
        .addTo(map);
    }
}
