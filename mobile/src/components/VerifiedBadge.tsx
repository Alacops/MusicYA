import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

// Insignia de "artista verificado" (validación comunitaria).
// `label` muestra la pastilla con texto; sin él, solo el check circular.
export default function VerifiedBadge({ label = false }: { label?: boolean }) {
  if (label) {
    return (
      <View style={styles.pill}>
        <Text style={styles.pillCheck}>✓</Text>
        <Text style={styles.pillText}>Verificado</Text>
      </View>
    );
  }
  return (
    <View style={styles.dot}>
      <Text style={styles.dotCheck}>✓</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCheck: { color: colors.ink, fontSize: 11, fontFamily: fonts.display, marginTop: -1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cyan,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    gap: 4,
  },
  pillCheck: { color: colors.ink, fontSize: 12, fontFamily: fonts.display },
  pillText: { color: colors.ink, fontSize: 12, fontFamily: fonts.bold, textTransform: 'uppercase' },
});
