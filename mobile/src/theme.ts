// Sistema de diseño de MusicYA — alineado al logo: degradado violeta → magenta
// sobre fondo oscuro púrpura, con tipografía XXL (Space Grotesk) y brillos neón.

export const colors = {
  // Acentos de marca (tomados del logo)
  primary: '#8B2FE0', // violeta
  primaryDark: '#5B1BA8',
  magenta: '#D633FF', // magenta del logo
  accent: '#D633FF', // acento principal = magenta
  pink: '#FF3DBE', // rosa
  cyan: '#27E1FF', // cian del waveform

  // Superficies (base oscura con tinte púrpura, como el fondo del logo)
  background: '#0D0A18',
  surface: '#1A1430',
  surfaceAlt: '#241B40',
  border: '#352A55',
  ink: '#0A0612', // sombra/borde oscuro

  text: '#FFFFFF',
  muted: '#A99FC4',
};

// Degradados de marca (para expo-linear-gradient)
export const gradients = {
  brand: ['#FF3DD4', '#8B2FE0'] as const, // magenta → violeta
  brandSoft: ['#D633FF', '#7C3AED'] as const,
  wave: ['#FF3DD4', '#8B2FE0', '#27E1FF'] as const, // como el waveform del logo
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
};

// Familias de fuente (cargadas en App.tsx con @expo-google-fonts/space-grotesk)
export const fonts = {
  display: 'SpaceGrotesk_700Bold',
  bold: 'SpaceGrotesk_600SemiBold',
  medium: 'SpaceGrotesk_500Medium',
  regular: 'SpaceGrotesk_400Regular',
};

// Escala tipográfica (tipografías grandes para lectura rápida)
export const type = {
  hero: 44,
  title: 30,
  h2: 22,
  h3: 18,
  body: 15,
  small: 13,
  tiny: 11,
};

// Brillo neón de color (sombra suave coloreada, estilo "glow" del logo)
export function glow(color: string = colors.magenta) {
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 8,
  } as const;
}

// Sombra dura "brutalista" (offset sólido) — disponible si se necesita
export function hardShadow(color: string = colors.ink, dx = 4, dy = 4) {
  return {
    shadowColor: color,
    shadowOffset: { width: dx, height: dy },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  } as const;
}
