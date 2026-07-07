import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../api/client';
import { colors, fonts, radius, spacing, glow } from '../theme';

// Indicadores de la hipótesis Lean Startup (los calcula el backend a partir de
// search_events). Esta pantalla los presenta para la sustentación de la tesis.
type Summary = {
  sessions: number;
  sessions_with_result: number;
  sessions_with_request: number;
  success_rate: number; // 0..1
  request_rate: number; // 0..1
  avg_time_to_find_ms: number | null;
  avg_time_to_find_s: number | null;
};

// Baseline del método tradicional (buscar por Facebook, WhatsApp, Google): ~12 min.
// Referencia del enfoque Lean para demostrar la reducción de tiempo (meta ≥ 40%).
const BASELINE_S = 12 * 60;

// Formatea segundos como "1 min 30 s" o "42 s"
function fmtTime(s: number | null): string {
  if (s == null) return '—';
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)} s`;
  const m = Math.floor(s / 60);
  const rest = Math.round(s % 60);
  return rest === 0 ? `${m} min` : `${m} min ${rest} s`;
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

export default function MetricsScreen({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await api.get<Summary>('/metrics/summary');
      setData(d);
    } catch (e: any) {
      setError(e.message || 'No se pudieron cargar los indicadores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Metas de la hipótesis (tabla de indicadores accionables)
  const timeOk = data?.avg_time_to_find_s != null && data.avg_time_to_find_s <= 180;
  const successOk = !!data && data.success_rate >= 0.8;
  const requestOk = !!data && data.request_rate >= 0.7;

  // Reducción de tiempo frente al método tradicional
  const reduction =
    data?.avg_time_to_find_s != null ? (BASELINE_S - data.avg_time_to_find_s) / BASELINE_S : null;
  const reductionOk = reduction != null && reduction >= 0.4;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backLink}>← Volver</Text>
      </TouchableOpacity>

      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Indicadores</Text>
          <Text style={styles.subtitle}>Eficiencia de búsqueda y contratación</Text>
        </View>
        <TouchableOpacity onPress={load} style={styles.refresh} activeOpacity={0.85}>
          <Text style={styles.refreshText}>Actualizar</Text>
        </TouchableOpacity>
      </View>

      {loading && !data ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginVertical: spacing.lg }} />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : data ? (
        <>
          {/* Métricas clave contra su meta */}
          <MetricCard
            icon="⏱️"
            label="Tiempo medio para encontrar un artista"
            value={fmtTime(data.avg_time_to_find_s)}
            goal="Meta ≤ 3 min"
            ok={timeOk}
          />
          <MetricCard
            icon="🎯"
            label="Tasa de éxito (sesiones con resultado)"
            value={data.sessions ? pct(data.success_rate) : '—'}
            goal="Meta ≥ 80%"
            ok={successOk}
          />
          <MetricCard
            icon="🤝"
            label="Tasa de solicitud (sesiones que contratan)"
            value={data.sessions ? pct(data.request_rate) : '—'}
            goal="Meta ≥ 70%"
            ok={requestOk}
          />

          {/* Comparación con el método tradicional */}
          <Text style={styles.sectionTitle}>Vs. método tradicional</Text>
          <View style={styles.funnel}>
            <CompareRow
              label="Método tradicional (redes, WhatsApp, Google)"
              seconds={BASELINE_S}
              maxSeconds={BASELINE_S}
              tone={colors.muted}
            />
            <CompareRow
              label="Con MusicYA"
              seconds={data.avg_time_to_find_s}
              maxSeconds={BASELINE_S}
              tone={colors.accent}
            />
            {reduction != null ? (
              <View style={[styles.reductionPill, reductionOk ? styles.goalOk : styles.goalPending]}>
                <Text style={[styles.reductionText, reductionOk ? styles.goalTextOk : styles.goalTextPending]}>
                  {reductionOk ? '✓ ' : ''}
                  {reduction >= 0 ? '▼' : '▲'} {Math.abs(Math.round(reduction * 100))}%{' '}
                  {reduction >= 0 ? 'menos tiempo' : 'más tiempo'} · Meta ≥ 40%
                </Text>
              </View>
            ) : (
              <Text style={styles.hint}>
                Aún sin tiempo medido: la barra de MusicYA aparecerá cuando alguien encuentre
                un artista usando el buscador.
              </Text>
            )}
          </View>

          {/* Embudo de conversión */}
          <Text style={styles.sectionTitle}>Embudo</Text>
          <View style={styles.funnel}>
            <FunnelRow label="Sesiones de búsqueda" value={data.sessions} total={data.sessions} tone={colors.cyan} />
            <FunnelRow
              label="Encontraron un artista"
              value={data.sessions_with_result}
              total={data.sessions}
              tone={colors.accent}
            />
            <FunnelRow
              label="Iniciaron una solicitud"
              value={data.sessions_with_request}
              total={data.sessions}
              tone={colors.pink}
            />
          </View>

          {data.sessions === 0 && (
            <Text style={styles.hint}>
              Aún no hay datos. Usa el buscador del inicio (abre artistas, aplica filtros y
              envía una solicitud) y vuelve a actualizar para ver los indicadores.
            </Text>
          )}

          <Text style={styles.foot}>
            Los datos se registran automáticamente en cada sesión de búsqueda (evento →
            artista abierto → solicitud enviada).
          </Text>
        </>
      ) : null}
    </ScrollView>
  );
}

function MetricCard({
  icon,
  label,
  value,
  goal,
  ok,
}: {
  icon: string;
  label: string;
  value: string;
  goal: string;
  ok: boolean;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardLabel}>{label}</Text>
        <View style={styles.cardValueRow}>
          <Text style={styles.cardValue}>{value}</Text>
          <View style={[styles.goalPill, ok ? styles.goalOk : styles.goalPending]}>
            <Text style={[styles.goalText, ok ? styles.goalTextOk : styles.goalTextPending]}>
              {ok ? '✓ ' : ''}
              {goal}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function CompareRow({
  label,
  seconds,
  maxSeconds,
  tone,
}: {
  label: string;
  seconds: number | null;
  maxSeconds: number;
  tone: string;
}) {
  const frac = seconds != null && maxSeconds > 0 ? Math.min(seconds / maxSeconds, 1) : 0;
  return (
    <View style={styles.funnelRow}>
      <View style={styles.funnelHead}>
        <Text style={styles.funnelLabel}>{label}</Text>
        <Text style={styles.funnelValue}>{fmtTime(seconds)}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.max(frac * 100, seconds ? 6 : 0)}%`, backgroundColor: tone }]} />
      </View>
    </View>
  );
}

