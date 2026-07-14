import { useEffect } from 'react';
import { buildMapHtml, LatLng, MapMarker } from './mapHtml';

// En web (react-native-web usa React DOM por debajo) renderizamos un iframe
// con el mapa Leaflet incrustado vía srcDoc. El iframe avisa por postMessage
// cuando se toca un artista, para abrir su perfil/portafolio.
export default function MapView({
  center,
  markers,
  height = 380,
  onMarkerClick,
}: {
  center: LatLng;
  markers: MapMarker[];
  height?: number;
  onMarkerClick?: (id: number) => void;
}) {
  useEffect(() => {
    if (!onMarkerClick) return;
    const handler = (e: MessageEvent) => {
      const d = e.data;
      if (d && d.type === 'musicya:artist' && typeof d.id === 'number') {
        onMarkerClick(d.id);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onMarkerClick]);

  const html = buildMapHtml(center, markers);
  return (
    <iframe
      title="Mapa de artistas"
      srcDoc={html}
      style={{ border: 0, width: '100%', height, borderRadius: 16 }}
    />
  );
}
