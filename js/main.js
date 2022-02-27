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
        'copyCoordShareUrl': 'Copy coordinate URL',
        'addWaypoint': 'Add a waypoint here',
        'view': 'View',
        'waypoint': 'Waypoint',
        'fastTravel': 'Fast Travel',
        'remove': 'Remove',
        'copied': 'Copied!',
        'copyFailed': 'Failed to copy',
        'copyFailed_msg': 'Your browser may not support it.<br>Manually copy from the following text:<br>%{coord}',
        'copyCoordWaypoint': 'Copy waypoint coordinates',
        'copyWaypointShareUrl': 'Copy waypoint URL',
        'removeWaypoint': 'Remove waypoint',
        'sharedWaypoint': 'Shared Waypoint'
    },
    'ja-JP': {
        'copyCoord': '座標をコピー',
        'copyCoordShareUrl': '座標URLをコピー',
        'addWaypoint': '地点を追加',
        'view': '表示',
        'waypoint': '地点',
        'fastTravel': 'ファストトラベル',
        'remove': '削除',
        'copied': 'コピーしました！',
        'copyFailed': 'コピーに失敗しました',
        'copyFailed_msg': '非対応ブラウザかもしれません。<br>↓以下を手動でコピーしてください<br>%{coord}',
        'copyCoordWaypoint': '地点の座標をコピー',
        'copyWaypointShareUrl': '地点URLをコピー',
        'removeWaypoint': '地点を削除',
        'sharedWaypoint': '共有された地点'
    }
};
var polyglot = new Polyglot();

function init() {

    // constants
    var keys = {
        lang: 'zenithmap-lang',
        langSelected: 'zenithmap-langSelected'
    }
    var langCodes = ['en-US', 'ja-JP'];
    var langNames = {
        'en-US': 'English',
        'ja-JP': '日本語'
    }

    // get
    var params = new URL(window.location.href).searchParams;
    // params.get('s'); // share
    // params.get('v'); // coords version
    // params.get('x'); // lng
    // params.get('y'); // lat

    // settings init
    if(localStorage.getItem(keys.lang) == null){
        var defaultLang = (navigator.language) ? navigator.language : navigator.userLanguage;
        if (defaultLang == undefined) defaultLang = 'en-US';
        if (!(defaultLang in langNames)) defaultLang = 'en-US';
        localStorage.setItem(keys.lang, defaultLang); // ブラウザの言語を判別して言語の初期設定をする。不明・非対応言語なら英語
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
        contextmenuItems: [{
            text: polyglot.t('copyCoord'),
            callback: function(e){ copyCoordinate(e.latlng) },
            index: 101
        }, {
            text: polyglot.t('copyCoordShareUrl'),
            callback: function(e){ copyShareUrl(e.latlng) },
            index: 102
        }, {
            text: polyglot.t('addWaypoint'),
            callback: createWaypoint,
            index: 103
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
    });
    icons.waypoint = L.icon({
        iconUrl: './icon/waypoint.png',
        iconSize:       [26, 38],
        iconAnchor:     [13, 37],
        popupAnchor:    [0, -24]
    });
    icons.shared = L.icon({
        iconUrl: './icon/shared.png',
        iconSize:       [32, 48],
        iconAnchor:     [16, 46],
        popupAnchor:    [0, -24]
    });

    // markers
    var layers = {};

    // GeoJson
    layers.fastTravel = L.layerGroup().addTo(map);
    $.getJSON('./data/fast_travel.geojson', function (data) {
        var layer = L.geoJSON(data, {
            pointToLayer: function (feature, latlng) {
                return L.marker(latlng, {
                    icon: icons.fastTravel,
                    title: feature.properties.name
                }).bindPopup('<div class="tooltip-title">' + polyglot.t('fastTravel') + '</div>' + '<hr>' + feature.properties.name);
            }
        }).addTo(map);
        layers.fastTravel.addLayer(layer);
    });

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
            icon: icons.waypoint,
            contextmenu: true,
            contextmenuItems: [{
                text: polyglot.t('copyCoordWaypoint'),
                callback: function(e) { copyCoordinate(e.relatedTarget.getLatLng()) },
                index: 0
            }, {
                text: polyglot.t('copyWaypointShareUrl'),
                callback: function(e){ copyShareUrl(e.relatedTarget.getLatLng()) },
                index: 1
            }, {
                text: polyglot.t('removeWaypoint'),
                callback: function(){ deleteWaypoint(uuid) },
                index: 2
            }, {
                separator: true,
                index: 3
            }]
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
                label: polyglot.t('fastTravel'),
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

    // shared url
    if (params.get('s') == 'c') {
        let version = params.get('v');
        let latlng = L.latLng(params.get('y'), params.get('x'));
        let waypoint = L.marker(latlng, {
            title: polyglot.t('sharedWaypoint'),
            icon: icons.shared,
            contextmenu: true,
            contextmenuItems: [{
                text: polyglot.t('copyCoordWaypoint'),
                callback: function(e) { copyCoordinate(e.relatedTarget.getLatLng()) },
                index: 0
            }, {
                separator: true,
                index: 1
            }]
        }).addTo(map);
        map.setView(latlng, 3);
    }

    function copyCoordinate(latlng) {
        var text = latlng.lng + ', ' + latlng.lat;
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

    function copyShareUrl(latlng) {
        var text = 'https://asatsuki.github.io/ZenithMap?';
        text += `s=c&v=1&x=${latlng.lng}&y=${latlng.lat}`;
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
}
