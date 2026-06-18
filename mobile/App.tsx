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

export default function App() {
  const [status, setStatus] = useState<string>('Conectando con el backend…');
  const [artistCount, setArtistCount] = useState<number | null>(null);

  useEffect(() => {
    // Healthcheck de la API
    api
      .get<{ status: string }>('/')
      .then((r) => setStatus(`Backend conectado · ${r.status}`))
      .catch((e) => setStatus(`Sin conexión: ${e.message}`));

    // Dato real desde la BD: artistas disponibles
    api
      .get<unknown[]>('/artists')
      .then((list) => setArtistCount(Array.isArray(list) ? list.length : 0))
      .catch(() => setArtistCount(null));
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

        {artistCount !== null && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {artistCount} artista{artistCount === 1 ? '' : 's'} en el catálogo
            </Text>
          </View>
        )}

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
