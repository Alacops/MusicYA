import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { SOCKET_URL } from '../config';

export type Notification = {
  id: number;
  title: string | null;
  body: string | null;
  is_read: boolean;
  created_at: string;
};

type NotificationsState = {
  items: Notification[];
  unreadCount: number;
  refresh: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsState | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<{ unread_count: number; notifications: Notification[] }>('/notifications');
      setItems(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch {
      // silencioso: la campana simplemente no se actualiza
    }
  }, []);

  // Carga inicial + suscripción en tiempo real cuando hay sesión
  useEffect(() => {
    if (!token) {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    refresh();

    const socket: Socket = io(SOCKET_URL, { auth: { token } });
    socket.on('notification:new', (n: Notification) => {
      setItems((prev) => [n, ...prev]);
      setUnreadCount((c) => c + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [token, refresh]);

  async function markRead(id: number) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await api.patch(`/notifications/${id}/read`, {});
    } catch {
      refresh();
    }
  }

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await api.patch('/notifications/read-all', {});
    } catch {
      refresh();
    }
  }

  return (
    <NotificationsContext.Provider value={{ items, unreadCount, refresh, markRead, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications debe usarse dentro de NotificationsProvider');
  return ctx;
}
