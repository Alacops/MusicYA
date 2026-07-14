import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { api } from '../api/client';
import { getViewed, type ViewedArtist } from '../behavior';
import { recordArtistOpened, startSearchSession } from '../metrics';
import { useAuth } from '../auth/AuthContext';
import BookingTracker from '../components/BookingTracker';
import GlassButton from '../components/GlassButton';
import GlassCard from '../components/GlassCard';
import Logo from '../components/Logo';
import VerifiedBadge from '../components/VerifiedBadge';
import { useNotifications } from '../notifications/NotificationsContext';
import { colors, fonts, gradients, radius, spacing, type, glow } from '../theme';
import MapView from './map/MapView';
import type { MapMarker } from './map/mapHtml';

type FeatureAction = 'map' | 'chat' | 'bookings' | 'notifications' | 'copilot';

// Centro de Cusco: encuadre inicial del mapa de artistas
const CUSCO = { lat: -13.5319, lng: -71.9675 };

// Alto común de los tres paneles (mismo tamaño) y del mapa que va dentro
const PANEL_H = 452;
const MAP_H = 320;

// Confeti del fondo de fiesta (posiciones fijas para un banner festivo estable)
const CONFETTI: { top: number; left: string; color: string; size: number }[] = [
  { top: 16, left: '8%', color: colors.pink, size: 10 },
  { top: 44, left: '20%', color: colors.cyan, size: 7 },
  { top: 20, left: '38%', color: colors.magenta, size: 8 },
  { top: 56, left: '55%', color: colors.electric, size: 9 },
  { top: 24, left: '72%', color: colors.pink, size: 7 },
  { top: 48, left: '88%', color: colors.cyan, size: 10 },
  { top: 78, left: '14%', color: colors.magenta, size: 6 },
  { top: 84, left: '66%', color: colors.pink, size: 8 },
  { top: 96, left: '44%', color: colors.electric, size: 7 },
  { top: 104, left: '80%', color: colors.magenta, size: 6 },
];

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
  hourly_rate: number | null;
  rating_avg: number | string | null;
  is_available: boolean;
  is_verified?: boolean;
  avatar_url?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  users: { name: string } | null;
};

