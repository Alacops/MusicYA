import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { colors, fonts, glow, radius } from '../theme';

// Botón de "vidrio" azul eléctrico con efecto 3D (borde superior claro, banda de
// brillo diagonal y glow cian). Oscuro en reposo para contrastar; BRILLA más al
// pasar el cursor / presionar. Reutilizable en toda la app.

// Reposo: azul eléctrico OSCURO (contrasta con todo). Hover/press: BRILLA más.
const BASE = ['#1F6AB0', '#0A417E', '#04244F'] as const;
const HOVER = ['#7FEFFF', '#22C4FF', '#1E86FF'] as const;

export default function GlassButton({
  title,
  children,
  onPress,
  disabled = false,
  size = 'md',
  style,
  textStyle,
}: {
  title?: string;
  children?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  const bright = hover || pressed;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.btn, bright && styles.btnBright, disabled && styles.disabled, style]}
    >
      <LinearGradient
        colors={bright ? HOVER : BASE}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.inner, PAD[size]]}
      >
        <View style={[styles.sheen, bright && styles.sheenBright]} pointerEvents="none" />
        {children ?? (
          <Text style={[styles.text, size === 'sm' && styles.textSm, textStyle]}>{title}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const PAD = {
  sm: { paddingVertical: 9, paddingHorizontal: 14 },
  md: { paddingVertical: 14, paddingHorizontal: 18 },
  lg: { paddingVertical: 16, paddingHorizontal: 20 },
} as const;

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(90, 170, 220, 0.55)',
    overflow: 'hidden',
    ...glow(colors.electric),
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  // Hover/press: borde y glow más intensos → sensación de "encenderse".
  btnBright: {
    borderColor: 'rgba(180, 245, 255, 1)',
    shadowOpacity: 0.95,
    shadowRadius: 20,
  },
  disabled: { opacity: 0.5 },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.55)',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  sheenBright: { backgroundColor: 'rgba(255,255,255,0.30)' },
  text: {
    color: '#fff',
    fontSize: 15,
    fontFamily: fonts.bold,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(4, 30, 66, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  textSm: { fontSize: 13 },
});