function FunnelRow({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
}) {
  const frac = total > 0 ? value / total : 0;
  return (
    <View style={styles.funnelRow}>
      <View style={styles.funnelHead}>
        <Text style={styles.funnelLabel}>{label}</Text>
        <Text style={styles.funnelValue}>
          {value}
          {total > 0 ? ` · ${Math.round(frac * 100)}%` : ''}
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.max(frac * 100, value > 0 ? 6 : 0)}%`, backgroundColor: tone }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: 56, paddingBottom: 48 },
  backBtn: { marginBottom: spacing.md },
  backLink: { color: colors.accent, fontSize: 14, fontFamily: fonts.bold },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 26, fontFamily: fonts.display, letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 2, fontFamily: fonts.regular },
  refresh: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  refreshText: { color: colors.accent, fontSize: 13, fontFamily: fonts.bold },
  errorBox: { backgroundColor: '#3B1219', borderRadius: radius.md, padding: spacing.md },
  errorText: { color: '#FCA5A5', fontSize: 13 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardIcon: { fontSize: 28 },
  cardLabel: { color: colors.muted, fontSize: 13, fontFamily: fonts.medium },
  cardValueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4, flexWrap: 'wrap' },
  cardValue: { color: colors.text, fontSize: 26, fontFamily: fonts.display },
  goalPill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  goalOk: { backgroundColor: 'rgba(39,225,255,0.15)' },
  goalPending: { backgroundColor: colors.surfaceAlt },
  goalText: { fontSize: 11, fontFamily: fonts.bold },
  goalTextOk: { color: colors.cyan },
  goalTextPending: { color: colors.muted },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontFamily: fonts.display,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  funnel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...glow(),
  },
  funnelRow: { marginBottom: spacing.md },
  funnelHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  funnelLabel: { color: colors.text, fontSize: 14, fontFamily: fonts.medium },
  funnelValue: { color: colors.muted, fontSize: 13, fontFamily: fonts.bold },
  barTrack: { height: 10, borderRadius: 5, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  reductionPill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, marginTop: 4 },
  reductionText: { fontSize: 13, fontFamily: fonts.bold },
  hint: { color: colors.muted, fontSize: 13, fontFamily: fonts.regular, marginBottom: spacing.md },
  foot: { color: colors.muted, fontSize: 12, fontFamily: fonts.regular, fontStyle: 'italic' },
});
