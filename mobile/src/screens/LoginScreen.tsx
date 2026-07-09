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
import { useAuth } from '../auth/AuthContext';
import { Field, PrimaryButton } from '../components/form';
import Logo from '../components/Logo';
import { colors, fonts, type, spacing } from '../theme';

export default function LoginScreen({
  onGoRegister,
  onBack,
}: {
  onGoRegister: () => void;
  onBack?: () => void;
}) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    if (!email || !password) {
      setError('Ingresa tu correo y contraseña');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e.message || 'No se pudo iniciar sesión');
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
        {onBack && (
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backLink}>← Volver</Text>
          </TouchableOpacity>
        )}
        <Logo size={240} style={styles.logo} />
        <Text style={styles.title}>Inicia sesión</Text>
        <Text style={styles.subtitle}>Contrata y promociona artistas en tiempo real</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Field
          label="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          placeholder="tucorreo@ejemplo.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Field
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
        />

        <PrimaryButton title="Entrar" onPress={submit} loading={loading} />

        <TouchableOpacity style={styles.link} onPress={onGoRegister}>
          <Text style={styles.linkText}>
            ¿No tienes cuenta? <Text style={styles.linkAccent}>Regístrate</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: 56, flexGrow: 1 },
  backBtn: { marginBottom: spacing.sm },
  backLink: { color: colors.accent, fontSize: 14, fontFamily: fonts.bold },
  logo: { alignSelf: 'center', marginBottom: spacing.sm },
  brand: { color: colors.accent, fontSize: type.hero, fontFamily: fonts.display, letterSpacing: -1 },
  title: { color: colors.text, fontSize: type.title, fontFamily: fonts.display, textTransform: 'uppercase', textAlign: 'center' },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 4, marginBottom: spacing.lg, fontFamily: fonts.regular, textAlign: 'center' },
  errorBox: {
    backgroundColor: '#3B1219',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { color: '#FCA5A5', fontSize: 13 },
  link: { marginTop: spacing.lg, alignItems: 'center' },
  linkText: { color: colors.muted, fontSize: 14 },
  linkAccent: { color: colors.accent, fontWeight: '700' },
});
