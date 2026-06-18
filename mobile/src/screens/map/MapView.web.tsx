import { buildMapHtml, LatLng, MapMarker } from './mapHtml';

// En web (react-native-web usa React DOM por debajo) renderizamos un iframe
// con el mapa Leaflet incrustado vía srcDoc.
export default function MapView({
  center,
  markers,
  height = 380,
}: {
  center: LatLng;
  markers: MapMarker[];
  height?: number;
}) {
  const html = buildMapHtml(center, markers);
  return (
    <iframe
      title="Mapa de artistas"
      srcDoc={html}
      style={{ border: 0, width: '100%', height, borderRadius: 16 }}
    />
  );
}
