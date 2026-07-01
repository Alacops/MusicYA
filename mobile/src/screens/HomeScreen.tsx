import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../api/client';
import { getViewed, type ViewedArtist } from '../behavior';
import { useAuth } from '../auth/AuthContext';
import GlassCard from '../components/GlassCard';
import Logo from '../components/Logo';
import VerifiedBadge from '../components/VerifiedBadge';
import { useNotifications } from '../notifications/NotificationsContext';
import { colors, fonts, radius, spacing, type, glow } from '../theme';

type FeatureAction = 'map' | 'chat' | 'bookings' | 'notifications' | 'copilot';

const FEATURES: { icon: string; title: string; desc: string; action: FeatureAction }[] = [
  { icon: '📍', title: 'Búsqueda geolocalizada', desc: 'Filtros y disponibilidad en tiempo real', action: 'map' },
  { icon: '💬', title: 'Chat y mensajería', desc: 'Mensajería instantánea y chatbot', action: 'chat' },
  { icon: '📅', title: 'Reservas y pagos QR', desc: 'Validación de disponibilidad y pagos', action: 'bookings' },
  { icon: '🔔', title: 'Notificaciones', desc: 'Avisos de reservas y mensajes', action: 'notifications' },
  { icon: '⭐', title: 'Recomendaciones IA', desc: 'Sugerencias inteligentes e historial', action: 'copilot' },
];

type Artist = {
  id: number;
  genre: string | null;
  city: string | null;
  hourly_rate: number | null;
  rating_avg: number | string | null;
  is_available: boolean;
  is_verified?: boolean;
  users: { name: string } | null;
};

