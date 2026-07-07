import { Fragment, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../api/client';
import { colors, fonts, radius, spacing, glow } from '../theme';

type Status = 'pendiente' | 'confirmada' | 'pagada' | 'cancelada' | 'finalizada';

type Booking = {
  id: number;
  status: Status;
  total: number | null;
  event_type: string | null;
  event_date: string;
  artist_profiles: { users: { name: string } | null } | null;
  users: { name: string } | null; // cliente
};

const STEPS = ['Solicitud', 'Confirmación', 'Pago'];

// Prioridad de la reserva a mostrar según el rol: primero la que el usuario puede
// accionar (cliente→pagar la confirmada; artista→confirmar la pendiente).
const RANK: Record<'cliente' | 'artista', Partial<Record<Status, number>>> = {
  cliente: { confirmada: 0, pendiente: 1, pagada: 2 },
  artista: { pendiente: 0, confirmada: 1, pagada: 2 },
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Rastreador del proceso de contratación, en primer plano hasta confirmar el pago.
// Se refresca solo cada 7 s para reflejar en vivo lo que hace la otra parte.
export default function BookingTracker({
  role,
  enabled,
  onPay,
  onOpenBookings,
}: {
  role: string | undefined;
  enabled: boolean;
  onPay: (bookingId: number) => void;
  onOpenBookings: () => void;
}) {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [dismissed, setDismissed] = useState<number[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = () =>
      api
        .get<Booking[]>('/bookings')
        .then((d) => {
          if (alive) setBookings(Array.isArray(d) ? d : []);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 7000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [enabled]);

  if (!enabled || !bookings) return null;

  const isArtist = role === 'artista';
  const rank = RANK[isArtist ? 'artista' : 'cliente'];
  const active = bookings
    .filter((b) => ['pendiente', 'confirmada', 'pagada'].includes(b.status) && !dismissed.includes(b.id))
    .sort((a, b) => {
      const ra = rank[a.status] ?? 9;
      const rb = rank[b.status] ?? 9;
      if (ra !== rb) return ra - rb;
      return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
    })[0];

  if (!active) return null;

  const doneCount = active.status === 'pendiente' ? 1 : active.status === 'confirmada' ? 2 : 3;
  const counterpart = isArtist
    ? active.users?.name || 'Cliente'
    : active.artist_profiles?.users?.name || 'Artista';

  let statusText = '';
  let primary: { label: string; onPress: () => void } | null = null;
  let secondary: { label: string; onPress: () => void } | null = null;

  if (active.status === 'pendiente') {
    if (isArtist) {
      statusText = `${counterpart} quiere contratarte. Revisa y confirma la solicitud.`;
      primary = { label: 'Revisar y confirmar', onPress: onOpenBookings };
    } else {
      statusText = 'Solicitud enviada. Esperando que el artista la confirme…';
      secondary = { label: 'Ver reserva', onPress: onOpenBookings };
    }
  } else if (active.status === 'confirmada') {
    if (isArtist) {
      statusText = 'Confirmada. Esperando el pago del cliente…';
      secondary = { label: 'Ver reserva', onPress: onOpenBookings };
    } else {
      statusText = '¡El artista confirmó! Realiza el pago para asegurar tu reserva.';
      primary = {
        label: `💳 Pagar ahora${active.total != null ? ` · S/${active.total}` : ''}`,
        onPress: () => onPay(active.id),
      };
    }
  } else {
    // pagada
    statusText = isArtist
      ? '✓ Pago recibido. ¡Contratación cerrada!'
      : '✓ ¡Pago confirmado! Tu contratación está completa.';
    secondary = { label: 'Cerrar', onPress: () => setDismissed((p) => [...p, active.id]) };
  }

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Proceso de contratación</Text>
        <View style={styles.livePill}>
          <Text style={styles.liveText}>● EN VIVO</Text>
        </View>
      </View>
      <Text style={styles.sub}>
        {isArtist ? 'Cliente' : 'Artista'}: <Text style={styles.subStrong}>{counterpart}</Text>
        {'  ·  '}
        {active.event_type || 'Evento'} · {formatWhen(active.event_date)}
      </Text>

      {/* Rastreador de 3 pasos */}
      <View style={styles.stepsRow}>
        {STEPS.map((label, i) => {
          const done = i < doneCount;
          const current = i === doneCount;
          return (
            <Fragment key={label}>
              <View style={styles.stepCol}>
                <View style={[styles.node, done && styles.nodeDone, current && styles.nodeCurrent]}>
                  <Text style={[styles.nodeText, (done || current) && styles.nodeTextOn]}>
                    {done ? '✓' : i + 1}
                  </Text>
                </View>
                <Text style={[styles.stepLabel, (done || current) && styles.stepLabelOn]}>{label}</Text>
              </View>
              {i < 2 && <View style={[styles.line, i + 1 < doneCount && styles.lineOn]} />}
            </Fragment>
          );
        })}
      </View>

      <Text style={styles.statusText}>{statusText}</Text>

      <View style={styles.actions}>
        {primary && (
          <TouchableOpacity style={styles.primaryBtn} onPress={primary.onPress} activeOpacity={0.85}>
            <Text style={styles.primaryText}>{primary.label}</Text>
          </TouchableOpacity>
        )}
        {secondary && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={secondary.onPress} activeOpacity={0.85}>
            <Text style={styles.secondaryText}>{secondary.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'rgba(214,51,255,0.5)',
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...glow(colors.magenta),
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 15, fontFamily: fonts.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  livePill: {
    backgroundColor: 'rgba(39,225,255,0.15)',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveText: { color: colors.cyan, fontSize: 10, fontFamily: fonts.bold, letterSpacing: 0.5 },
  sub: { color: colors.muted, fontSize: 12, marginTop: 4, fontFamily: fonts.regular },
  subStrong: { color: colors.text, fontFamily: fonts.bold },
  stepsRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.md, marginBottom: spacing.sm },
  stepCol: { width: 88, alignItems: 'center' },
  node: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  nodeCurrent: { borderColor: colors.cyan, backgroundColor: 'rgba(39,225,255,0.15)' },
  nodeText: { color: colors.muted, fontSize: 13, fontFamily: fonts.bold },
  nodeTextOn: { color: colors.text },
  stepLabel: { color: colors.muted, fontSize: 11, marginTop: 6, fontFamily: fonts.medium, textAlign: 'center' },
  stepLabelOn: { color: colors.text },
  line: { flex: 1, height: 2, backgroundColor: colors.border, marginTop: 13 },
  lineOn: { backgroundColor: colors.accent },
  statusText: { color: colors.text, fontSize: 13, marginTop: spacing.sm, fontFamily: fonts.regular },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.magenta,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontSize: 14, fontFamily: fonts.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  secondaryText: { color: colors.accent, fontSize: 13, fontFamily: fonts.bold },
});
