import { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors, fonts, radius, spacing } from '../theme';

type Booking = {
  id: number;
  event_type: string | null;
  event_date: string;
  event_end: string | null;
  location: string | null;
  status: 'pendiente' | 'confirmada' | 'pagada' | 'cancelada' | 'finalizada';
  total: number | null;
  reviewed_by_me?: boolean;
  artist_profiles: {
    genre: string | null;
    city: string | null;
    rating_avg: number | string | null;
    users: { name: string } | null;
  } | null;
  users: { name: string; reputation_avg?: number | string | null } | null; // cliente
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
        { label: 'Rechazar', to: 'cancelada', danger: true },
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

export default function BookingsScreen({
  onBack,
  onPay,
}: {
  onBack: () => void;
  onPay: (bookingId: number) => void;
}) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<number | null>(null);

  // Calificación bilateral (una reserva a la vez)
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [rScore, setRScore] = useState(0);
  const [rComment, setRComment] = useState('');
  const [rBusy, setRBusy] = useState(false);
  const [rErr, setRErr] = useState<string | null>(null);

  function openReview(id: number) {
    setReviewingId(id);
    setRScore(0);
    setRComment('');
    setRErr(null);
  }

  async function submitReview(id: number) {
    if (rScore < 1) {
      setRErr('Elige de 1 a 5 estrellas');
      return;
    }
    setRBusy(true);
    setRErr(null);
    try {
      await api.post(`/bookings/${id}/review`, {
        score: rScore,
        comment: rComment.trim() || undefined,
      });
      setReviewingId(null);
      await load();
    } catch (e: any) {
      setRErr(e.message || 'No se pudo enviar la calificación');
    } finally {
      setRBusy(false);
    }
  }

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
          // El cliente puede pagar una reserva confirmada (aún no pagada)
          const canPay = !isArtist && b.status === 'confirmada';
          // Reputación de la contraparte (bilateral): artista ve la del cliente y viceversa
          const counterpartRep = isArtist
            ? Number(b.users?.reputation_avg) || 0
            : Number(b.artist_profiles?.rating_avg) || 0;
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
                {counterpartRep > 0 ? `  ·  ⭐ ${counterpartRep.toFixed(1)}` : ''}
              </Text>
              <Text style={styles.detail}>📅 {formatWhen(b.event_date)}</Text>
              {b.location ? <Text style={styles.detail}>📍 {b.location}</Text> : null}
              {b.total != null ? <Text style={styles.detail}>💰 S/{b.total}</Text> : null}

              {(actions.length > 0 || canPay) && (
                <View style={styles.actions}>
                  {actioningId === b.id ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <>
                    {canPay && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.payBtn]}
                        onPress={() => onPay(b.id)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.actionText}>💳 Pagar</Text>
                      </TouchableOpacity>
                    )}
                    {actions.map((a) => (
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
                    ))}
                    </>
                  )}
                </View>
              )}

              {/* Calificación bilateral: disponible una vez finalizado el evento */}
              {b.status === 'finalizada' && (
                <View style={styles.reviewWrap}>
                  {b.reviewed_by_me ? (
                    <Text style={styles.reviewedNote}>
                      ✓ Ya calificaste a {isArtist ? 'este cliente' : 'este artista'}
                    </Text>
                  ) : reviewingId === b.id ? (
                    <View>
                      <View style={styles.starRow}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <TouchableOpacity key={n} onPress={() => setRScore(n)} activeOpacity={0.7}>
                            <Text style={styles.star}>{n <= rScore ? '⭐' : '☆'}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TextInput
                        style={styles.commentInput}
                        value={rComment}
                        onChangeText={setRComment}
                        placeholder="Comentario (opcional)"
                        placeholderTextColor={colors.muted}
                      />
                      {rErr && <Text style={styles.reviewErr}>{rErr}</Text>}
                      <View style={styles.actions}>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => submitReview(b.id)}
                          disabled={rBusy}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.actionText}>{rBusy ? 'Enviando…' : 'Enviar'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionDanger]}
                          onPress={() => setReviewingId(null)}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.actionText, styles.actionTextDanger]}>Cancelar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rateBtn]}
                      onPress={() => openReview(b.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.actionText}>
                        ⭐ Calificar a {isArtist ? 'cliente' : 'artista'}
                      </Text>
                    </TouchableOpacity>
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
  payBtn: { backgroundColor: '#15803D' },
  actionText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  actionDanger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#FCA5A5' },
  actionTextDanger: { color: '#FCA5A5' },
  reviewWrap: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  reviewedNote: { color: colors.cyan, fontSize: 13, fontFamily: fonts.medium },
  rateBtn: { alignSelf: 'flex-start', backgroundColor: colors.magenta },
  starRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  star: { fontSize: 30 },
  commentInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  reviewErr: { color: '#FCA5A5', fontSize: 12, marginTop: spacing.sm },
});
