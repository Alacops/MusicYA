export type LatLng = { lat: number; lng: number };
export type MapMarker = {
  id?: number;
  lat: number;
  lng: number;
  name: string;
  genre: string | null;
  distanceKm?: number;
  available: boolean;
  avatarUrl?: string | null;
  hourlyRate?: number | null;
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
    .pin-name { font-weight: 700; font-size: 14px; color: #1A1430; }
    .pin-meta { color: #555; font-size: 12px; }
    .pin-card { display: flex; gap: 8px; align-items: center; min-width: 150px; }
    .pin-photo { width: 46px; height: 46px; border-radius: 8px; object-fit: cover; flex: 0 0 auto; background: #241B40; }
    .pin-dot { width: 46px; height: 46px; border-radius: 8px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; }
    .pin-price { display: inline-block; margin-top: 4px; color: #D633FF; font-weight: 800; font-size: 13px; background: rgba(214,51,255,0.12); border: 1px solid #D633FF; border-radius: 999px; padding: 1px 8px; }
    .leaflet-popup-content { margin: 8px 10px; }
    .pin-card.clickable { cursor: pointer; }
    .pin-go { color: #D633FF; font-size: 11px; font-weight: 700; margin-top: 4px; }
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

    function esc(s) {
      return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Avisa al contenedor (React Native web) que se tocó un artista → abrir su perfil
    function pick(id) {
      if (id == null) return;
      try { window.parent.postMessage({ type: 'musicya:artist', id: id }, '*'); } catch (e) {}
    }
    window.pick = pick;

    var bounds = [];
    DATA.markers.forEach(function (m) {
      var color = m.available ? '#D633FF' : '#A0A0B2';
      var icon = L.divIcon({
        html: '<div style="background:' + color + ';width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 8px ' + color + '"></div>',
        className: '', iconSize: [18, 18], iconAnchor: [9, 9]
      });
      // Tarjeta con foto e información básica (se muestra al pasar el cursor)
      var initial = esc((m.name || '?').charAt(0).toUpperCase());
      var media = m.avatarUrl
        ? '<img class="pin-photo" src="' + esc(m.avatarUrl) + '" alt="" />'
        : '<div class="pin-dot" style="background:' + color + '">' + initial + '</div>';
      var dist = (typeof m.distanceKm === 'number') ? ' · ' + m.distanceKm.toFixed(1) + ' km' : '';
      var price = (typeof m.hourlyRate === 'number')
        ? '<div class="pin-price">S/' + m.hourlyRate + '/h</div>'
        : '';
      // Si hay id, la tarjeta es clicable y lleva al perfil/portafolio del artista
      var clickable = (m.id != null);
      var go = clickable ? '<div class="pin-go">Ver perfil y portafolio →</div>' : '';
      var openAttr = clickable ? ' onclick="pick(' + m.id + ')"' : '';
      var popup = '<div class="pin-card' + (clickable ? ' clickable' : '') + '"' + openAttr + '>' + media +
        '<div>' +
          '<div class="pin-name">' + esc(m.name) + '</div>' +
          '<div class="pin-meta">' + esc(m.genre || 'Artista') + dist + '</div>' +
          '<div class="pin-meta">' + (m.available ? '🟢 Disponible' : '⚪ No disponible') + '</div>' +
          price + go +
        '</div></div>';
      var marker = L.marker([m.lat, m.lng], { icon: icon }).addTo(map)
        .bindPopup(popup, { closeButton: false, offset: [0, -2] });
      // Hover: abre la tarjeta al entrar y la cierra al salir
      marker.on('mouseover', function () { this.openPopup(); });
      marker.on('mouseout', function () { this.closePopup(); });
      // Clic en el pin → abre el perfil del artista
      marker.on('click', function () { pick(m.id); });
      bounds.push([m.lat, m.lng]);
    });
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40] });
  </script>
</body>
</html>`;
}
