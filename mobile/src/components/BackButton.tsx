import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { fonts } from '../theme';
import GlassButton from './GlassButton';

// Botón de "volver" reutilizable: flecha grande dentro de un botón de vidrio
// azul eléctrico (oscuro en reposo, brilla al pasar el cursor). El texto es
// opcional, para cabeceras donde solo cabe la flecha.
export default function BackButton({
  onPress,
  label = 'Volver',
  style,
}: {
  onPress: () => void;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <GlassButton onPress={onPress} size="sm" style={[styles.wrap, style]}>
      <View style={styles.row}>
        <Text style={styles.arrow}>←</Text>
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    </GlassButton>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  arrow: {
    color: '#fff',
    fontSize: 24,
    lineHeight: 26,
    fontFamily: fonts.display,
    textShadowColor: 'rgba(4, 30, 66, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontFamily: fonts.bold,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(4, 30, 66, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
