import { StyleSheet, Text, View } from 'react-native';
import { LatLng, MapMarker } from './mapHtml';
import { colors, spacing } from '../../theme';

// Fallback nativo (sin dependencias): muestra un aviso y delega la lista de
// artistas a la pantalla. El mapa interactivo se renderiza en web (iframe).
// Para un mapa nativo real, el siguiente paso es usar react-native-webview
// con buildMapHtml() o react-native-maps.
export default function MapView({
  markers,
  height = 380,
}: {
  center: LatLng;
  markers: MapMarker[];
  height?: number;
}) {
  return (
    <View style={[styles.box, { height }]}>
      <Text style={styles.emoji}>🗺️</Text>
      <Text style={styles.text}>
        Vista de mapa disponible en la versión web.
      </Text>
      <Text style={styles.sub}>{markers.length} artistas cerca (ver lista abajo)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emoji: { fontSize: 40, marginBottom: spacing.sm },
  text: { color: colors.text, fontSize: 15, textAlign: 'center' },
  sub: { color: colors.muted, fontSize: 13, marginTop: 4 },
});
