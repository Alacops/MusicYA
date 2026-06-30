import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import Logo from '../components/Logo';
import { useNotifications } from '../notifications/NotificationsContext';
import { colors, fonts, radius, spacing, type, glow } from '../theme';

const FEATURES = [
  { icon: '🎵', title: 'Perfiles de artistas', desc: 'Portafolio, multimedia y calificaciones' },
  { icon: '📍', title: 'Búsqueda geolocalizada', desc: 'Filtros y disponibilidad en tiempo real' },
  { icon: '💬', title: 'Chat y notificaciones', desc: 'Mensajería instantánea y chatbot' },
  { icon: '📅', title: 'Reservas y pagos QR', desc: 'Validación de disponibilidad y pagos' },
  { icon: '⭐', title: 'Recomendaciones', desc: 'Sugerencias inteligentes e historial' },
];

type Artist = {
  id: number;
  genre: string | null;
  city: string | null;
  hourly_rate: number | null;
  rating_avg: number | string | null;
  is_available: boolean;
  users: { name: string } | null;
};

export default function HomeScreen({
  onOpenArtist,
  onOpenBookings,
  onOpenMap,
  onOpenNotifications,
  onOpenChat,
}: {
  onOpenArtist: (id: number) => void;
  onOpenBookings: () => void;
  onOpenMap: () => void;
  onOpenNotifications: () => void;
  onOpenChat: () => void;
}) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [artists, setArtists] = useState<Artist[] | null>(null);

  useEffect(() => {
    api
      .get<Artist[]>('/artists')
      .then((list) => setArtists(Array.isArray(list) ? list : []))
      .catch(() => setArtists([]));
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Logo size={52} style={styles.headerLogo} />
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>MusicYA</Text>
          <Text style={styles.welcome}>
            Hola, {user?.name} · {user?.role === 'artista' ? 'Artista' : 'Cliente'}
          </Text>
        </View>
        <TouchableOpacity style={styles.bell} onPress={onOpenNotifications} activeOpacity={0.85}>
          <Text style={styles.bellIcon}>🔔</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.logout} onPress={logout} activeOpacity={0.85}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
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

      <Text style={styles.sectionTitle}>Catálogo</Text>
      {artists === null ? (
        <Text style={styles.placeholder}>Cargando artistas…</Text>
      ) : artists.length === 0 ? (
        <Text style={styles.placeholder}>Aún no hay artistas registrados.</Text>
      ) : (
        artists.map((a) => {
          const rating = Number(a.rating_avg) || 0;
          return (
            <TouchableOpacity
              key={a.id}
              style={styles.artistCard}
              onPress={() => onOpenArtist(a.id)}
              activeOpacity={0.85}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(a.users?.name || '?').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.artistName}>{a.users?.name || 'Artista'}</Text>
                <Text style={styles.artistMeta}>
                  {[a.genre, a.city].filter(Boolean).join(' · ') || 'Sin datos'}
                </Text>
              </View>
              <View style={styles.artistRight}>
                <Text style={styles.rating}>{rating > 0 ? `⭐ ${rating.toFixed(1)}` : 'Nuevo'}</Text>
                {a.hourly_rate != null && <Text style={styles.price}>S/{a.hourly_rate}/h</Text>}
              </View>
            </TouchableOpacity>
          );
        })
      )}

      <Text style={styles.sectionTitle}>Módulos</Text>
      {FEATURES.map((f) => (
        <View key={f.title} style={styles.card}>
          <Text style={styles.cardIcon}>{f.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{f.title}</Text>
            <Text style={styles.cardDesc}>{f.desc}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  artistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...glow(),
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: { color: colors.text, fontSize: 18, fontFamily: fonts.display },
  artistName: { color: colors.text, fontSize: 16, fontFamily: fonts.bold },
  artistMeta: { color: colors.muted, fontSize: 13, marginTop: 2, fontFamily: fonts.regular },
  artistRight: { alignItems: 'flex-end' },
  rating: { color: colors.accent, fontSize: 14, fontFamily: fonts.bold },
  price: { color: colors.muted, fontSize: 12, marginTop: 2, fontFamily: fonts.regular },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardIcon: { fontSize: 28, marginRight: spacing.md },
  cardTitle: { color: colors.text, fontSize: 16, fontFamily: fonts.bold },
  cardDesc: { color: colors.muted, fontSize: 13, marginTop: 2, fontFamily: fonts.regular },
});
