import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../api/client';
import { recordView } from '../behavior';
import { useAuth } from '../auth/AuthContext';
import { Field, PrimaryButton } from '../components/form';
import VerifiedBadge from '../components/VerifiedBadge';
import { colors, fonts, spacing } from '../theme';

type PortfolioItem = { id: number; type: string; url: string; title: string | null };
type Rating = {
  id: number;
  score: number;
  comment: string | null;
  created_at: string;
  users: { name: string } | null;
};
type ArtistDetail = {
  id: number;
  user_id: number;
  genre: string | null;
  bio: string | null;
  hourly_rate: number | null;
  city: string | null;
  rating_avg: number | string | null;
  is_available: boolean;
  is_verified?: boolean;
  social_links?: Record<string, string> | null;
  verification_doc_url?: string | null;
  users: { name: string; email: string; phone: string | null } | null;
  portfolio: PortfolioItem[];
  ratings: Rating[];
};

type Verification = {
  is_verified: boolean;
  required: number;
  count: number;
  endorsements: { name: string; comment: string | null; created_at: string }[];
  has_social: boolean;
  has_document: boolean;
  voter_requirements?: string;
};

export default function ArtistDetailScreen({
  artistId,
  onBack,
  onOpenConversation,
  isGuest = false,
  onRequireLogin,
}: {
  artistId: number;
  onBack: () => void;
  onOpenConversation: (conversationId: number, title: string) => void;
  isGuest?: boolean;
  onRequireLogin?: () => void;
}) {
  const { user } = useAuth();
  const requireLogin = onRequireLogin ?? (() => {});
  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startingChat, setStartingChat] = useState(false);

  // Formulario de reserva
  const [eventType, setEventType] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('20:00');
  const [location, setLocation] = useState('');
  const [hours, setHours] = useState('2');
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingOk, setBookingOk] = useState<string | null>(null);

  // Verificación comunitaria
  const [verif, setVerif] = useState<Verification | null>(null);
  const [endorsing, setEndorsing] = useState(false);
  const [verifMsg, setVerifMsg] = useState<string | null>(null);

  function loadVerification() {
    api
      .get<Verification>(`/artists/${artistId}/verification`)
      .then(setVerif)
      .catch(() => setVerif(null));
  }

  useEffect(() => {
    api
      .get<ArtistDetail>(`/artists/${artistId}`)
      .then((a) => {
        setArtist(a);
        // Registra la vista para personalizar el Home (comportamiento local)
        recordView({
          id: a.id,
          name: a.users?.name || 'Artista',
          genre: a.genre,
          is_verified: a.is_verified,
        });
      })
      .catch((e) => setError(e.message || 'No se pudo cargar el artista'));
    loadVerification();
  }, [artistId]);

  const isOwnProfile = artist != null && user != null && artist.user_id === user.id;

  async function respaldar() {
    if (isGuest) return requireLogin();
    setVerifMsg(null);
    setEndorsing(true);
    try {
      await api.post(`/artists/${artistId}/endorse`, {});
      setVerifMsg('¡Respaldo registrado! Gracias por aumentar la confianza.');
      loadVerification();
      api.get<ArtistDetail>(`/artists/${artistId}`).then(setArtist).catch(() => {});
    } catch (e: any) {
      setVerifMsg(e.message || 'No se pudo registrar el respaldo');
    } finally {
      setEndorsing(false);
    }
  }

  async function abrirChat() {
    if (isGuest) return requireLogin();
    if (!artist) return;
    setStartingChat(true);
    try {
      const conv = await api.post<{ id: number }>('/chat', { artistId });
      onOpenConversation(conv.id, artist.users?.name || 'Artista');
    } catch (e: any) {
      setError(e.message || 'No se pudo iniciar el chat');
    } finally {
      setStartingChat(false);
    }
  }

  async function reservar() {
    if (isGuest) return requireLogin();
    setBookingError(null);
    setBookingOk(null);
    if (!date || !time) {
      setBookingError('Indica la fecha y la hora del evento');
      return;
    }
    const dt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(dt.getTime())) {
      setBookingError('Fecha u hora inválida (usa AAAA-MM-DD y HH:MM)');
      return;
    }
    if (dt.getTime() <= Date.now()) {
      setBookingError('La fecha del evento debe ser futura');
      return;
    }

    const payload: Record<string, unknown> = {
      artistId,
      event_date: dt.toISOString(),
    };
    if (eventType) payload.event_type = eventType.trim();
    if (location) payload.location = location.trim();
    const h = Number(hours);
    if (Number.isFinite(h) && h > 0) payload.duration_minutes = Math.round(h * 60);

    setBooking(true);
    try {
      await api.post('/bookings', payload);
      setBookingOk('¡Reserva enviada! El artista la confirmará pronto.');
      setEventType('');
      setLocation('');
    } catch (e: any) {
      setBookingError(e.message || 'No se pudo crear la reserva');
    } finally {
      setBooking(false);
    }
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backLink}>← Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!artist) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const rating = Number(artist.rating_avg) || 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backLink}>← Volver al catálogo</Text>
        </TouchableOpacity>

        {/* Cabecera */}
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(artist.users?.name || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{artist.users?.name || 'Artista'}</Text>
              {artist.is_verified && <VerifiedBadge />}
            </View>
            <Text style={styles.meta}>
              {[artist.genre, artist.city].filter(Boolean).join(' · ') || 'Sin datos'}
            </Text>
            <Text style={styles.ratingLine}>
              {rating > 0 ? `⭐ ${rating.toFixed(1)}` : 'Sin calificaciones'}
              {artist.hourly_rate != null ? `  ·  S/${artist.hourly_rate}/h` : ''}
            </Text>
          </View>
        </View>

        {!artist.is_available && (
          <View style={styles.unavailable}>
            <Text style={styles.unavailableText}>Este artista no está disponible por ahora</Text>
          </View>
        )}

        {artist.bio ? <Text style={styles.bio}>{artist.bio}</Text> : null}

        {!isOwnProfile && (
          <View style={{ marginTop: spacing.sm }}>
            <PrimaryButton
              title={isGuest ? '🔒 Inicia sesión para chatear' : '💬 Chatear'}
              onPress={abrirChat}
              loading={startingChat}
            />
          </View>
        )}

        {/* Verificación comunitaria */}
        {verif && (
          <View style={styles.verifCard}>
            <View style={styles.verifHead}>
              {verif.is_verified ? (
                <VerifiedBadge label />
              ) : (
                <Text style={styles.verifPending}>Sin verificar</Text>
              )}
              <Text style={styles.verifCount}>
                {verif.count}/{verif.required} respaldos
              </Text>
            </View>

            {!verif.is_verified && (
              <Text style={styles.verifHint}>
                Un artista se verifica al reunir {verif.required} respaldos de artistas ya
                verificados. {verif.voter_requirements}
              </Text>
            )}

            <View style={styles.verifChecks}>
              <Text style={[styles.verifChip, verif.has_social && styles.verifChipOn]}>
                {verif.has_social ? '✓' : '○'} Redes
              </Text>
              <Text style={[styles.verifChip, verif.has_document && styles.verifChipOn]}>
                {verif.has_document ? '✓' : '○'} Documento
              </Text>
            </View>

            {verif.endorsements.map((e, idx) => (
              <Text key={idx} style={styles.endorseItem}>
                ✓ Respaldado por <Text style={styles.endorseName}>{e.name}</Text>
                {e.comment ? ` — ${e.comment}` : ''}
              </Text>
            ))}

            {user?.role === 'artista' && !isOwnProfile && !verif.is_verified && (
              <TouchableOpacity
                style={styles.endorseBtn}
                onPress={respaldar}
                disabled={endorsing}
                activeOpacity={0.85}
              >
                <Text style={styles.endorseBtnText}>
                  {endorsing ? 'Respaldando…' : '✓ Respaldar a este artista'}
                </Text>
              </TouchableOpacity>
            )}

            {verifMsg && <Text style={styles.verifMsg}>{verifMsg}</Text>}
          </View>
        )}

        {/* Portafolio */}
        {artist.portfolio.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Portafolio</Text>
            {artist.portfolio.map((p) => (
              <View key={p.id} style={styles.listCard}>
                <Text style={styles.portfolioType}>{p.type.toUpperCase()}</Text>
                <Text style={styles.portfolioTitle}>{p.title || p.url}</Text>
              </View>
            ))}
          </>
        )}

        {/* Calificaciones (reseñas recibidas tras contrataciones finalizadas) */}
        {artist.ratings.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Calificaciones</Text>
            {artist.ratings.map((r) => (
              <View key={r.id} style={styles.listCard}>
                <Text style={styles.ratingStars}>{'⭐'.repeat(r.score)}</Text>
                {r.comment ? <Text style={styles.ratingComment}>{r.comment}</Text> : null}
                <Text style={styles.ratingAuthor}>— {r.users?.name || 'Anónimo'}</Text>
              </View>
            ))}
          </>
        )}

        {/* Reserva */}
        <Text style={styles.sectionTitle}>Reservar</Text>
        {isOwnProfile ? (
          <Text style={styles.placeholder}>Este es tu propio perfil; no puedes reservarte.</Text>
        ) : isGuest ? (
          <View>
            <Text style={styles.placeholder}>Inicia sesión para contratar a este artista.</Text>
            <View style={{ marginTop: spacing.sm }}>
              <PrimaryButton title="🔒 Iniciar sesión" onPress={requireLogin} />
            </View>
          </View>
        ) : (
          <View>
            {bookingOk && (
              <View style={styles.okBox}>
                <Text style={styles.okText}>{bookingOk}</Text>
              </View>
            )}
            {bookingError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{bookingError}</Text>
              </View>
            )}
            <Field label="Tipo de evento" value={eventType} onChangeText={setEventType} placeholder="Boda, fiesta, concierto…" />
            <Field label="Fecha (AAAA-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-08-15" autoCapitalize="none" />
            <Field label="Hora (HH:MM)" value={time} onChangeText={setTime} placeholder="20:00" />
            <Field label="Duración (horas)" value={hours} onChangeText={setHours} placeholder="2" keyboardType="numeric" />
            <Field label="Lugar" value={location} onChangeText={setLocation} placeholder="Dirección o local del evento" />
            <PrimaryButton title="Solicitar reserva" onPress={reservar} loading={booking} disabled={!artist.is_available} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: 56, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  backBtn: { marginBottom: spacing.md },
  backLink: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: { color: colors.text, fontSize: 24, fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: colors.text, fontSize: 22, fontWeight: '800', flexShrink: 1 },
  meta: { color: colors.muted, fontSize: 14, marginTop: 2 },
  verifCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  verifHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  verifPending: { color: colors.muted, fontSize: 13, fontFamily: fonts.bold, textTransform: 'uppercase' },
  verifCount: { color: colors.cyan, fontSize: 13, fontFamily: fonts.bold },
  verifHint: { color: colors.muted, fontSize: 12, marginTop: spacing.sm },
  verifChecks: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  verifChip: { color: colors.muted, fontSize: 12 },
  verifChipOn: { color: colors.cyan, fontFamily: fonts.medium },
  endorseItem: { color: colors.text, fontSize: 13, marginTop: spacing.sm },
  endorseName: { fontFamily: fonts.bold },
  endorseBtn: {
    marginTop: spacing.md,
    borderWidth: 2,
    borderColor: colors.cyan,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  endorseBtnText: { color: colors.cyan, fontSize: 14, fontFamily: fonts.bold },
  verifMsg: { color: colors.cyan, fontSize: 13, marginTop: spacing.sm },
  ratingLine: { color: colors.accent, fontSize: 14, fontWeight: '700', marginTop: 4 },
  unavailable: { backgroundColor: '#3B2A12', borderRadius: 10, padding: spacing.md, marginBottom: spacing.md },
  unavailableText: { color: colors.accent, fontSize: 13 },
  bio: { color: colors.text, fontSize: 15, lineHeight: 22, marginBottom: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.md },
  placeholder: { color: colors.muted, fontSize: 14 },
  listCard: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm },
  portfolioType: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  portfolioTitle: { color: colors.text, fontSize: 14, marginTop: 2 },
  ratingStars: { fontSize: 14 },
  ratingComment: { color: colors.text, fontSize: 14, marginTop: 4 },
  ratingAuthor: { color: colors.muted, fontSize: 12, marginTop: 4 },
  okBox: { backgroundColor: '#12331E', borderRadius: 10, padding: spacing.md, marginBottom: spacing.md },
  okText: { color: '#86EFAC', fontSize: 13 },
  errorBox: { backgroundColor: '#3B1219', borderRadius: 10, padding: spacing.md, marginBottom: spacing.md },
  errorText: { color: '#FCA5A5', fontSize: 13 },
});
