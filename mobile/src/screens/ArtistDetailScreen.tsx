import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../api/client';
import { recordView } from '../behavior';
import { recordRequestInitiated } from '../metrics';
import { useAuth } from '../auth/AuthContext';
import { Field, PrimaryButton } from '../components/form';
import GlassButton from '../components/GlassButton';
import PortfolioVideo from '../components/PortfolioVideo';
import VerifiedBadge from '../components/VerifiedBadge';
import { colors, fonts, radius, spacing } from '../theme';

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
  district?: string | null;
  event_types?: string[] | null;
  rating_avg: number | string | null;
  is_available: boolean;
  avatar_url?: string | null;
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

  // Despliegues de detalle (se muestran solo al hacer clic) + resaltado por hover (web)
  const [showRatings, setShowRatings] = useState(false);
  const [showEndorsers, setShowEndorsers] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [hoverRating, setHoverRating] = useState(false);
  const [hoverVerif, setHoverVerif] = useState(false);

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
      recordRequestInitiated(artistId);
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
  const rate = artist.hourly_rate != null ? Number(artist.hourly_rate) : null;
  const hoursNum = Number(hours);
  const estTotal =
    rate != null && Number.isFinite(hoursNum) && hoursNum > 0 ? rate * hoursNum : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backLink}>← Volver al catálogo</Text>
        </TouchableOpacity>

        {/* Cabecera */}
        <View style={styles.headerRow}>
          {artist.avatar_url ? (
            <Image source={{ uri: artist.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(artist.users?.name || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{artist.users?.name || 'Artista'}</Text>
              {artist.is_verified && <VerifiedBadge />}
            </View>
            <Text style={styles.meta}>
              {[artist.genre, artist.district || artist.city].filter(Boolean).join(' · ') || 'Sin datos'}
            </Text>
          </View>
        </View>

        {/* Tipos de evento que atiende */}
        {artist.event_types && artist.event_types.length > 0 && (
          <View style={styles.eventTypesWrap}>
            <Text style={styles.eventTypesLabel}>Ideal para</Text>
            <View style={styles.eventTypesRow}>
              {artist.event_types.map((e) => (
                <View key={e} style={styles.eventTag}>
                  <Text style={styles.eventTagText}>{e}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Precio (debajo de la foto) y Calificación al lado */}
        <View style={styles.chipsRow}>
          <View style={styles.priceChip}>
            <Text style={styles.priceValue}>{rate != null ? `S/${rate}/h` : '—'}</Text>
            <Text style={styles.priceLabel}>PRECIO</Text>
          </View>

          <Pressable
            onPress={() => setShowRatings((v) => !v)}
            onHoverIn={() => setHoverRating(true)}
            onHoverOut={() => setHoverRating(false)}
            style={[styles.statChip, (hoverRating || showRatings) && styles.statChipActive]}
            accessibilityRole="button"
          >
            <Text style={styles.statValue}>
              {rating > 0 ? `⭐ ${rating.toFixed(1)}` : '⭐ —'}
            </Text>
            <Text style={styles.statLabel}>
              CALIFICACIÓN {showRatings ? '▾' : '▸'}
            </Text>
          </Pressable>
        </View>

        {/* Detalle de calificaciones (visible solo al hacer clic en el chip) */}
        {showRatings && (
          artist.ratings.length > 0 ? (
            <View style={styles.ratingCard}>
              <View style={styles.ratingHead}>
                <Text style={styles.ratingHeadTitle}>Calificaciones</Text>
                <Text style={styles.ratingAvgBadge}>
                  ⭐ {rating.toFixed(1)} · {artist.ratings.length}{' '}
                  {artist.ratings.length === 1 ? 'reseña' : 'reseñas'}
                </Text>
              </View>
              {artist.ratings.map((r) => (
                <View key={r.id} style={styles.reviewRow}>
                  <View style={styles.reviewTop}>
                    <Text style={styles.ratingStars}>
                      {'⭐'.repeat(r.score)}
                      <Text style={styles.starEmpty}>{'☆'.repeat(5 - r.score)}</Text>
                    </Text>
                    <Text style={styles.reviewDate}>
                      {new Date(r.created_at).toLocaleDateString('es-PE')}
                    </Text>
                  </View>
                  {r.comment ? <Text style={styles.ratingComment}>{r.comment}</Text> : null}
                  <Text style={styles.ratingAuthor}>— {r.users?.name || 'Anónimo'}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.ratingCard}>
              <Text style={styles.placeholder}>
                Aún no tiene calificaciones. Las reseñas aparecen cuando un cliente finaliza
                una contratación.
              </Text>
            </View>
          )
        )}

        {!artist.is_available && (
          <View style={styles.unavailable}>
            <Text style={styles.unavailableText}>Este artista no está disponible por ahora</Text>
          </View>
        )}

        {artist.bio ? <Text style={styles.bio}>{artist.bio}</Text> : null}

        {isOwnProfile ? (
          <Text style={styles.placeholder}>Este es tu propio perfil; no puedes contratarte.</Text>
        ) : (
          <>
            {/* Acciones: Chatear y Contratar (Contratar despliega el formulario) */}
            <View style={styles.actionRow}>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  title={isGuest ? '🔒 Chatear' : '💬 Chatear'}
                  onPress={abrirChat}
                  loading={startingChat}
                />
              </View>
              <GlassButton
                title={isGuest ? '🔒 Contratar' : showBooking ? 'Ocultar' : '🎫 Contratar'}
                onPress={() => (isGuest ? requireLogin() : setShowBooking((v) => !v))}
                disabled={!artist.is_available}
                style={styles.contratarBtn}
              />
            </View>

            {/* Formulario de reserva: aparece solo al pulsar "Contratar" */}
            {showBooking && !isGuest && (
              <View style={styles.bookingForm}>
                <View style={styles.priceBanner}>
                  <View>
                    <Text style={styles.priceBannerLabel}>Total a pagar</Text>
                    {rate != null && (
                      <Text style={styles.priceBannerHint}>
                        {Number.isFinite(hoursNum) && hoursNum > 0
                          ? `${hoursNum} h × S/${rate}/h`
                          : `Tarifa S/${rate}/h`}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.priceBannerValue}>
                    {estTotal != null
                      ? `S/${estTotal}`
                      : rate != null
                      ? `S/${rate}/h`
                      : 'A convenir'}
                  </Text>
                </View>
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
          </>
        )}

        {/* Verificación comunitaria */}
        {verif && (
          <View style={styles.verifCard}>
            <Pressable
              onPress={() => setShowEndorsers((v) => !v)}
              onHoverIn={() => setHoverVerif(true)}
              onHoverOut={() => setHoverVerif(false)}
              style={[styles.verifHead, (hoverVerif || showEndorsers) && styles.verifHeadActive]}
              accessibilityRole="button"
            >
              {verif.is_verified ? (
                <VerifiedBadge label />
              ) : (
                <Text style={styles.verifPending}>Aún por verificar</Text>
              )}
              <Text style={styles.verifCount}>
                {verif.count}/{verif.required} respaldos {showEndorsers ? '▾' : '▸'}
              </Text>
            </Pressable>

            {!verif.is_verified && (
              <Text style={styles.verifHint}>
                Un artista se verifica al reunir {verif.required} respaldos de artistas ya
                verificados. {verif.voter_requirements}
              </Text>
            )}

            {/* Detalle de quién respalda: visible solo al hacer clic en el encabezado */}
            {showEndorsers && (
              verif.endorsements.length > 0 ? (
                verif.endorsements.map((e, idx) => (
                  <Text key={idx} style={styles.endorseItem}>
                    ✓ Respaldado por <Text style={styles.endorseName}>{e.name}</Text>
                    {e.comment ? ` — ${e.comment}` : ''}
                  </Text>
                ))
              ) : (
                <Text style={styles.endorseItem}>Todavía no tiene respaldos de artistas verificados.</Text>
              )
            )}

            {user?.role === 'artista' && !isOwnProfile && !verif.is_verified && (
              <GlassButton
                title={endorsing ? 'Respaldando…' : '✓ Respaldar a este artista'}
                onPress={respaldar}
                disabled={endorsing}
                size="sm"
                style={styles.endorseBtn}
              />
            )}

            {verifMsg && <Text style={styles.verifMsg}>{verifMsg}</Text>}
          </View>
        )}

        {/* Portafolio (galería multimedia) */}
        {artist.portfolio.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Portafolio</Text>
            {artist.portfolio.map((p) => {
              if (p.type === 'imagen') {
                return (
                  <View key={p.id} style={styles.mediaCard}>
                    <Image source={{ uri: p.url }} style={styles.mediaImage} resizeMode="cover" />
                    {p.title ? <Text style={styles.mediaCaption}>{p.title}</Text> : null}
                  </View>
                );
              }
              if (p.type === 'video') {
                return <PortfolioVideo key={p.id} url={p.url} title={p.title} />;
              }
              // audio u otros: fila con enlace reproducible
              return (
                <TouchableOpacity
                  key={p.id}
                  style={styles.listCard}
                  onPress={() => Linking.openURL(p.url)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.portfolioType}>♪ {p.type.toUpperCase()}</Text>
                  <Text style={styles.portfolioTitle}>{p.title || 'Escuchar audio'}</Text>
                </TouchableOpacity>
              );
            })}
          </>
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
  eventTypesWrap: { marginBottom: spacing.md },
  eventTypesLabel: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  eventTypesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  eventTag: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  eventTagText: { color: colors.text, fontSize: 13, fontFamily: fonts.medium },
  chipsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  priceChip: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  priceValue: { color: colors.accent, fontSize: 18, fontWeight: '800' },
  priceLabel: { color: colors.accent, fontSize: 11, fontFamily: fonts.bold, letterSpacing: 0.5, marginTop: 3 },
  statChip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  statChipActive: { borderColor: colors.accent, backgroundColor: colors.surfaceAlt },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 11, fontFamily: fonts.bold, letterSpacing: 0.5, marginTop: 3 },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, alignItems: 'stretch' },
  contratarBtn: { flex: 1, marginTop: spacing.sm },
  bookingForm: { marginTop: spacing.md },
  priceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: spacing.md,
  },
  priceBannerLabel: {
    color: colors.accent,
    fontSize: 12,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  priceBannerHint: { color: colors.muted, fontSize: 12, marginTop: 2 },
  priceBannerValue: { color: colors.text, fontSize: 20, fontWeight: '800' },
  verifCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  verifHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    marginHorizontal: -4,
    marginVertical: -2,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  verifHeadActive: { backgroundColor: colors.surfaceAlt },
  verifPending: { color: colors.muted, fontSize: 13, fontFamily: fonts.bold, textTransform: 'uppercase' },
  verifCount: { color: colors.cyan, fontSize: 13, fontFamily: fonts.bold },
  verifHint: { color: colors.muted, fontSize: 12, marginTop: spacing.sm },
  endorseItem: { color: colors.text, fontSize: 13, marginTop: spacing.sm },
  endorseName: { fontFamily: fonts.bold },
  endorseBtn: { marginTop: spacing.md },
  verifMsg: { color: colors.cyan, fontSize: 13, marginTop: spacing.sm },
  unavailable: { backgroundColor: '#3B2A12', borderRadius: 10, padding: spacing.md, marginBottom: spacing.md },
  unavailableText: { color: colors.accent, fontSize: 13 },
  bio: { color: colors.text, fontSize: 15, lineHeight: 22, marginBottom: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.md },
  placeholder: { color: colors.muted, fontSize: 14 },
  listCard: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm },
  portfolioType: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  portfolioTitle: { color: colors.text, fontSize: 14, marginTop: 2 },
  mediaCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  mediaImage: { width: '100%', height: 200, backgroundColor: colors.surfaceAlt },
  mediaCaption: {
    color: colors.muted,
    fontSize: 13,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ratingCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  ratingHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  ratingHeadTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  ratingAvgBadge: { color: colors.accent, fontSize: 13, fontFamily: fonts.bold },
  reviewRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  reviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewDate: { color: colors.muted, fontSize: 11 },
  starEmpty: { color: colors.muted },
  ratingStars: { fontSize: 14 },
  ratingComment: { color: colors.text, fontSize: 14, marginTop: 4 },
  ratingAuthor: { color: colors.muted, fontSize: 12, marginTop: 4 },
  okBox: { backgroundColor: '#12331E', borderRadius: 10, padding: spacing.md, marginBottom: spacing.md },
  okText: { color: '#86EFAC', fontSize: 13 },
  errorBox: { backgroundColor: '#3B1219', borderRadius: 10, padding: spacing.md, marginBottom: spacing.md },
  errorText: { color: '#FCA5A5', fontSize: 13 },
});
