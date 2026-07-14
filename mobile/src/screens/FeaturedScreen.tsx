import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../api/client';
import BackButton from '../components/BackButton';
import GlassCard from '../components/GlassCard';
import VerifiedBadge from '../components/VerifiedBadge';
import { recordArtistOpened } from '../metrics';
import { colors, fonts, glow, radius, spacing, type } from '../theme';

// Ventana de "puros artistas destacados" (la ventana correspondiente del panel
// Destacados del Home). Muestra el catálogo ordenado por valoración; el contacto
// con el artista solo ocurre al entrar a su perfil desde aquí.
type Artist = {
  id: number;
  genre: string | null;
  city: string | null;
  hourly_rate: number | null;
  rating_avg: number | string | null;
  is_available: boolean;
  is_verified?: boolean;
  avatar_url?: string | null;
  users: { name: string } | null;
};

export default function FeaturedScreen({
  onBack,
  onOpenArtist,
}: {
  onBack: () => void;
  onOpenArtist: (id: number) => void;
}) {
  const [artists, setArtists] = useState<Artist[] | null>(null);

  // /artists ya llega ordenado por rating descendente
  useEffect(() => {
    api
      .get<Artist[]>('/artists')
      .then((list) => setArtists(Array.isArray(list) ? list : []))
      .catch(() => setArtists([]));
  }, []);

  const openArtist = (id: number) => {
    recordArtistOpened(id);
    onOpenArtist(id);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <BackButton onPress={onBack} style={styles.backBtn} />
      <Text style={styles.title}>⭐ Artistas destacados</Text>
      <Text style={styles.subtitle}>
        Los mejor valorados de Cusco · toca a un artista para ver su perfil y contactarlo
      </Text>

      {artists === null ? (
        <Text style={styles.placeholder}>Cargando artistas…</Text>
      ) : artists.length === 0 ? (
        <Text style={styles.placeholder}>Aún no hay artistas destacados.</Text>
      ) : (
        <View style={styles.grid}>
          {artists.map((a, i) => {
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
                    {/* Insignia de ranking para los tres primeros */}
                    {i < 3 && (
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</Text>
                      </View>
                    )}
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
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 2, marginBottom: spacing.lg, fontFamily: fonts.regular },
  placeholder: { color: colors.muted, fontSize: 14, marginBottom: spacing.lg, fontFamily: fonts.regular },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%', marginBottom: spacing.md },
  tileTouch: { borderRadius: radius.lg, ...glow() },
  tile: { padding: spacing.md, minHeight: 152 },
  tileFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginTop: 'auto', paddingTop: spacing.sm },
  rankBadge: { position: 'absolute', top: spacing.sm, right: spacing.sm, zIndex: 2 },
  rankText: { fontSize: 20 },
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
