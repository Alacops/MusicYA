import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from './src/api/client';
import { colors, spacing } from './src/theme';

// Módulos del MVP, alineados con los objetivos específicos del plan de tesis.
const FEATURES = [
  { icon: '🎵', title: 'Perfiles de artistas', desc: 'Portafolio, multimedia y calificaciones' },
  { icon: '📍', title: 'Búsqueda geolocalizada', desc: 'Filtros y disponibilidad en tiempo real' },
  { icon: '💬', title: 'Chat y notificaciones', desc: 'Mensajería instantánea y chatbot' },
  { icon: '📅', title: 'Reservas y pagos QR', desc: 'Validación de disponibilidad y pagos' },
  { icon: '⭐', title: 'Recomendaciones', desc: 'Sugerencias inteligentes e historial' },
];

// Forma del artista que devuelve GET /api/artists
type Artist = {
  id: number;
  genre: string | null;
  city: string | null;
  hourly_rate: number | null;
  rating_avg: number | string | null;
  is_available: boolean;
  users: { name: string } | null;
};

export default function App() {
  const [status, setStatus] = useState<string>('Conectando con el backend…');
  const [artists, setArtists] = useState<Artist[] | null>(null);

  useEffect(() => {
    // Healthcheck de la API
    api
      .get<{ status: string }>('/')
      .then((r) => setStatus(`Backend conectado · ${r.status}`))
      .catch((e) => setStatus(`Sin conexión: ${e.message}`));

    // Catálogo real desde la BD (ya viene ordenado por calificación)
    api
      .get<Artist[]>('/artists')
      .then((list) => setArtists(Array.isArray(list) ? list : []))
      .catch(() => setArtists([]));
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>MusicYA</Text>
        <Text style={styles.tagline}>
          Contratación y promoción de artistas musicales en tiempo real
        </Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>{status}</Text>
        </View>

        {artists !== null && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {artists.length} artista{artists.length === 1 ? '' : 's'} en el catálogo
            </Text>
          </View>
        )}

        {/* Catálogo de artistas (datos reales del backend) */}
        <Text style={styles.sectionTitle}>Catálogo</Text>
        {artists === null ? (
          <Text style={styles.placeholder}>Cargando artistas…</Text>
        ) : artists.length === 0 ? (
          <Text style={styles.placeholder}>Aún no hay artistas registrados.</Text>
        ) : (
          artists.map((a) => {
            const rating = Number(a.rating_avg) || 0;
            return (
              <View key={a.id} style={styles.artistCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(a.users?.name || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.artistName}>{a.users?.name || 'Artista'}</Text>
                  <Text style={styles.artistMeta}>
                    {[a.genre, a.city].filter(Boolean).join(' · ') || 'Sin datos'}
                  </Text>
                </View>
                <View style={styles.artistRight}>
                  <Text style={styles.rating}>{rating > 0 ? `⭐ ${rating.toFixed(1)}` : 'Nuevo'}</Text>
                  {a.hourly_rate != null && (
                    <Text style={styles.price}>S/{a.hourly_rate}/h</Text>
                  )}
                </View>
              </View>
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
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 64 },
  brand: { color: colors.primary, fontSize: 40, fontWeight: '800' },
  tagline: { color: colors.muted, fontSize: 15, marginTop: spacing.sm, marginBottom: spacing.lg },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginBottom: spacing.lg,
  },
  badgeText: { color: colors.accent, fontSize: 13 },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  placeholder: { color: colors.muted, fontSize: 14, marginBottom: spacing.lg },
  artistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: { color: colors.text, fontSize: 18, fontWeight: '800' },
  artistName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  artistMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  artistRight: { alignItems: 'flex-end' },
  rating: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  price: { color: colors.muted, fontSize: 12, marginTop: 2 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardIcon: { fontSize: 28, marginRight: spacing.md },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  cardDesc: { color: colors.muted, fontSize: 13, marginTop: 2 },
});
