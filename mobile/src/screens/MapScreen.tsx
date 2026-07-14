import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../api/client';
import BackButton from '../components/BackButton';
import GlassButton from '../components/GlassButton';
import { colors, spacing } from '../theme';
import MapView from './map/MapView';
import { MapMarker } from './map/mapHtml';

// Centro de Cusco y radio de búsqueda
const CUSCO = { lat: -13.5319, lng: -71.9675 };
const RADIUS_KM = 15;
const REFRESH_MS = 20000; // refresco "en tiempo real"

type NearbyArtist = {
  id: number;
  user_id: number;
  name?: string;
  genre: string | null;
  lat: number;
  lng: number;
  rating_avg: number | string | null;
  is_available: boolean;
  distance_km: number;
  avatar_url?: string | null;
  hourly_rate?: number | string | null;
};

export default function MapScreen({
  onBack,
  onOpenArtist,
}: {
  onBack: () => void;
  onOpenArtist: (id: number) => void;
}) {
  const [artists, setArtists] = useState<NearbyArtist[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const lastSig = useRef<string>('');

  // Foto y tarifa por artista, tomadas del catálogo (/artists trae avatar_url y
  // hourly_rate). Así el mapa muestra foto y precio aunque el endpoint nearby no
  // los incluya. Se unen por id (mismo espacio de ids que artist_profiles).
  const [meta, setMeta] = useState<Record<number, { avatar_url?: string | null; hourly_rate?: number | string | null }>>({});
  useEffect(() => {
    api
      .get<{ id: number; avatar_url?: string | null; hourly_rate?: number | string | null }[]>('/artists')
      .then((list) => {
        const m: Record<number, { avatar_url?: string | null; hourly_rate?: number | string | null }> = {};
        (Array.isArray(list) ? list : []).forEach((a) => {
          m[a.id] = { avatar_url: a.avatar_url, hourly_rate: a.hourly_rate };
        });
        setMeta(m);
      })
      .catch(() => {});
  }, []);

  const avatarOf = (a: NearbyArtist) => a.avatar_url ?? meta[a.id]?.avatar_url ?? null;
  const rateOf = (a: NearbyArtist) => {
    const r = a.hourly_rate ?? meta[a.id]?.hourly_rate ?? null;
    return r != null ? Number(r) : null;
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.get<NearbyArtist[]>(
        `/search/nearby?lat=${CUSCO.lat}&lng=${CUSCO.lng}&radiusKm=${RADIUS_KM}`
      );
      const list = Array.isArray(data) ? data : [];
      // Solo actualiza si los datos cambiaron (evita recargar el mapa sin motivo)
      const sig = JSON.stringify(list.map((a) => [a.id, a.lat, a.lng, a.is_available]));
      if (sig !== lastSig.current) {
        lastSig.current = sig;
        setArtists(list);
      }
      setUpdatedAt(new Date());
    } catch (e: any) {
      setError(e.message || 'No se pudo cargar el mapa');
      setArtists((prev) => prev ?? []);
    }
  }, []);

  // Carga inicial + auto-refresco periódico
  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const markers: MapMarker[] = (artists || []).map((a) => ({
    id: a.id,
    lat: a.lat,
    lng: a.lng,
    name: a.name || 'Artista',
    genre: a.genre,
    distanceKm: a.distance_km,
    available: a.is_available,
    avatarUrl: avatarOf(a),
    hourlyRate: rateOf(a),
  }));

  // Doble clic sobre un artista → abre su perfil/portafolio. Guardamos el último
  // toque (id + hora) para distinguir un doble clic de dos toques sueltos.
  const lastTap = useRef<{ id: number; t: number }>({ id: -1, t: 0 });
  const handleArtistPress = (id: number) => {
    const now = Date.now();
    if (lastTap.current.id === id && now - lastTap.current.t < 320) {
      lastTap.current = { id: -1, t: 0 };
      onOpenArtist(id);
    } else {
      lastTap.current = { id, t: now };
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <BackButton onPress={onBack} style={styles.backBtn} />

      <View style={styles.headerRow}>
        <Text style={styles.title}>Artistas en Cusco</Text>
        <GlassButton title="Actualizar" size="sm" onPress={load} />
      </View>

      {updatedAt && (
        <Text style={styles.updated}>
          Actualizado {updatedAt.toLocaleTimeString('es-PE')} · se refresca solo cada 20 s
        </Text>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {artists === null ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginVertical: spacing.lg }} />
      ) : (
        <>
          <MapView center={CUSCO} markers={markers} onMarkerClick={onOpenArtist} />

          <Text style={styles.sectionTitle}>{markers.length} artistas cerca</Text>
          <Text style={styles.listHint}>Clic en un pin del mapa (o doble clic en la lista) para ver su perfil y portafolio</Text>
          {artists.map((a) => {
            const rate = rateOf(a);
            const avatar = avatarOf(a);
            return (
              <TouchableOpacity
                key={a.id}
                style={styles.row}
                onPress={() => handleArtistPress(a.id)}
                activeOpacity={0.85}
              >
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.rowAvatar} />
                ) : (
                  <View style={styles.rowAvatar}>
                    <Text style={styles.rowAvatarText}>{(a.name || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={[styles.dot, { backgroundColor: a.is_available ? colors.cyan : colors.muted }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{a.name || 'Artista'}</Text>
                  <Text style={styles.rowMeta}>
                    {(a.genre || 'Sin género') + ' · ' + a.distance_km.toFixed(1) + ' km'}
                  </Text>
                </View>
                <View style={styles.pricePill}>
                  <Text style={styles.priceText}>{rate != null ? `S/${rate}/h` : 'A convenir'}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          {markers.length === 0 && (
            <Text style={styles.placeholder}>No hay artistas con ubicación en este radio.</Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: 56, paddingBottom: 48 },
  backBtn: { marginBottom: spacing.md },
  backLink: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', flex: 1 },
  updated: { color: colors.muted, fontSize: 12, marginTop: 4, marginBottom: spacing.md },
  errorBox: { backgroundColor: '#3B1219', borderRadius: 10, padding: spacing.md, marginBottom: spacing.md },
  errorText: { color: '#FCA5A5', fontSize: 13 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.lg, marginBottom: 4 },
  listHint: { color: colors.muted, fontSize: 12, marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowAvatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  rowAvatarText: { color: colors.text, fontSize: 18, fontWeight: '800' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm },
  rowName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  rowMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  pricePill: {
    backgroundColor: 'rgba(214,51,255,0.16)',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  priceText: { color: colors.accent, fontSize: 13, fontWeight: '800' },
  placeholder: { color: colors.muted, fontSize: 14 },
});
