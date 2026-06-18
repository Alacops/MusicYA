import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAuthToken } from '../api/client';

export type Role = 'cliente' | 'artista';

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
  artist_profile?: { id: number; genre: string | null; city: string | null } | null;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
  // Solo para artistas
  genre?: string;
  city?: string;
  hourly_rate?: number;
  bio?: string;
};

type AuthResponse = { user: User; token: string };

type AuthState = {
  user: User | null;
  loading: boolean; // true mientras se restaura la sesión guardada
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
};

// Clave de almacenamiento de la sesión persistida
const STORAGE_KEY = 'musicya.session';

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Al arrancar, restaura la sesión guardada (token + usuario)
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const session = JSON.parse(raw) as AuthResponse;
          if (session.token) {
            setAuthToken(session.token);
            setUser(session.user);
          }
        }
      } catch {
        // sesión corrupta o ilegible: se ignora y se queda sin autenticar
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function persist(res: AuthResponse) {
    setAuthToken(res.token);
    setUser(res.user);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(res));
  }

  async function login(email: string, password: string) {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    await persist(res);
  }

  async function register(payload: RegisterPayload) {
    const res = await api.post<AuthResponse>('/auth/register', payload);
    await persist(res);
  }

  async function logout() {
    setAuthToken(null);
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
