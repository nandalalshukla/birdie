/**
 * A self-contained Leaflet page rendered inside a WebView (native) or an
 * iframe (web). Communication is via postMessage in both directions:
 *
 *   app → map:  { type: 'setData', geojson }, { type: 'setView', lat, lon, zoom }, { type: 'setUser', lat, lon }
 *   map → app:  { type: 'ready' }, { type: 'bounds', bbox: [minLon, minLat, maxLon, maxLat], zoom }, { type: 'select', id }
 */

const LEAFLET_VERSION = '1.9.4';

export type MapInbound =
  | { type: 'setData'; geojson: unknown }
  | { type: 'setView'; lat: number; lon: number; zoom?: number }
  | { type: 'setUser'; lat: number; lon: number };

export type MapOutbound =
  | { type: 'ready' }
  | { type: 'bounds'; bbox: [number, number, number, number]; zoom: number }
  | { type: 'select'; id: string };

export function buildLeafletHtml(opts: { lat: number; lon: number; zoom: number; primary: string; accent: string; dark: boolean }) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js"></script>
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: ${opts.dark ? '#1A1F1B' : '#EEF1EE'}; }
  .bird-popup b { font-size: 14px; }
  .bird-popup i { color: #666; }
  .bird-popup a { display: inline-block; margin-top: 6px; font-weight: 600; color: ${opts.primary}; }
  .user-dot { width: 14px; height: 14px; border-radius: 7px; background: #2D7FF9; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,.4); }
</style>
</head>
<body>
<div id="map"></div>
<script>
(function () {
  function send(msg) {
    var data = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(data);
    else if (window.parent !== window) window.parent.postMessage({ __birdear: true, payload: data }, '*');
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }

  var map = L.map('map', { zoomControl: false }).setView([${opts.lat}, ${opts.lon}], ${opts.zoom});
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  var layer = L.geoJSON(null, {
    pointToLayer: function (f, latlng) {
      var mine = f.properties && f.properties.is_mine;
      return L.circleMarker(latlng, {
        radius: 7 + Math.round((f.properties.confidence || 0.5) * 5),
        color: '#ffffff', weight: 2,
        fillColor: mine ? '${opts.primary}' : '${opts.accent}', fillOpacity: 0.9
      });
    },
    onEachFeature: function (f, l) {
      var p = f.properties || {};
      var when = p.observed_at ? new Date(p.observed_at).toLocaleString() : '';
      var who = p.is_mine ? 'You' : esc(p.observer_name || 'A birder');
      var html = '<div class="bird-popup"><b>' + esc(p.common_name) + '</b><br/><i>' + esc(p.scientific_name) + '</i><br/>' +
        Math.round((p.confidence || 0) * 100) + '% · ' + who + '<br/>' + esc(when) +
        (p.note ? '<br/>“' + esc(p.note) + '”' : '') +
        (p.job_id ? '<br/><a href="#" data-id="' + esc(f.id) + '">Open identification ›</a>' : '') + '</div>';
      l.bindPopup(html);
    }
  }).addTo(map);

  map.on('popupopen', function (e) {
    var a = e.popup.getElement().querySelector('a[data-id]');
    if (a) a.addEventListener('click', function (ev) { ev.preventDefault(); send({ type: 'select', id: a.getAttribute('data-id') }); });
  });

  // Keep the "you are here" dot under the sighting markers (overlayPane is z-index 400).
  map.createPane('user');
  map.getPane('user').style.zIndex = 350;
  var userMarker = null;
  function emitBounds() {
    var b = map.getBounds();
    send({ type: 'bounds', bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], zoom: map.getZoom() });
  }
  map.on('moveend', emitBounds);

  function handle(raw) {
    var msg; try { msg = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { return; }
    if (!msg || !msg.type) return;
    if (msg.type === 'setData') { layer.clearLayers(); layer.addData(msg.geojson); }
    else if (msg.type === 'setView') { map.setView([msg.lat, msg.lon], msg.zoom || map.getZoom()); }
    else if (msg.type === 'setUser') {
      var ll = [msg.lat, msg.lon];
      if (userMarker) userMarker.setLatLng(ll);
      else userMarker = L.marker(ll, { icon: L.divIcon({ className: '', html: '<div class="user-dot"></div>', iconSize: [20, 20] }), interactive: false, pane: 'user' }).addTo(map);
    }
  }
  window.birdear = { handle: handle };
  window.addEventListener('message', function (e) { if (e.data && e.data.__birdear) handle(e.data.payload); else if (typeof e.data === 'string') handle(e.data); });
  document.addEventListener('message', function (e) { handle(e.data); });

  send({ type: 'ready' });
  emitBounds();
})();
</script>
</body>
</html>`;
}
