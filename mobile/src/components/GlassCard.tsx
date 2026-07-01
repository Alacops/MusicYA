import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { radius } from '../theme';

// Superficie "liquid glass": panel translúcido con desenfoque del fondo,
// un velo tenue y un borde fino luminoso. Deja pasar los degradados de
// marca que haya detrás para el efecto vidrio líquido (tendencia Phygital).
export default function GlassCard({
  children,
  style,
  intensity = 40,
  tint = 'dark',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
}) {
  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      // En Android SDK 56 este método activa el desenfoque real del fondo
      blurMethod="dimezisBlurView"
      style={[styles.card, style]}
    >
      <View style={styles.veil} pointerEvents="none" />
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  // Velo blanco muy sutil sobre el desenfoque → aspecto esmerilado
  veil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
});
