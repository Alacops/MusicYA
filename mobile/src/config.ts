import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Deriva el host del backend automáticamente para que la app funcione en
// web, emulador y dispositivo físico (Expo Go) sin hardcodear la IP de la PC.
function resolveHost(): string {
  // Web: usar el host desde el que se sirve la página
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return window.location.hostname;
    }
    return 'localhost';
  }

  // Nativo: hostUri viene como "192.168.x.x:8081" (la PC que sirve Metro).
  // Reutilizamos esa IP para alcanzar el backend en el puerto 4000.
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants.expoGoConfig as any)?.debuggerHost ||
    '';
  const host = hostUri.split(':')[0];
  if (host) return host;

  // Fallback: el emulador de Android mapea la PC anfitriona en 10.0.2.2
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
}

const HOST = resolveHost();

export const API_URL = `http://${HOST}:4000/api`;
export const SOCKET_URL = `http://${HOST}:4000`;
