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
import FeaturedScreen from './src/screens/FeaturedScreen';
import HomeScreen from './src/screens/HomeScreen';
import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import MapScreen from './src/screens/MapScreen';
import MetricsScreen from './src/screens/MetricsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import PortfolioScreen from './src/screens/PortfolioScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import SearchScreen from './src/screens/SearchScreen';
import { NotificationsProvider } from './src/notifications/NotificationsContext';
import { SocketProvider } from './src/socket/SocketContext';
import { colors } from './src/theme';

// Navegación del área autenticada
type Route =
  | { name: 'home' }
  | { name: 'artist'; id: number }
  | { name: 'bookings' }
  | { name: 'map' }
  | { name: 'search' }
  | { name: 'featured' }
  | { name: 'payment'; bookingId: number }
  | { name: 'notifications' }
  | { name: 'conversations' }
  | { name: 'chat'; conversationId: number; title: string }
  | { name: 'copilot' }
  | { name: 'portfolio' }
  | { name: 'metrics' };

// Sirve tanto al usuario autenticado como al invitado (isGuest). En modo invitado
// las acciones que requieren cuenta (reservar, chat, notificaciones) llaman a
// onRequireLogin en vez de navegar.
function AuthedApp({
  isGuest = false,
  onRequireLogin,
  onRequireRegister,
}: {
  isGuest?: boolean;
  onRequireLogin?: () => void;
  onRequireRegister?: () => void;
}) {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const goHome = () => setRoute({ name: 'home' });
  const goBookings = () => setRoute({ name: 'bookings' });
  const openArtist = (id: number) => setRoute({ name: 'artist', id });
  const openChat = (conversationId: number, title: string) =>
    setRoute({ name: 'chat', conversationId, title });

  const requireLogin = onRequireLogin ?? (() => {});
  // Envuelve una navegación que exige cuenta: invitado → pide login
  const gated = (fn: () => void) => (isGuest ? requireLogin : fn);

  if (route.name === 'artist') {
    return (
      <ArtistDetailScreen
        artistId={route.id}
        onBack={goHome}
        onOpenConversation={openChat}
        isGuest={isGuest}
        onRequireLogin={requireLogin}
      />
    );
  }
  if (route.name === 'bookings') {
    return <BookingsScreen onBack={goHome} onPay={(id) => setRoute({ name: 'payment', bookingId: id })} />;
  }
  if (route.name === 'payment') {
    return <PaymentScreen bookingId={route.bookingId} onBack={goHome} onPaid={goHome} />;
  }
  if (route.name === 'map') {
    return <MapScreen onBack={goHome} onOpenArtist={openArtist} />;
  }
  if (route.name === 'search') {
    return <SearchScreen onBack={goHome} onOpenArtist={openArtist} />;
  }
  if (route.name === 'featured') {
    return <FeaturedScreen onBack={goHome} onOpenArtist={openArtist} />;
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
  if (route.name === 'portfolio') {
    return <PortfolioScreen onBack={goHome} />;
  }
  if (route.name === 'metrics') {
    return <MetricsScreen onBack={goHome} />;
  }
  return (
    <HomeScreen
      isGuest={isGuest}
      onRequireLogin={requireLogin}
      onOpenRegister={onRequireRegister}
      onOpenArtist={openArtist}
      onOpenPortfolio={() => setRoute({ name: 'portfolio' })}
      onOpenBookings={gated(() => setRoute({ name: 'bookings' }))}
      onOpenMap={() => setRoute({ name: 'map' })}
      onOpenSearch={() => setRoute({ name: 'search' })}
      onOpenFeatured={() => setRoute({ name: 'featured' })}
      onOpenNotifications={gated(() => setRoute({ name: 'notifications' }))}
      onOpenChat={gated(() => setRoute({ name: 'conversations' }))}
      onOpenCopilot={() => setRoute({ name: 'copilot' })}
      onOpenMetrics={() => setRoute({ name: 'metrics' })}
      onPay={(id) => (isGuest ? requireLogin() : setRoute({ name: 'payment', bookingId: id }))}
    />
  );
}

// Enrutado basado en estado. Sin sesión: landing pública → explorar como invitado
// o autenticarse. Con sesión: área autenticada. Los providers de socket y
// notificaciones son inertes sin token, así que envuelven también al invitado.
function Root() {
  const { user, loading } = useAuth();
  // El Home (como invitado) es lo primero que se ve al abrir la app; desde ahí se
  // inicia sesión o se crea cuenta con los botones de la barra superior.
  const [publicView, setPublicView] = useState<'landing' | 'login' | 'register' | 'guest'>('guest');

  // Mientras se restaura la sesión guardada, evita parpadear la landing
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  let content;
  if (user) {
    content = <AuthedApp />;
  } else if (publicView === 'guest') {
    content = (
      <AuthedApp
        isGuest
        onRequireLogin={() => setPublicView('login')}
        onRequireRegister={() => setPublicView('register')}
      />
    );
  } else if (publicView === 'login') {
    content = (
      <LoginScreen
        onGoRegister={() => setPublicView('register')}
        onBack={() => setPublicView('guest')}
      />
    );
  } else if (publicView === 'register') {
    content = (
      <RegisterScreen
        onGoLogin={() => setPublicView('login')}
        onBack={() => setPublicView('guest')}
      />
    );
  } else {
    content = (
      <LandingScreen
        onExplore={() => setPublicView('guest')}
        onLogin={() => setPublicView('login')}
        onRegister={() => setPublicView('register')}
      />
    );
  }

  return (
    <SocketProvider>
      <NotificationsProvider>{content}</NotificationsProvider>
    </SocketProvider>
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
