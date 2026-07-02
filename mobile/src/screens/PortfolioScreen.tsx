import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Field, PrimaryButton } from '../components/form';
import { colors, fonts, radius, spacing, type } from '../theme';

// Tipos de material multimedia aceptados por el backend (artists.controller.js)
const PORTFOLIO_TYPES = ['imagen', 'video', 'audio'] as const;
type PortfolioType = (typeof PORTFOLIO_TYPES)[number];
type Item = { type: PortfolioType; url: string; title: string };

type ArtistProfile = {
  id: number;
  genre: string | null;
  city: string | null;
  bio: string | null;
  hourly_rate: number | null;
  is_available: boolean;
  avatar_url: string | null;
  social_links: Record<string, string> | null;
  verification_doc_url: string | null;
  portfolio?: { type: string; url: string; title: string | null }[];
};

export default function PortfolioScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const profileId = user?.artist_profile?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [genre, setGenre] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [available, setAvailable] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [items, setItems] = useState<Item[]>([]);

  // Carga el perfil actual del artista para precargar el formulario
  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    api
      .get<ArtistProfile>(`/artists/${profileId}`)
      .then((p) => {
        setGenre(p.genre || '');
        setCity(p.city || '');
        setBio(p.bio || '');
        setHourlyRate(p.hourly_rate != null ? String(p.hourly_rate) : '');
        setAvailable(p.is_available);
        setAvatarUrl(p.avatar_url || '');
        const s = p.social_links || {};
        setInstagram(s.instagram || '');
        setYoutube(s.youtube || '');
        setTiktok(s.tiktok || '');
        setDocUrl(p.verification_doc_url || '');
        setItems(
          (p.portfolio || [])
            .filter((it) => (PORTFOLIO_TYPES as readonly string[]).includes(it.type))
            .map((it) => ({ type: it.type as PortfolioType, url: it.url, title: it.title || '' }))
        );
      })
      .catch((e) => setError(e.message || 'No se pudo cargar tu perfil'))
      .finally(() => setLoading(false));
  }, [profileId]);

  function addItem() {
    setItems((prev) => [...prev, { type: 'imagen', url: '', title: '' }]);
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }
  function cycleType(idx: number) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const next = PORTFOLIO_TYPES[(PORTFOLIO_TYPES.indexOf(it.type) + 1) % PORTFOLIO_TYPES.length];
        return { ...it, type: next };
      })
    );
  }
  function setItemField(idx: number, field: 'url' | 'title', value: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  async function save() {
    setMsg(null);
    setError(null);

    // Solo enviamos redes con valor; habilita el check "Redes" de verificación
    const social: Record<string, string> = {};
    if (instagram.trim()) social.instagram = instagram.trim();
    if (youtube.trim()) social.youtube = youtube.trim();
    if (tiktok.trim()) social.tiktok = tiktok.trim();

    const rate = Number(hourlyRate);
    const payload: Record<string, unknown> = {
      genre: genre.trim() || null,
      city: city.trim() || null,
      bio: bio.trim() || null,
      hourly_rate: Number.isFinite(rate) && rate > 0 ? rate : null,
      is_available: available,
      avatar_url: avatarUrl.trim() || null,
      social_links: Object.keys(social).length ? social : null,
      verification_doc_url: docUrl.trim() || null,
      portfolio: items
        .filter((it) => it.url.trim())
        .map((it) => ({ type: it.type, url: it.url.trim(), title: it.title.trim() || null })),
    };

    setSaving(true);
    try {
      if (profileId) {
        await api.put(`/artists/${profileId}`, payload);
      } else {
        // Aún no tiene perfil profesional: se crea
        await api.post('/artists', payload);
      }
      setMsg('¡Portafolio guardado! Tus cambios ya son públicos.');
    } catch (e: any) {
      setError(e.message || 'No se pudo guardar el portafolio');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backLink}>← Volver</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Mi portafolio</Text>
        <Text style={styles.subtitle}>Edita tu perfil profesional; se ve en el catálogo.</Text>

        {msg && (
          <View style={styles.okBox}>
            <Text style={styles.okText}>{msg}</Text>
          </View>
        )}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Foto de perfil */}
        <View style={styles.avatarRow}>
          {avatarUrl.trim() ? (
            <Image source={{ uri: avatarUrl.trim() }} style={styles.avatarPreview} />
          ) : (
            <View style={[styles.avatarPreview, styles.avatarPlaceholder]}>
              <Text style={styles.avatarPlaceholderText}>Sin foto</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Field
              label="Foto de perfil (URL)"
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              placeholder="https://…/foto.jpg"
              autoCapitalize="none"
            />
          </View>
        </View>

        <Field label="Género musical" value={genre} onChangeText={setGenre} placeholder="Rock, Cumbia, Jazz…" />
        <Field label="Ciudad" value={city} onChangeText={setCity} placeholder="Cusco" />
        <Field
          label="Biografía"
          value={bio}
          onChangeText={setBio}
          placeholder="Cuenta tu trayectoria, estilo y experiencia"
          multiline
          numberOfLines={4}
          style={styles.bioInput}
        />
        <Field
          label="Tarifa por hora (S/)"
          value={hourlyRate}
          onChangeText={setHourlyRate}
          placeholder="150"
          keyboardType="numeric"
        />

        {/* Disponibilidad */}
        <Text style={styles.label}>Disponibilidad</Text>
        <TouchableOpacity
          style={[styles.toggle, available ? styles.toggleOn : styles.toggleOff]}
          onPress={() => setAvailable((v) => !v)}
          activeOpacity={0.85}
        >
          <Text style={styles.toggleText}>
            {available ? '✓ Disponible para contrataciones' : '✕ No disponible por ahora'}
          </Text>
        </TouchableOpacity>

        {/* Redes (habilitan el check de verificación) */}
        <Text style={styles.sectionTitle}>Redes sociales</Text>
        <Field label="Instagram" value={instagram} onChangeText={setInstagram} placeholder="https://instagram.com/tu_usuario" autoCapitalize="none" />
        <Field label="YouTube" value={youtube} onChangeText={setYoutube} placeholder="https://youtube.com/@tu_canal" autoCapitalize="none" />
        <Field label="TikTok" value={tiktok} onChangeText={setTiktok} placeholder="https://tiktok.com/@tu_usuario" autoCapitalize="none" />

        {/* Documento de verificación */}
        <Field
          label="Documento de verificación (URL)"
          value={docUrl}
          onChangeText={setDocUrl}
          placeholder="Enlace a tu DNI/contrato para verificación"
          autoCapitalize="none"
        />

        {/* Portafolio multimedia */}
        <Text style={styles.sectionTitle}>Material multimedia</Text>
        {items.map((it, idx) => (
          <View key={idx} style={styles.itemCard}>
            <View style={styles.itemHead}>
              <TouchableOpacity style={styles.typeChip} onPress={() => cycleType(idx)} activeOpacity={0.85}>
                <Text style={styles.typeChipText}>{it.type.toUpperCase()}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeItem(idx)}>
                <Text style={styles.removeText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
            <Field label="URL" value={it.url} onChangeText={(v) => setItemField(idx, 'url', v)} placeholder="https://…" autoCapitalize="none" />
            <Field label="Título" value={it.title} onChangeText={(v) => setItemField(idx, 'title', v)} placeholder="Nombre del tema o pieza" />
          </View>
        ))}
        <TouchableOpacity style={styles.addBtn} onPress={addItem} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>+ Añadir material</Text>
        </TouchableOpacity>

        <View style={{ marginTop: spacing.lg }}>
          <PrimaryButton title="Guardar portafolio" onPress={save} loading={saving} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: 56, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  backBtn: { marginBottom: spacing.md },
  backLink: { color: colors.accent, fontSize: 14, fontFamily: fonts.bold },
  title: { color: colors.text, fontSize: type.title, fontFamily: fonts.display, textTransform: 'uppercase' },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 4, marginBottom: spacing.lg, fontFamily: fonts.regular },
  label: { color: colors.muted, fontSize: 13, marginBottom: 6, fontFamily: fonts.medium },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xs },
  avatarPreview: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarPlaceholderText: { color: colors.muted, fontSize: 10, fontFamily: fonts.medium },
  bioInput: { minHeight: 96, textAlignVertical: 'top' },
  toggle: { borderRadius: radius.md, borderWidth: 2, paddingVertical: 14, alignItems: 'center', marginBottom: spacing.sm },
  toggleOn: { borderColor: colors.cyan, backgroundColor: 'rgba(39,225,255,0.08)' },
  toggleOff: { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  toggleText: { color: colors.text, fontSize: 14, fontFamily: fonts.bold },
  sectionTitle: {
    color: colors.text,
    fontSize: type.h3,
    fontFamily: fonts.display,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  itemHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  typeChip: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  typeChipText: { color: colors.text, fontSize: 12, fontFamily: fonts.bold },
  removeText: { color: colors.pink, fontSize: 13, fontFamily: fonts.medium },
  addBtn: {
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    paddingVertical: 14,
    alignItems: 'center',
  },
  addBtnText: { color: colors.accent, fontSize: 14, fontFamily: fonts.bold },
  okBox: { backgroundColor: '#12331E', borderRadius: 10, padding: spacing.md, marginBottom: spacing.md },
  okText: { color: '#86EFAC', fontSize: 13 },
  errorBox: { backgroundColor: '#3B1219', borderRadius: 10, padding: spacing.md, marginBottom: spacing.md },
  errorText: { color: '#FCA5A5', fontSize: 13 },
});
