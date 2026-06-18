import { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors, spacing } from '../theme';

type Booking = {
  id: number;
  event_type: string | null;
  event_date: string;
  event_end: string | null;
  location: string | null;
  status: 'pendiente' | 'confirmada' | 'pagada' | 'cancelada' | 'finalizada';
  total: number | null;
  artist_profiles: { genre: string | null; city: string | null; users: { name: string } | null } | null;
  users: { name: string } | null; // cliente
};

const STATUS_COLOR: Record<Booking['status'], string> = {
  pendiente: colors.accent,
  confirmada: '#60A5FA',
  pagada: '#86EFAC',
  cancelada: '#FCA5A5',
  finalizada: colors.muted,
};

// Transiciones que el rol puede aplicar según el estado actual (refleja el backend)
function actionsFor(
  role: string | undefined,
  status: Booking['status']
): { label: string; to: Booking['status']; danger?: boolean }[] {
  if (status === 'cancelada' || status === 'finalizada') return [];
  if (role === 'artista') {
    if (status === 'pendiente') {
      return [
        { label: 'Confirmar', to: 'confirmada' },
        { label: 'Cancelar', to: 'cancelada', danger: true },
      ];
    }
    // confirmada o pagada
    return [
      { label: 'Finalizar', to: 'finalizada' },
      { label: 'Cancelar', to: 'cancelada', danger: true },
    ];
  }
  // cliente
  return [{ label: 'Cancelar', to: 'cancelada', danger: true }];
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function BookingsScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.get<Booking[]>('/bookings');
      setBookings(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || 'No se pudieron cargar las reservas');
      setBookings([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(id: number, to: Booking['status']) {
    setActioningId(id);
    setError(null);
    try {
      await api.patch(`/bookings/${id}/status`, { status: to });
      await load();
    } catch (e: any) {
      setError(e.message || 'No se pudo actualizar la reserva');
    } finally {
      setActioningId(null);
    }
  }

  const isArtist = user?.role === 'artista';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backLink}>← Volver</Text>
      </TouchableOpacity>

      <View style={styles.headerRow}>
        <Text style={styles.title}>Mis reservas</Text>
        <TouchableOpacity onPress={load} style={styles.refresh}>
          <Text style={styles.refreshText}>Actualizar</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {bookings === null ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: spacing.lg }} />
      ) : bookings.length === 0 ? (
        <Text style={styles.placeholder}>
          {isArtist ? 'Aún no has recibido solicitudes de reserva.' : 'Aún no tienes reservas.'}
        </Text>
      ) : (
        bookings.map((b) => {
          const counterpart = isArtist
            ? b.users?.name || 'Cliente'
            : b.artist_profiles?.users?.name || 'Artista';
          const actions = actionsFor(user?.role, b.status);
          return (
            <View key={b.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.eventType}>{b.event_type || 'Evento'}</Text>
                <View style={[styles.statusPill, { borderColor: STATUS_COLOR[b.status] }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLOR[b.status] }]}>{b.status}</Text>
                </View>
              </View>

              <Text style={styles.counterpart}>
                {isArtist ? 'Cliente' : 'Artista'}: {counterpart}
              </Text>
              <Text style={styles.detail}>📅 {formatWhen(b.event_date)}</Text>
              {b.location ? <Text style={styles.detail}>📍 {b.location}</Text> : null}
              {b.total != null ? <Text style={styles.detail}>💰 S/{b.total}</Text> : null}

              {actions.length > 0 && (
                <View style={styles.actions}>
                  {actioningId === b.id ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    actions.map((a) => (
                      <TouchableOpacity
                        key={a.to}
                        style={[styles.actionBtn, a.danger && styles.actionDanger]}
                        onPress={() => changeStatus(b.id, a.to)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.actionText, a.danger && styles.actionTextDanger]}>
                          {a.label}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: 56, paddingBottom: 48 },
  backBtn: { marginBottom: spacing.md },
  backLink: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', flex: 1 },
  refresh: { backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20 },
  refreshText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  placeholder: { color: colors.muted, fontSize: 14, marginTop: spacing.lg },
  errorBox: { backgroundColor: '#3B1219', borderRadius: 10, padding: spacing.md, marginBottom: spacing.md },
  errorText: { color: '#FCA5A5', fontSize: 13 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.md, marginBottom: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  eventType: { color: colors.text, fontSize: 17, fontWeight: '700', flex: 1 },
  statusPill: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  counterpart: { color: colors.text, fontSize: 14, marginBottom: 4 },
  detail: { color: colors.muted, fontSize: 13, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: 8 },
  actionText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  actionDanger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#FCA5A5' },
  actionTextDanger: { color: '#FCA5A5' },
});