export default function HomeScreen({
  isGuest = false,
  onRequireLogin,
  onOpenArtist,
  onOpenPortfolio,
  onOpenBookings,
  onOpenMap,
  onOpenNotifications,
  onOpenChat,
  onOpenCopilot,
}: {
  isGuest?: boolean;
  onRequireLogin?: () => void;
  onOpenArtist: (id: number) => void;
  onOpenPortfolio: () => void;
  onOpenBookings: () => void;
  onOpenMap: () => void;
  onOpenNotifications: () => void;
  onOpenChat: () => void;
  onOpenCopilot: () => void;
}) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [artists, setArtists] = useState<Artist[] | null>(null);
  const [viewed, setViewed] = useState<ViewedArtist[]>([]);
  const requireLogin = onRequireLogin ?? (() => {});

  // Cada módulo abre la pantalla correspondiente ya existente
  const featureActions: Record<FeatureAction, () => void> = {
    map: onOpenMap,
    chat: onOpenChat,
    bookings: onOpenBookings,
    notifications: onOpenNotifications,
    copilot: onOpenCopilot,
  };

  useEffect(() => {
    api
      .get<Artist[]>('/artists')
      .then((list) => setArtists(Array.isArray(list) ? list : []))
      .catch(() => setArtists([]));
    // Personalización predictiva: recupera los artistas vistos recientemente
    getViewed().then(setViewed);
  }, []);

  return (
    <View style={styles.root}>
      {/* Orbes de luz de marca: dan sustancia al desenfoque del vidrio líquido */}
      <LinearGradient colors={['#FF3DD4', 'transparent']} style={styles.orbA} pointerEvents="none" />
      <LinearGradient colors={['#27E1FF', 'transparent']} style={styles.orbB} pointerEvents="none" />
      <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Logo size={64} style={styles.headerLogo} />
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>MusicYA</Text>
          <Text style={styles.welcome}>
            {isGuest
              ? 'Explora como invitado'
              : `Hola, ${user?.name} · ${user?.role === 'artista' ? 'Artista' : 'Cliente'}`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.bell}
          onPress={isGuest ? requireLogin : onOpenNotifications}
          activeOpacity={0.85}
        >
          <Text style={styles.bellIcon}>🔔</Text>
          {!isGuest && unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        {isGuest ? (
          <TouchableOpacity style={styles.logout} onPress={requireLogin} activeOpacity={0.85}>
            <Text style={styles.logoutText}>Ingresar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.logout} onPress={logout} activeOpacity={0.85}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.navRow}>
        <TouchableOpacity style={styles.navBtn} onPress={onOpenMap} activeOpacity={0.85}>
          <Text style={styles.navText}>🗺️ Mapa</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={onOpenBookings} activeOpacity={0.85}>
          <Text style={styles.navText}>📅 Reservas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={onOpenChat} activeOpacity={0.85}>
          <Text style={styles.navText}>💬 Chat</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.aiTouch} onPress={onOpenCopilot} activeOpacity={0.9}>
        <GlassCard intensity={55} style={styles.aiBtn}>
          <Text style={styles.aiText}>🤖 Pregúntale al asistente IA</Text>
        </GlassCard>
      </TouchableOpacity>

      {!isGuest && user?.role === 'artista' && (
        <TouchableOpacity style={styles.portfolioTouch} onPress={onOpenPortfolio} activeOpacity={0.9}>
          <GlassCard intensity={45} style={styles.portfolioBtn}>
            <Text style={styles.aiText}>🎨 Mi portafolio</Text>
          </GlassCard>
        </TouchableOpacity>
      )}

      {viewed.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Vistos recientemente</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.viewedRow}
          >
            {viewed.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={styles.viewedTouch}
                onPress={() => onOpenArtist(v.id)}
                activeOpacity={0.85}
              >
                <GlassCard style={styles.viewedChip}>
                  <View style={styles.viewedAvatar}>
                    <Text style={styles.avatarText}>{(v.name || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.viewedNameRow}>
                    <Text style={styles.viewedName} numberOfLines={1}>{v.name}</Text>
                    {v.is_verified && <VerifiedBadge />}
                  </View>
                  {v.genre ? (
                    <Text style={styles.viewedGenre} numberOfLines={1}>{v.genre}</Text>
                  ) : null}
                </GlassCard>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      <Text style={styles.sectionTitle}>Catálogo</Text>
      {artists === null ? (
        <Text style={styles.placeholder}>Cargando artistas…</Text>
      ) : artists.length === 0 ? (
        <Text style={styles.placeholder}>Aún no hay artistas registrados.</Text>
      ) : (
        <View style={styles.grid}>
          {artists.map((a, i) => {
            const rating = Number(a.rating_avg) || 0;
            return (
              <MotiView
                key={a.id}
                style={styles.gridItem}
                from={{ opacity: 0, translateY: 18, scale: 0.97 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                transition={{ type: 'timing', duration: 360, delay: i * 70 }}
              >
                <TouchableOpacity
                  style={styles.tileTouch}
                  onPress={() => onOpenArtist(a.id)}
                  activeOpacity={0.85}
                >
                  <GlassCard style={styles.tile}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{(a.users?.name || '?').charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.nameRow}>
                      <Text style={styles.artistName} numberOfLines={1}>
                        {a.users?.name || 'Artista'}
                      </Text>
                      {a.is_verified && <VerifiedBadge />}
                    </View>
                    <Text style={styles.artistMeta} numberOfLines={1}>
                      {[a.genre, a.city].filter(Boolean).join(' · ') || 'Sin datos'}
                    </Text>
                    <View style={styles.tileFoot}>
                      <Text style={styles.rating}>{rating > 0 ? `⭐ ${rating.toFixed(1)}` : 'Nuevo'}</Text>
                      {a.hourly_rate != null && <Text style={styles.price}>S/{a.hourly_rate}/h</Text>}
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              </MotiView>
            );
          })}
        </View>
      )}

      <Text style={styles.sectionTitle}>Módulos</Text>
      <View style={styles.grid}>
        {FEATURES.map((f, i) => (
          <MotiView
            key={f.title}
            style={styles.gridItem}
            from={{ opacity: 0, translateY: 18 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 360, delay: 300 + i * 70 }}
          >
            <TouchableOpacity
              style={styles.tileTouch}
              onPress={featureActions[f.action]}
              activeOpacity={0.85}
            >
              <GlassCard style={styles.moduleTile}>
                <Text style={styles.cardIcon}>{f.icon}</Text>
                <Text style={styles.cardTitle}>{f.title}</Text>
                <Text style={styles.cardDesc}>{f.desc}</Text>
              </GlassCard>
            </TouchableOpacity>
          </MotiView>
        ))}
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  orbA: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.5,
  },
  orbB: {
    position: 'absolute',
    top: 320,
    left: -90,
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.4,
  },
  content: { padding: spacing.lg, paddingTop: 64 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  headerLogo: { marginRight: spacing.sm },
  brand: { color: colors.accent, fontSize: type.title, fontFamily: fonts.display, letterSpacing: -0.5 },
  welcome: { color: colors.muted, fontSize: 14, marginTop: 4, fontFamily: fonts.medium },
  logout: {
    backgroundColor: colors.pink,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  logoutText: { color: colors.ink, fontSize: 13, fontFamily: fonts.bold, textTransform: 'uppercase' },
  bell: {
    backgroundColor: colors.surfaceAlt,
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  bellIcon: { fontSize: 18 },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: colors.pink,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.ink, fontSize: 11, fontFamily: fonts.display },
  navRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  navBtn: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  navText: { color: colors.text, fontSize: 14, fontFamily: fonts.bold },
  aiTouch: { borderRadius: radius.lg, marginBottom: spacing.md, ...glow(colors.magenta) },
  aiBtn: { paddingVertical: 16, alignItems: 'center', borderColor: 'rgba(214,51,255,0.5)' },
  aiText: { color: colors.text, fontSize: 15, fontFamily: fonts.bold },
  portfolioTouch: { borderRadius: radius.lg, marginBottom: spacing.lg, ...glow(colors.cyan) },
  portfolioBtn: { paddingVertical: 16, alignItems: 'center', borderColor: 'rgba(39,225,255,0.5)' },
  sectionTitle: {
    color: colors.text,
    fontSize: type.h2,
    fontFamily: fonts.display,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  placeholder: { color: colors.muted, fontSize: 14, marginBottom: spacing.lg, fontFamily: fonts.regular },
  viewedRow: { gap: spacing.md, paddingBottom: spacing.md, paddingRight: spacing.sm },
  viewedTouch: { width: 132, borderRadius: radius.lg, ...glow() },
  viewedChip: { padding: spacing.md },
  viewedAvatar: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  viewedNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewedName: { color: colors.text, fontSize: 14, fontFamily: fonts.bold, flexShrink: 1 },
  viewedGenre: { color: colors.muted, fontSize: 12, marginTop: 2, fontFamily: fonts.regular },
  // Rejilla modular "Vento Grid": dos columnas que fluyen
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%', marginBottom: spacing.md },
  tileTouch: { borderRadius: radius.lg, ...glow() },
  tile: { padding: spacing.md, minHeight: 148 },
  tileFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: spacing.sm,
  },
  moduleTile: { padding: spacing.md, minHeight: 128 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { color: colors.text, fontSize: 18, fontFamily: fonts.display },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  artistName: { color: colors.text, fontSize: 16, fontFamily: fonts.bold, flexShrink: 1 },
  artistMeta: { color: colors.muted, fontSize: 13, marginTop: 2, fontFamily: fonts.regular },
  rating: { color: colors.accent, fontSize: 14, fontFamily: fonts.bold },
  price: { color: colors.muted, fontSize: 12, fontFamily: fonts.regular },
  cardIcon: { fontSize: 28, marginBottom: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 16, fontFamily: fonts.bold },
  cardDesc: { color: colors.muted, fontSize: 13, marginTop: 2, fontFamily: fonts.regular },
});
