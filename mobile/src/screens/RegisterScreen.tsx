import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Role, RegisterPayload, useAuth } from '../auth/AuthContext';
import { Field, PrimaryButton } from '../components/form';
import Logo from '../components/Logo';
import { colors, fonts, type, spacing } from '../theme';

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: 'cliente', label: 'Cliente', desc: 'Quiero contratar artistas' },
  { value: 'artista', label: 'Artista', desc: 'Quiero ofrecer mis servicios' },
];

export default function RegisterScreen({ onGoLogin }: { onGoLogin: () => void }) {
  const { register } = useAuth();

  const [role, setRole] = useState<Role>('cliente');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Campos solo para artistas
  const [genre, setGenre] = useState('');
  const [city, setCity] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [bio, setBio] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    if (!name || !email || !password) {
      setError('Nombre, correo y contraseña son obligatorios');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    const payload: RegisterPayload = {
      name: name.trim(),
      email: email.trim(),
      password,
      role,
    };
    if (phone) payload.phone = phone.trim();
    if (role === 'artista') {
      if (genre) payload.genre = genre.trim();
      if (city) payload.city = city.trim();
      if (bio) payload.bio = bio.trim();
      const rate = Number(hourlyRate);
      if (hourlyRate && Number.isFinite(rate)) payload.hourly_rate = rate;
    }

    setLoading(true);
    try {
      await register(payload);
    } catch (e: any) {
      setError(e.message || 'No se pudo completar el registro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Logo size={110} style={styles.logo} />
        <Text style={styles.title}>Crea tu cuenta</Text>

        {/* Selector de rol */}
        <Text style={styles.sectionLabel}>¿Cómo quieres usar MusicYA?</Text>
        <View style={styles.roleRow}>
          {ROLES.map((r) => {
            const active = role === r.value;
            return (
              <TouchableOpacity
                key={r.value}
                style={[styles.roleCard, active && styles.roleCardActive]}
                onPress={() => setRole(r.value)}
                activeOpacity={0.85}
              >
                <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>{r.label}</Text>
                <Text style={styles.roleDesc}>{r.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Field label="Nombre" value={name} onChangeText={setName} placeholder="Tu nombre o el de tu banda" />
        <Field
          label="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          placeholder="tucorreo@ejemplo.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Field
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          placeholder="Mínimo 6 caracteres"
          secureTextEntry
        />
        <Field
          label="Teléfono (opcional)"
          value={phone}
          onChangeText={setPhone}
          placeholder="+51 ..."
          keyboardType="phone-pad"
        />

        {/* Campos adicionales para artistas */}
        {role === 'artista' && (
          <View style={styles.artistSection}>
            <Text style={styles.sectionLabel}>Datos de tu perfil de artista</Text>
            <Field label="Género musical" value={genre} onChangeText={setGenre} placeholder="Rock, Cumbia, Folklore…" />
            <Field label="Ciudad" value={city} onChangeText={setCity} placeholder="Cusco" />
            <Field
              label="Tarifa por hora (S/)"
              value={hourlyRate}
              onChangeText={setHourlyRate}
              placeholder="150"
              keyboardType="numeric"
            />
            <Field
              label="Biografía"
              value={bio}
              onChangeText={setBio}
              placeholder="Cuéntales a tus clientes sobre ti"
              multiline
              numberOfLines={3}
            />
          </View>
        )}

        <PrimaryButton
          title={role === 'artista' ? 'Crear cuenta de artista' : 'Crear cuenta'}
          onPress={submit}
          loading={loading}
        />

        <TouchableOpacity style={styles.link} onPress={onGoLogin}>
          <Text style={styles.linkText}>
            ¿Ya tienes cuenta? <Text style={styles.linkAccent}>Inicia sesión</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: 52, paddingBottom: 48, flexGrow: 1 },
  logo: { alignSelf: 'center', marginBottom: spacing.xs },
  brand: { color: colors.accent, fontSize: type.title, fontFamily: fonts.display, letterSpacing: -0.5 },
  title: { color: colors.text, fontSize: type.h2, fontFamily: fonts.display, marginBottom: spacing.lg, textTransform: 'uppercase', textAlign: 'center' },
  sectionLabel: { color: colors.muted, fontSize: 13, marginBottom: spacing.sm, marginTop: spacing.sm },
  roleRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  roleCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleCardActive: { borderColor: colors.primary },
  roleLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  roleLabelActive: { color: colors.primary },
  roleDesc: { color: colors.muted, fontSize: 12, marginTop: 4 },
  artistSection: {
    borderTopWidth: 1,
    borderTopColor: colors.surface,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  errorBox: { backgroundColor: '#3B1219', borderRadius: 10, padding: spacing.md, marginBottom: spacing.md },
  errorText: { color: '#FCA5A5', fontSize: 13 },
  link: { marginTop: spacing.lg, alignItems: 'center' },
  linkText: { color: colors.muted, fontSize: 14 },
  linkAccent: { color: colors.accent, fontWeight: '700' },
});
