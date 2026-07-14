import { MotiView } from 'moti';
import { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { api } from '../api/client';
import BackButton from '../components/BackButton';
import GlassCard from '../components/GlassCard';
import VerifiedBadge from '../components/VerifiedBadge';
import { recordArtistOpened, recordFilterApplied } from '../metrics';
import { colors, fonts, glow, radius, spacing, type } from '../theme';

// Búsqueda de artistas a pantalla completa (más visible): buscador + filtros +
// resultados. Es la "ventana correspondiente" del panel de filtros del Home.
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

const PRICE_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Todos', value: null },
  { label: '≤ S/100', value: 100 },
  { label: '≤ S/200', value: 200 },
  { label: '≤ S/300', value: 300 },
];

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function SearchScreen({
  onBack,
  onOpenArtist,
}: {
  onBack: () => void;
  onOpenArtist: (id: number) => void;
}) {
  const [artists, setArtists] = useState<Artist[] | null>(null);
  const [allGenres, setAllGenres] = useState<string[]>([]);
  const [allDistricts, setAllDistricts] = useState<string[]>([]);
  const [allEventTypes, setAllEventTypes] = useState<string[]>([]);

  const [query, setQuery] = useState('');
  const [fGenre, setFGenre] = useState<string | null>(null);
  const [fDistrict, setFDistrict] = useState<string | null>(null);
  const [fEventType, setFEventType] = useState<string | null>(null);
  const [fMaxPrice, setFMaxPrice] = useState<number | null>(null);
  const [fAvailable, setFAvailable] = useState(false);

  // Catálogo completo (una vez) para derivar las opciones de filtro
  useEffect(() => {
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
  }, []);

  // Refetch por filtros estructurales; el texto libre se filtra localmente
  const firstRun = useRef(true);
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

    if (firstRun.current) {
      firstRun.current = false;
    } else {
      recordFilterApplied({ genre: fGenre, district: fDistrict, eventType: fEventType, maxPrice: fMaxPrice, available: fAvailable });
    }
  }, [fGenre, fDistrict, fEventType, fMaxPrice, fAvailable]);

  const openArtist = (id: number) => {
    recordArtistOpened(id);
    onOpenArtist(id);
  };

  const q = query.trim().toLowerCase();
  const visible = (artists ?? []).filter((a) => {
    if (!q) return true;
    return (a.users?.name || '').toLowerCase().includes(q) || (a.genre || '').toLowerCase().includes(q);
  });
  const hasFilters = !!fGenre || !!fDistrict || !!fEventType || fMaxPrice != null || fAvailable || !!q;

  const clearFilters = () => {
    setQuery('');
    setFGenre(null);
    setFDistrict(null);
    setFEventType(null);
    setFMaxPrice(null);
    setFAvailable(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <BackButton onPress={onBack} style={styles.backBtn} />
      <Text style={styles.title}>Buscar artistas</Text>
      <Text style={styles.subtitle}>Filtra por género, distrito, tipo de evento y precio</Text>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔎</Text>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Busca por nombre o género…"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

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

      <Text style={styles.filterLabel}>Precio y disponibilidad</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {PRICE_OPTIONS.map((p) => (
          <Chip key={p.label} label={p.label} active={fMaxPrice === p.value} onPress={() => setFMaxPrice(p.value)} />
        ))}
        <Chip label="🟢 Disponibles" active={fAvailable} onPress={() => setFAvailable((v) => !v)} />
      </ScrollView>

      <View style={styles.resultsHead}>
        <Text style={styles.sectionTitle}>
          {hasFilters ? 'Resultados' : 'Catálogo'}
          {artists !== null ? ` · ${visible.length}` : ''}
        </Text>
        {hasFilters && (
          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearLink}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      {artists === null ? (
        <Text style={styles.placeholder}>Cargando artistas…</Text>
      ) : visible.length === 0 ? (
        <Text style={styles.placeholder}>Ningún artista coincide con tu búsqueda.</Text>
      ) : (
        <View style={styles.grid}>
          {visible.map((a, i) => {
            const rating = Number(a.rating_avg) || 0;
            const rate = a.hourly_rate != null ? Number(a.hourly_rate) : null;
            return (
              <MotiView
                key={a.id}
                style={styles.gridItem}
                from={{ opacity: 0, translateY: 18, scale: 0.97 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                transition={{ type: 'timing', duration: 320, delay: i * 50 }}
              >
                <TouchableOpacity style={styles.tileTouch} onPress={() => openArtist(a.id)} activeOpacity={0.85}>
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
                      {[rating > 0 ? `⭐ ${rating.toFixed(1)}` : null, a.genre, a.city].filter(Boolean).join(' · ')}
                    </Text>
                    <View style={styles.tileFoot}>
                      <View style={styles.pricePill}>
                        <Text style={styles.priceText}>{rate != null ? `S/${rate}/h` : 'A convenir'}</Text>
                      </View>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              </MotiView>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: 56, paddingBottom: 48 },
  backBtn: { marginBottom: spacing.md },
  title: { color: colors.text, fontSize: type.title, fontFamily: fonts.display, letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 2, marginBottom: spacing.md, fontFamily: fonts.regular },
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
  resultsHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: spacing.sm },
  sectionTitle: {
    color: colors.text,
    fontSize: type.h2,
    fontFamily: fonts.display,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  clearLink: { color: colors.accent, fontSize: 13, fontFamily: fonts.bold },
  placeholder: { color: colors.muted, fontSize: 14, marginBottom: spacing.lg, fontFamily: fonts.regular },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%', marginBottom: spacing.md },
  tileTouch: { borderRadius: radius.lg, ...glow() },
  tile: { padding: spacing.md, minHeight: 152 },
  tileFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginTop: 'auto', paddingTop: spacing.sm },
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
  pricePill: {
    backgroundColor: 'rgba(214,51,255,0.16)',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  priceText: { color: colors.accent, fontSize: 14, fontFamily: fonts.display },
});
