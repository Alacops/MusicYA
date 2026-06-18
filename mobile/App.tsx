import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import ArtistDetailScreen from './src/screens/ArtistDetailScreen';
import BookingsScreen from './src/screens/BookingsScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import MapScreen from './src/screens/MapScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import { colors } from './src/theme';

// Navegación del área autenticada
type Route =
  | { name: 'home' }
  | { name: 'artist'; id: number }
  | { name: 'bookings' }
  | { name: 'map' }
  | { name: 'payment'; bookingId: number };

function AuthedApp() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const goHome = () => setRoute({ name: 'home' });
  const goBookings = () => setRoute({ name: 'bookings' });
  const openArtist = (id: number) => setRoute({ name: 'artist', id });

  if (route.name === 'artist') {
    return <ArtistDetailScreen artistId={route.id} onBack={goHome} />;
  }
  if (route.name === 'bookings') {
    return <BookingsScreen onBack={goHome} onPay={(id) => setRoute({ name: 'payment', bookingId: id })} />;
  }
  if (route.name === 'payment') {
    return <PaymentScreen bookingId={route.bookingId} onBack={goBookings} onPaid={goBookings} />;
  }
  if (route.name === 'map') {
    return <MapScreen onBack={goHome} onOpenArtist={openArtist} />;
  }
  return (
    <HomeScreen
      onOpenArtist={openArtist}
      onOpenBookings={() => setRoute({ name: 'bookings' })}
      onOpenMap={() => setRoute({ name: 'map' })}
    />
  );
}

// Enrutado mínimo basado en estado: si no hay sesión muestra el flujo de
// autenticación (login/registro); si la hay, el área autenticada.
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

  if (user) return <AuthedApp />;

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
