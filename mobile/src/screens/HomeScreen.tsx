import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { api } from '../api/client';
import { getViewed, type ViewedArtist } from '../behavior';
import {
  recordArtistOpened,
  recordFilterApplied,
  startSearchSession,
} from '../metrics';
import { useAuth } from '../auth/AuthContext';
import BookingTracker from '../components/BookingTracker';
import GlassButton from '../components/GlassButton';
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
  district?: string | null;
  event_types?: string[] | null;
  hourly_rate: number | null;
  rating_avg: number | string | null;
  is_available: boolean;
  is_verified?: boolean;
  avatar_url?: string | null;
  users: { name: string } | null;
};

// Rangos de precio para los filtros (S/ por hora); null = sin tope.
const PRICE_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Todos', value: null },
  { label: '≤ S/100', value: 100 },
  { label: '≤ S/200', value: 200 },
  { label: '≤ S/300', value: 300 },
];

// Píldora de filtro reutilizable (género, precio, disponibilidad)
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

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
  onOpenMetrics,
  onPay,
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
  onOpenMetrics: () => void;
  onPay: (bookingId: number) => void;
}) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [artists, setArtists] = useState<Artist[] | null>(null);
  const [allGenres, setAllGenres] = useState<string[]>([]);
  const [allDistricts, setAllDistricts] = useState<string[]>([]);
  const [allEventTypes, setAllEventTypes] = useState<string[]>([]);
  const [viewed, setViewed] = useState<ViewedArtist[]>([]);
  const requireLogin = onRequireLogin ?? (() => {});

  // Estado del buscador (eje de la hipótesis: reducir el tiempo de búsqueda)
  const [query, setQuery] = useState('');
  const [fGenre, setFGenre] = useState<string | null>(null);
  const [fDistrict, setFDistrict] = useState<string | null>(null);
  const [fEventType, setFEventType] = useState<string | null>(null);
  const [fMaxPrice, setFMaxPrice] = useState<number | null>(null);
  const [fAvailable, setFAvailable] = useState(false);

  // Cada módulo abre la pantalla correspondiente ya existente
  const featureActions: Record<FeatureAction, () => void> = {
    map: onOpenMap,
    chat: onOpenChat,
    bookings: onOpenBookings,
    notifications: onOpenNotifications,
    copilot: onOpenCopilot,
  };

  // Al montar: inicia la sesión de búsqueda (t0 de la medición), carga el catálogo
  // completo para derivar los géneros disponibles y recupera los vistos recientemente.
  useEffect(() => {
    startSearchSession();
    api
      .get<Artist[]>('/artists')
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        const uniq = (xs: (string | null | undefined)[]) =>
          Array.from(new Set(xs.filter((x): x is string => !!x))).sort();
        setAllGenres(uniq(arr.map((a) => a.genre)));
        setAllDistricts(uniq(arr.map((a) => a.district)));
        setAllEventTypes(uniq(arr.flatMap((a) => a.event_types ?? [])));
      })
      .catch(() => {});
    getViewed().then(setViewed);
  }, []);

  // Refetch del catálogo cada vez que cambian los filtros estructurales (género,
  // precio, disponibilidad). El texto libre se filtra localmente sobre el resultado.
  const firstFilterRun = useRef(true);
  useEffect(() => {
    const params = new URLSearchParams();
    if (fGenre) params.set('genre', fGenre);
    if (fDistrict) params.set('district', fDistrict);
    if (fEventType) params.set('eventType', fEventType);
    if (fMaxPrice != null) params.set('maxPrice', String(fMaxPrice));
    if (fAvailable) params.set('available', 'true');
    const qs = params.toString();

    setArtists(null);
    api
      .get<Artist[]>(qs ? `/artists?${qs}` : '/artists')
      .then((list) => setArtists(Array.isArray(list) ? list : []))
      .catch(() => setArtists([]));

    // No cuenta como "filtro aplicado" la carga inicial
    if (firstFilterRun.current) {
      firstFilterRun.current = false;
    } else {
      recordFilterApplied({
        genre: fGenre,
        district: fDistrict,
        eventType: fEventType,
        maxPrice: fMaxPrice,
        available: fAvailable,
      });
    }
  }, [fGenre, fDistrict, fEventType, fMaxPrice, fAvailable]);

  // Abre el perfil registrando el evento "artista encontrado" (tiempo hasta encontrar)
  const openArtist = (id: number) => {
    recordArtistOpened(id);
    onOpenArtist(id);
  };

  // Filtro local por texto (nombre o género) sobre el resultado ya filtrado
  const q = query.trim().toLowerCase();
  const visible = (artists ?? []).filter((a) => {
    if (!q) return true;
    return (
      (a.users?.name || '').toLowerCase().includes(q) ||
      (a.genre || '').toLowerCase().includes(q)
    );
  });
  const hasFilters =
    !!fGenre || !!fDistrict || !!fEventType || fMaxPrice != null || fAvailable || !!q;

  return (
    <View style={styles.root}>
      {/* Orbes de luz de marca: dan sustancia al desenfoque del vidrio líquido */}
      <LinearGradient colors={['#FF3DD4', 'transparent']} style={styles.orbA} pointerEvents="none" />
      <LinearGradient colors={['#27E1FF', 'transparent']} style={styles.orbB} pointerEvents="none" />
      <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Logo size={88} style={styles.headerLogo} />
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
          <GlassButton title="Ingresar" onPress={requireLogin} size="sm" style={styles.logout} />
        ) : (
          <GlassButton title="Salir" onPress={logout} size="sm" style={styles.logout} />
        )}
      </View>

      {/* Proceso de contratación en primer plano (hasta confirmar el pago) */}
      <BookingTracker
        role={user?.role}
        enabled={!isGuest}
        onPay={onPay}
        onOpenBookings={onOpenBookings}
      />

      <View style={styles.navRow}>
        <GlassButton title="🗺️ Mapa" onPress={onOpenMap} size="sm" style={styles.navBtn} />
        <GlassButton title="📅 Reservas" onPress={onOpenBookings} size="sm" style={styles.navBtn} />
        <GlassButton title="💬 Chat" onPress={onOpenChat} size="sm" style={styles.navBtn} />
      </View>

      <GlassButton
        title="🤖 Pregúntale al asistente IA"
        onPress={onOpenCopilot}
        style={styles.featureBtn}
      />

      {!isGuest && user?.role === 'artista' && (
        <GlassButton title="🎨 Mi portafolio" onPress={onOpenPortfolio} style={styles.featureBtn} />
      )}

      <GlassButton
        title="📊 Indicadores de la plataforma"
        onPress={onOpenMetrics}
        style={styles.featureBtn}
      />

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
                onPress={() => openArtist(v.id)}
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

      {/* Buscador con filtros: el eje de la hipótesis (reducir el tiempo de búsqueda) */}
      <Text style={styles.sectionTitle}>Encuentra tu artista</Text>
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔎</Text>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Busca por nombre o género…"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filtro por género */}
      {allGenres.length > 0 && (
        <>
          <Text style={styles.filterLabel}>Género</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            <Chip label="Todos" active={fGenre === null} onPress={() => setFGenre(null)} />
            {allGenres.map((g) => (
              <Chip key={g} label={g} active={fGenre === g} onPress={() => setFGenre(fGenre === g ? null : g)} />
            ))}
          </ScrollView>
        </>
      )}

      {/* Filtro por distrito */}
      {allDistricts.length > 0 && (
        <>
          <Text style={styles.filterLabel}>Distrito</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            <Chip label="Todos" active={fDistrict === null} onPress={() => setFDistrict(null)} />
            {allDistricts.map((d) => (
              <Chip key={d} label={d} active={fDistrict === d} onPress={() => setFDistrict(fDistrict === d ? null : d)} />
            ))}
          </ScrollView>
        </>
      )}

      {/* Filtro por tipo de evento */}
      {allEventTypes.length > 0 && (
        <>
          <Text style={styles.filterLabel}>Tipo de evento</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            <Chip label="Todos" active={fEventType === null} onPress={() => setFEventType(null)} />
            {allEventTypes.map((e) => (
              <Chip key={e} label={e} active={fEventType === e} onPress={() => setFEventType(fEventType === e ? null : e)} />
            ))}
          </ScrollView>
        </>
      )}

      {/* Filtro por precio y disponibilidad en tiempo real */}
      <Text style={styles.filterLabel}>Precio y disponibilidad</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {PRICE_OPTIONS.map((p) => (
          <Chip
            key={p.label}
            label={p.label}
            active={fMaxPrice === p.value}
            onPress={() => setFMaxPrice(p.value)}
          />
        ))}
        <Chip
          label="🟢 Disponibles"
          active={fAvailable}
          onPress={() => setFAvailable((v) => !v)}
        />
      </ScrollView>

      <View style={styles.resultsHead}>
        <Text style={styles.sectionTitle}>
          {hasFilters ? 'Resultados' : 'Catálogo'}
          {artists !== null ? ` · ${visible.length}` : ''}
        </Text>
        {hasFilters && (
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              setFGenre(null);
              setFDistrict(null);
              setFEventType(null);
              setFMaxPrice(null);
              setFAvailable(false);
            }}
          >
            <Text style={styles.clearLink}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      {artists === null ? (
        <Text style={styles.placeholder}>Cargando artistas…</Text>
      ) : visible.length === 0 ? (
        <Text style={styles.placeholder}>
          {hasFilters ? 'Ningún artista coincide con tu búsqueda.' : 'Aún no hay artistas registrados.'}
        </Text>
      ) : (
        <View style={styles.grid}>
          {visible.map((a, i) => {
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
                  onPress={() => openArtist(a.id)}
                  activeOpacity={0.85}
                >
                  <GlassCard style={styles.tile}>
                    {a.avatar_url ? (
                      <Image source={{ uri: a.avatar_url }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{(a.users?.name || '?').charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
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
  logout: {},
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
  navBtn: { flex: 1 },
  featureBtn: { marginBottom: spacing.md },
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
  // Buscador
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchIcon: { fontSize: 16, marginRight: spacing.sm },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, fontFamily: fonts.regular, paddingVertical: 12 },
  searchClear: { color: colors.muted, fontSize: 16, paddingHorizontal: 4 },
  filterLabel: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  chipsRow: { gap: spacing.sm, paddingRight: spacing.sm, paddingBottom: spacing.sm },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.accent },
  chipText: { color: colors.muted, fontSize: 13, fontFamily: fonts.medium },
  chipTextActive: { color: colors.text, fontFamily: fonts.bold },
  resultsHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  clearLink: { color: colors.accent, fontSize: 13, fontFamily: fonts.bold },
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
