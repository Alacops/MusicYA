import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import { colors } from './src/theme';

// Enrutado mínimo basado en estado: si no hay sesión muestra el flujo de
// autenticación (login/registro); si la hay, la pantalla principal.
function Root() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState<'login' | 'register'>('login');

  // Mientras se restaura la sesión guardada, evita parpadear el login
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (user) return <HomeScreen />;

  return screen === 'login' ? (
    <LoginScreen onGoRegister={() => setScreen('register')} />
  ) : (
    <RegisterScreen onGoLogin={() => setScreen('login')} />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <View style={styles.container}>
        <Root />
        <StatusBar style="light" />
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
