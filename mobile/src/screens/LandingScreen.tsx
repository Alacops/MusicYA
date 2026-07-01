import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GlassCard from '../components/GlassCard';
import Logo from '../components/Logo';
import { colors, fonts, gradients, radius, spacing, type, glow } from '../theme';

// Página de inicio pública (estilo agencia de booking, inspirada en AAE Music /
// Espectalium): presenta el negocio y deja explorar sin cuenta o iniciar sesión.

const STATS = [
  { value: '+50', label: 'Artistas' },
  { value: '8', label: 'Ciudades' },
  { value: '4.9★', label: 'Valoración' },
];

const CATEGORIES = [
  { icon: '🎤', title: 'Músicos y cantantes', desc: 'Solistas, bandas y tributos' },
  { icon: '🎧', title: 'DJs', desc: 'Fiestas, bodas y eventos' },
  { icon: '🎭', title: 'Animación y shows', desc: 'Magos, cómicos y espectáculos' },
  { icon: '🎼', title: 'Grupos en vivo', desc: 'Orquestas y agrupaciones' },
];

const STEPS = [
  { n: '1', title: 'Explora', desc: 'Busca artistas por género, ciudad y disponibilidad' },
  { n: '2', title: 'Reserva', desc: 'Elige fecha, valida disponibilidad y contrata' },
  { n: '3', title: 'Paga con QR', desc: 'Cierra el trato de forma rápida y segura' },
];

export default function LandingScreen({
  onExplore,
  onLogin,
  onRegister,
}: {
  onExplore: () => void;
  onLogin: () => void;
  onRegister: () => void;
}) {
  return (
    <View style={styles.root}>
      {/* Orbes de marca detrás del vidrio líquido */}
      <LinearGradient colors={['#FF3DD4', 'transparent']} style={styles.orbA} pointerEvents="none" />
      <LinearGradient colors={['#27E1FF', 'transparent']} style={styles.orbB} pointerEvents="none" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500 }}
          style={styles.hero}
        >
          <Logo size={150} style={styles.logo} />
          <Text style={styles.brand}>MusicYA</Text>
          <Text style={styles.tagline}>
            Contrata artistas y músicos en tiempo real, fácil y sin intermediarios.
          </Text>
        </MotiView>

        {/* Stats */}
        <View style={styles.statsRow}>
          {STATS.map((s) => (
            <GlassCard key={s.label} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </GlassCard>
          ))}
        </View>

        {/* CTAs */}
        <TouchableOpacity style={styles.ctaPrimary} onPress={onExplore} activeOpacity={0.9}>
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaPrimaryInner}
          >
            <Text style={styles.ctaPrimaryText}>Explorar artistas</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.ctaSecondaryRow}>
          <TouchableOpacity style={styles.ctaGhost} onPress={onLogin} activeOpacity={0.85}>
            <Text style={styles.ctaGhostText}>Iniciar sesión</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctaGhost} onPress={onRegister} activeOpacity={0.85}>
            <Text style={styles.ctaGhostText}>Crear cuenta</Text>
          </TouchableOpacity>
        </View>

        {/* Categorías / servicios */}
        <Text style={styles.sectionTitle}>Qué puedes contratar</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((c, i) => (
            <MotiView
              key={c.title}
              style={styles.gridItem}
              from={{ opacity: 0, translateY: 18 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 360, delay: 120 + i * 70 }}
            >
              <GlassCard style={styles.catTile}>
                <Text style={styles.catIcon}>{c.icon}</Text>
                <Text style={styles.catTitle}>{c.title}</Text>
                <Text style={styles.catDesc}>{c.desc}</Text>
              </GlassCard>
            </MotiView>
          ))}
        </View>

        {/* Cómo funciona */}
        <Text style={styles.sectionTitle}>Cómo funciona</Text>
        {STEPS.map((s, i) => (
          <MotiView
            key={s.n}
            from={{ opacity: 0, translateX: -16 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'timing', duration: 360, delay: 200 + i * 90 }}
          >
            <GlassCard style={styles.stepCard}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{s.n}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepDesc}>{s.desc}</Text>
              </View>
            </GlassCard>
          </MotiView>
        ))}

        {/* Confianza / cierre */}
        <GlassCard style={styles.trustCard}>
          <Text style={styles.trustText}>
            🎵 Artistas verificados por la comunidad · Chat en tiempo real · Pagos con QR
          </Text>
        </GlassCard>

        <TouchableOpacity onPress={onExplore} activeOpacity={0.8} style={styles.footerLink}>
          <Text style={styles.footerLinkText}>Explora el catálogo sin registrarte →</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  orbA: {
    position: 'absolute',
    top: -60,
    right: -70,
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.55,
  },
  orbB: {
    position: 'absolute',
    top: 360,
    left: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.4,
  },
  content: { padding: spacing.lg, paddingTop: 64, paddingBottom: 48 },
  hero: { alignItems: 'center', marginBottom: spacing.lg },
  logo: { marginBottom: spacing.sm },
  brand: {
    color: colors.text,
    fontSize: type.hero,
    fontFamily: fonts.display,
    letterSpacing: -1,
  },
  tagline: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: fonts.regular,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  statValue: { color: colors.accent, fontSize: 22, fontFamily: fonts.display },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 2, fontFamily: fonts.medium },
  ctaPrimary: { borderRadius: radius.md, ...glow() },
  ctaPrimaryInner: { borderRadius: radius.md, paddingVertical: 16, alignItems: 'center' },
  ctaPrimaryText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: fonts.display,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ctaSecondaryRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  ctaGhost: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaGhostText: { color: colors.text, fontSize: 14, fontFamily: fonts.bold },
  sectionTitle: {
    color: colors.text,
    fontSize: type.h2,
    fontFamily: fonts.display,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%', marginBottom: spacing.md },
  catTile: { padding: spacing.md, minHeight: 128 },
  catIcon: { fontSize: 28, marginBottom: spacing.sm },
  catTitle: { color: colors.text, fontSize: 15, fontFamily: fonts.bold },
  catDesc: { color: colors.muted, fontSize: 13, marginTop: 2, fontFamily: fonts.regular },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  stepBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: { color: colors.text, fontSize: 18, fontFamily: fonts.display },
  stepTitle: { color: colors.text, fontSize: 16, fontFamily: fonts.bold },
  stepDesc: { color: colors.muted, fontSize: 13, marginTop: 2, fontFamily: fonts.regular },
  trustCard: { padding: spacing.md, marginTop: spacing.sm },
  trustText: { color: colors.text, fontSize: 14, textAlign: 'center', fontFamily: fonts.medium, lineHeight: 20 },
  footerLink: { alignItems: 'center', marginTop: spacing.lg },
  footerLinkText: { color: colors.accent, fontSize: 14, fontFamily: fonts.bold },
});
