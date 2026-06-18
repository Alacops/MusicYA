export type LatLng = { lat: number; lng: number };
export type MapMarker = {
  lat: number;
  lng: number;
  name: string;
  genre: string | null;
  distanceKm: number;
  available: boolean;
};

// Genera un documento HTML autocontenido con un mapa Leaflet + OpenStreetMap
// (sin API key). Se usa tanto en web (iframe) como en nativo (WebView).
export function buildMapHtml(center: LatLng, markers: MapMarker[]): string {
  // Serializa de forma segura para incrustar en <script> (evita romper la etiqueta)
  const data = JSON.stringify({ center, markers }).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; }
    body { background: #0F0F17; }
    .leaflet-popup-content { font-family: -apple-system, system-ui, sans-serif; }
    .pin-name { font-weight: 700; font-size: 14px; }
    .pin-meta { color: #555; font-size: 12px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var DATA = ${data};
    var map = L.map('map', { zoomControl: true }).setView([DATA.center.lat, DATA.center.lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    var bounds = [];
    DATA.markers.forEach(function (m) {
      var color = m.available ? '#6C2BD9' : '#A0A0B2';
      var icon = L.divIcon({
        html: '<div style="background:' + color + ';width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 4px rgba(0,0,0,.5)"></div>',
        className: '', iconSize: [18, 18], iconAnchor: [9, 9]
      });
      var popup = '<div class="pin-name">' + m.name + '</div>' +
        '<div class="pin-meta">' + (m.genre || '') + ' · ' + m.distanceKm.toFixed(2) + ' km</div>' +
        '<div class="pin-meta">' + (m.available ? 'Disponible' : 'No disponible') + '</div>';
      L.marker([m.lat, m.lng], { icon: icon }).addTo(map).bindPopup(popup);
      bounds.push([m.lat, m.lng]);
    });
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40] });
  </script>
</body>
</html>`;
}