export default function HomeScreen({
  isGuest = false,
  onRequireLogin,
  onOpenRegister,
  onOpenArtist,
  onOpenPortfolio,
  onOpenBookings,
  onOpenMap,
  onOpenSearch,
  onOpenFeatured,
  onOpenNotifications,
  onOpenChat,
  onOpenCopilot,
  onOpenMetrics,
  onPay,
}: {
  isGuest?: boolean;
  onRequireLogin?: () => void;
  onOpenRegister?: () => void;
  onOpenArtist: (id: number) => void;
  onOpenPortfolio: () => void;
  onOpenBookings: () => void;
  onOpenMap: () => void;
  onOpenSearch: () => void;
  onOpenFeatured: () => void;
  onOpenNotifications: () => void;
  onOpenChat: () => void;
  onOpenCopilot: () => void;
  onOpenMetrics: () => void;
  onPay: (bookingId: number) => void;
}) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { width } = useWindowDimensions();
  // A partir de ~900px caben los tres paneles lado a lado; por debajo se apilan.
  const wide = width >= 900;
  const [artists, setArtists] = useState<Artist[] | null>(null);
  const [allGenres, setAllGenres] = useState<string[]>([]);
  const [viewed, setViewed] = useState<ViewedArtist[]>([]);
  const requireLogin = onRequireLogin ?? (() => {});
  const requireRegister = onOpenRegister ?? (() => {});

  // Cada módulo abre la pantalla correspondiente ya existente
  const featureActions: Record<FeatureAction, () => void> = {
    map: onOpenMap,
    chat: onOpenChat,
    bookings: onOpenBookings,
    notifications: onOpenNotifications,
    copilot: onOpenCopilot,
  };

  // Al montar: inicia la sesión de búsqueda (t0) y carga el catálogo para los
  // paneles de adelanto (destacados, mapa) y los géneros de la vista previa.
  useEffect(() => {
    startSearchSession();
    api
      .get<Artist[]>('/artists')
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setArtists(arr);
        setAllGenres(
          Array.from(new Set(arr.map((a) => a.genre).filter((x): x is string => !!x))).sort()
        );
      })
      .catch(() => setArtists([]));
    getViewed().then(setViewed);
  }, []);

  // Abre el perfil registrando el evento "artista abierto" (tiempo hasta encontrar)
  const openArtist = (id: number) => {
    recordArtistOpened(id);
    onOpenArtist(id);
  };

  // Adelanto: mejor valorados (el backend ya ordena por rating desc) y marcadores
  const featured = (artists ?? []).slice(0, 8);
  const mapMarkers: MapMarker[] = (artists ?? [])
    .filter((a) => a.lat != null && a.lng != null)
    .map((a) => ({
      id: a.id,
      lat: Number(a.lat),
      lng: Number(a.lng),
      name: a.users?.name || 'Artista',
      genre: a.genre,
      available: a.is_available,
      avatarUrl: a.avatar_url ?? null,
      hourlyRate: a.hourly_rate != null ? Number(a.hourly_rate) : null,
    }));

  // ── Contenido de cada panel ───────────────────────────────────────────────────

  const panelDestacados = (
    <GlassCard style={styles.panel}>
      <Text style={styles.panelTitle}>⭐ Artistas destacados</Text>
      <Text style={styles.panelHint}>Los mejor valorados · toca para ver todos</Text>
      <ScrollView
        style={styles.panelScroll}
        contentContainerStyle={styles.panelBody}
        showsVerticalScrollIndicator={false}
      >
        {artists === null ? (
          <Text style={styles.panelEmpty}>Cargando…</Text>
        ) : featured.length === 0 ? (
          <Text style={styles.panelEmpty}>Aún no hay artistas.</Text>
        ) : (
          featured.map((a) => {
            const rating = Number(a.rating_avg) || 0;
            const rate = a.hourly_rate != null ? Number(a.hourly_rate) : null;
            return (
              <View key={a.id} style={styles.featRow}>
                {a.avatar_url ? (
                  <Image source={{ uri: a.avatar_url }} style={styles.featAvatar} />
                ) : (
                  <View style={styles.featAvatar}>
                    <Text style={styles.featAvatarText}>
                      {(a.users?.name || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={styles.featNameRow}>
                    <Text style={styles.featName} numberOfLines={1}>
                      {a.users?.name || 'Artista'}
                    </Text>
                    {a.is_verified && <VerifiedBadge />}
                  </View>
                  <Text style={styles.featMeta} numberOfLines={1}>
                    {[rating > 0 ? `⭐ ${rating.toFixed(1)}` : null, a.genre, a.city].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <View style={styles.pricePill}>
                  <Text style={styles.priceText}>{rate != null ? `S/${rate}/h` : 'A convenir'}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </GlassCard>
  );

  // Mapa: el iframe conserva el hover (foto e info). La navegación al mapa completo
  // la maneja el envoltorio (wrapPanel).
  const panelMapa = (
    <GlassCard style={styles.panel}>
      <View style={styles.panelTitleRow}>
        <Text style={styles.panelTitle}>📍 Mapa en tiempo real</Text>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>EN VIVO</Text>
        </View>
      </View>
      <Text style={styles.panelHint}>Pasa el cursor por un pin · toca para abrir el mapa</Text>
      <View style={styles.mapWrap}>
        <MapView center={CUSCO} markers={mapMarkers} height={MAP_H} onMarkerClick={openArtist} />
      </View>
      <Text style={styles.panelLink}>{mapMarkers.length} ubicados · Clic en un pin para ver al artista</Text>
    </GlassCard>
  );

  // Filtros: lanzador hacia la pantalla de búsqueda (más visible). Al tocar el panel
  // se abre SearchScreen con buscador + filtros + resultados a lo ancho.
  const panelFiltros = (
    <GlassCard style={styles.panel}>
      <Text style={styles.panelTitle}>🔎 Búsqueda por filtros</Text>
      <Text style={styles.panelHint}>Encuentra por género, distrito, evento y precio</Text>
      <View style={styles.fakeSearch}>
        <Text style={styles.searchIcon}>🔎</Text>
        <Text style={styles.fakeSearchText}>Buscar artistas…</Text>
      </View>
      {allGenres.length > 0 && (
        <>
          <Text style={styles.filterLabel}>Géneros</Text>
          <View style={styles.previewChips}>
            {allGenres.slice(0, 8).map((g) => (
              <View key={g} style={styles.previewChip}>
                <Text style={styles.previewChipText}>{g}</Text>
              </View>
            ))}
          </View>
        </>
      )}
      <Text style={styles.panelLink}>
        Ver {artists !== null ? `los ${artists.length} artistas` : 'el catálogo'} →
      </Text>
    </GlassCard>
  );

  // Envuelve cada panel con su tamaño; si recibe onNavigate, todo el panel es clicable
  // y lleva a su ventana correspondiente.
  const wrapPanel = (content: ReactNode, onNavigate?: () => void) => {
    const sizeStyle = wide ? styles.panelFlex : styles.panelFull;
    if (onNavigate) {
      return (
        <TouchableOpacity style={sizeStyle} activeOpacity={0.92} onPress={onNavigate}>
          {content}
        </TouchableOpacity>
      );
    }
    return <View style={sizeStyle}>{content}</View>;
  };

  return (
    <View style={styles.root}>
      {/* Orbes de luz de marca: dan sustancia al desenfoque del vidrio líquido */}
      <LinearGradient colors={['#FF3DD4', 'transparent']} style={styles.orbA} pointerEvents="none" />
      <LinearGradient colors={['#27E1FF', 'transparent']} style={styles.orbB} pointerEvents="none" />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Barra superior: saludo + accesos de sesión (arriba a la derecha) */}
        <View style={styles.topBar}>
          <Text style={styles.welcome} numberOfLines={1}>
            {isGuest
              ? 'Explora como invitado'
              : `Hola, ${user?.name} · ${user?.role === 'artista' ? 'Artista' : 'Cliente'}`}
          </Text>
          {isGuest ? (
            <>
              <GlassButton title="Iniciar sesión" onPress={requireLogin} size="sm" />
              <GlassButton title="Crear cuenta" onPress={requireRegister} size="sm" />
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.bell} onPress={onOpenNotifications} activeOpacity={0.85}>
                <Text style={styles.bellIcon}>🔔</Text>
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <GlassButton title="Salir" onPress={logout} size="sm" />
            </>
          )}
        </View>

        {/* Hero con fondo de fiesta detrás del logo */}
        <View style={styles.hero}>
          <LinearGradient
            colors={gradients.wave}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(13,10,24,0.12)', 'rgba(13,10,24,0.74)']}
            style={StyleSheet.absoluteFill}
          />
          {CONFETTI.map((c, i) => (
            <View
              key={i}
              pointerEvents="none"
              style={[
                styles.confetti,
                { top: c.top, left: c.left as any, width: c.size, height: c.size, backgroundColor: c.color },
              ]}
            />
          ))}
          <Text style={styles.partyEmoji}>🎉</Text>
          <Logo size={150} style={styles.heroLogo} />
          <Text style={styles.heroBrand}>MusicYA</Text>
          <Text style={styles.heroTagline}>
            Contrata músicos y artistas de Cusco en tiempo real, fácil y sin intermediarios.
          </Text>
        </View>

        {/* Proceso de contratación en primer plano (hasta confirmar el pago) */}
        <BookingTracker
          role={user?.role}
          enabled={!isGuest}
          onPay={onPay}
          onOpenBookings={onOpenBookings}
        />

        {/* Los 3 paneles principales de búsqueda, juntos, debajo del logo */}
        <Text style={styles.sectionTitle}>Encuentra tu artista</Text>
        <View style={[styles.panels, wide ? styles.panelsRow : styles.panelsCol]}>
          {wrapPanel(panelDestacados, onOpenFeatured)}
          {wrapPanel(panelMapa, onOpenMap)}
          {wrapPanel(panelFiltros, onOpenSearch)}
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
  content: { padding: spacing.lg, paddingTop: 48, paddingBottom: 48 },
  // Barra superior
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  welcome: { flex: 1, color: colors.muted, fontSize: 14, fontFamily: fonts.medium },
  bell: {
    backgroundColor: colors.surfaceAlt,
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
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
  // Hero de fiesta
  hero: {
    alignItems: 'center',
    borderRadius: radius.lg,
    overflow: 'hidden',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    ...glow(),
  },
  confetti: { position: 'absolute', borderRadius: 3, opacity: 0.9, transform: [{ rotate: '20deg' }] },
  partyEmoji: { fontSize: 26, marginBottom: 2 },
  heroLogo: { marginBottom: spacing.sm },
  heroBrand: {
    color: colors.text,
    fontSize: type.hero,
    fontFamily: fonts.display,
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 8,
  },
  heroTagline: {
    color: '#F3ECFF',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: fonts.medium,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    maxWidth: 620,
  },
  featureBtn: { marginBottom: spacing.md, marginTop: spacing.sm },
  sectionTitle: {
    color: colors.text,
    fontSize: type.h2,
    fontFamily: fonts.display,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  // Fila de los 3 paneles
  panels: { marginBottom: spacing.lg },
  panelsRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  panelsCol: { flexDirection: 'column', gap: spacing.md },
  panel: { padding: spacing.md, height: PANEL_H, width: '100%' },
  panelFlex: { flex: 1, minWidth: 0 },
  panelFull: { width: '100%' },
  panelScroll: { flex: 1 },
  panelLink: { color: colors.accent, fontSize: 13, fontFamily: fonts.bold, marginTop: spacing.sm },
  panelTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { color: colors.text, fontSize: type.h3, fontFamily: fonts.bold },
  panelHint: { color: colors.muted, fontSize: 12, fontFamily: fonts.regular, marginTop: 2, marginBottom: spacing.sm },
  panelBody: { gap: spacing.sm },
  panelEmpty: { color: colors.muted, fontSize: 13, fontFamily: fonts.regular, paddingVertical: spacing.md },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(39,225,255,0.14)',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.cyan },
  liveText: { color: colors.cyan, fontSize: 10, fontFamily: fonts.bold, letterSpacing: 0.5 },
  mapWrap: { borderRadius: radius.md, overflow: 'hidden' },
  // Vista previa del panel de filtros (lanzador)
  fakeSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: spacing.md,
  },
  searchIcon: { fontSize: 16, marginRight: spacing.sm },
  fakeSearchText: { color: colors.muted, fontSize: 15, fontFamily: fonts.regular },
  filterLabel: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  previewChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  previewChip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  previewChipText: { color: colors.muted, fontSize: 13, fontFamily: fonts.medium },
  // Fila de artista destacado (dentro del panel)
  featRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featAvatar: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featAvatarText: { color: colors.text, fontSize: 15, fontFamily: fonts.display },
  featNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  featName: { color: colors.text, fontSize: 14, fontFamily: fonts.bold, flexShrink: 1 },
  featMeta: { color: colors.muted, fontSize: 12, fontFamily: fonts.regular, marginTop: 1 },
  // Precio resaltado (mismo tratamiento en toda la app)
  pricePill: {
    backgroundColor: 'rgba(214,51,255,0.16)',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  priceText: { color: colors.accent, fontSize: 13, fontFamily: fonts.display },
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
  avatarText: { color: colors.text, fontSize: 18, fontFamily: fonts.display },
  // Rejilla de módulos
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%', marginBottom: spacing.md },
  tileTouch: { borderRadius: radius.lg, ...glow() },
  moduleTile: { padding: spacing.md, minHeight: 128 },
  cardIcon: { fontSize: 28, marginBottom: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 16, fontFamily: fonts.bold },
  cardDesc: { color: colors.muted, fontSize: 13, marginTop: 2, fontFamily: fonts.regular },
});
