import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radius, spacing, glow } from '../theme';

// Vidrio azul eléctrico (igual que GlassButton): OSCURO por defecto para
// contrastar, y BRILLA más al pasar el cursor o presionar.
const GLASS_BASE = ['#1F6AB0', '#0A417E', '#04244F'] as const;
const GLASS_HOVER = ['#7FEFFF', '#22C4FF', '#1E86FF'] as const;

// Campo de formulario con etiqueta + input estilizado
export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />
    </View>
  );
}

// Botón principal de "vidrio" azul eléctrico con efecto 3D y oscurecimiento al
// pasar el cursor / presionar.
export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const off = disabled || loading;
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  const bright = hover || pressed;
  return (
    <Pressable
      style={[styles.buttonWrap, bright && styles.buttonWrapBright, off && styles.buttonDisabled]}
      onPress={onPress}
      disabled={off}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
    >
      <LinearGradient
        colors={bright ? GLASS_HOVER : GLASS_BASE}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.button}
      >
        <View style={[styles.buttonSheen, bright && styles.buttonSheenBright]} pointerEvents="none" />
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{title}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { marginBottom: spacing.md },
  label: { color: colors.muted, fontSize: 13, marginBottom: 6, fontFamily: fonts.medium },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    fontFamily: fonts.regular,
  },
  buttonWrap: {
    borderRadius: radius.md,
    marginTop: spacing.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(90, 170, 220, 0.55)',
    overflow: 'hidden',
    ...glow(colors.electric),
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  buttonWrapBright: {
    borderColor: 'rgba(180, 245, 255, 1)',
    shadowOpacity: 0.95,
    shadowRadius: 20,
  },
  button: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.55)',
  },
  buttonSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  buttonSheenBright: { backgroundColor: 'rgba(255,255,255,0.30)' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: fonts.display,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(4, 30, 66, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
