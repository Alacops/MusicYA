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
import { colors, spacing } from '../theme';

export default function LoginScreen({ onGoRegister }: { onGoRegister: () => void }) {
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
        <Text style={styles.brand}>MusicYA</Text>
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
  content: { padding: spacing.lg, paddingTop: 80, flexGrow: 1 },
  brand: { color: colors.primary, fontSize: 36, fontWeight: '800' },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: spacing.lg },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 4, marginBottom: spacing.lg },
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
