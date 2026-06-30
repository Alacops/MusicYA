import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import ArtistDetailScreen from './src/screens/ArtistDetailScreen';
import BookingsScreen from './src/screens/BookingsScreen';
import ChatScreen from './src/screens/ChatScreen';
import ConversationsScreen from './src/screens/ConversationsScreen';
import CopilotScreen from './src/screens/CopilotScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import MapScreen from './src/screens/MapScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import { NotificationsProvider } from './src/notifications/NotificationsContext';
import { SocketProvider } from './src/socket/SocketContext';
import { colors } from './src/theme';

// Navegación del área autenticada
type Route =
  | { name: 'home' }
  | { name: 'artist'; id: number }
  | { name: 'bookings' }
  | { name: 'map' }
  | { name: 'payment'; bookingId: number }
  | { name: 'notifications' }
  | { name: 'conversations' }
  | { name: 'chat'; conversationId: number; title: string }
  | { name: 'copilot' };

function AuthedApp() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const goHome = () => setRoute({ name: 'home' });
  const goBookings = () => setRoute({ name: 'bookings' });
  const openArtist = (id: number) => setRoute({ name: 'artist', id });
  const openChat = (conversationId: number, title: string) =>
    setRoute({ name: 'chat', conversationId, title });

  if (route.name === 'artist') {
    return <ArtistDetailScreen artistId={route.id} onBack={goHome} onOpenConversation={openChat} />;
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
  if (route.name === 'notifications') {
    return <NotificationsScreen onBack={goHome} />;
  }
  if (route.name === 'conversations') {
    return <ConversationsScreen onBack={goHome} onOpenChat={openChat} />;
  }
  if (route.name === 'chat') {
    return (
      <ChatScreen
        conversationId={route.conversationId}
        title={route.title}
        onBack={() => setRoute({ name: 'conversations' })}
      />
    );
  }
  if (route.name === 'copilot') {
    return <CopilotScreen onBack={goHome} />;
  }
  return (
    <HomeScreen
      onOpenArtist={openArtist}
      onOpenBookings={() => setRoute({ name: 'bookings' })}
      onOpenMap={() => setRoute({ name: 'map' })}
      onOpenNotifications={() => setRoute({ name: 'notifications' })}
      onOpenChat={() => setRoute({ name: 'conversations' })}
      onOpenCopilot={() => setRoute({ name: 'copilot' })}
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

  if (user) {
    return (
      <SocketProvider>
        <NotificationsProvider>
          <AuthedApp />
        </NotificationsProvider>
      </SocketProvider>
    );
  }

  return screen === 'login' ? (
    <LoginScreen onGoRegister={() => setScreen('register')} />
  ) : (
    <RegisterScreen onGoLogin={() => setScreen('login')} />
  );
}

export default function App() {
  // Carga la tipografía Space Grotesk antes de renderizar la app
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={[styles.container, styles.loading]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

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
