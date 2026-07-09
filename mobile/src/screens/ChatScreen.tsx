import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import GlassButton from '../components/GlassButton';
import { useSocket } from '../socket/SocketContext';
import { colors, spacing } from '../theme';

type Message = {
  id: number;
  conversation_id?: number;
  sender_id: number;
  body: string;
  created_at: string;
};

export default function ChatScreen({
  conversationId,
  title,
  onBack,
}: {
  conversationId: number;
  title: string;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const socket = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Historial inicial
  useEffect(() => {
    api
      .get<{ conversationId: number; messages: Message[] }>(`/chat/${conversationId}/messages`)
      .then((d) => setMessages(d.messages || []))
      .catch((e) => setError(e.message || 'No se pudo cargar el chat'));
  }, [conversationId]);

  // Tiempo real: unirse a la sala y escuchar mensajes nuevos
  useEffect(() => {
    if (!socket) return;
    socket.emit('chat:join', conversationId);

    const onMessage = (m: Message) => {
      if (m.conversation_id === conversationId) {
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      }
    };
    const onError = (e: { message: string }) => setError(e.message);

    socket.on('chat:message', onMessage);
    socket.on('chat:error', onError);
    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:error', onError);
    };
  }, [socket, conversationId]);

  // Auto-scroll al final cuando llegan mensajes
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  function send() {
    const body = text.trim();
    if (!body) return;
    setError(null);
    setText('');
    if (socket) {
      // El servidor persiste y reenvía a la sala (incl. al emisor)
      socket.emit('chat:message', { conversationId, body });
    } else {
      // Respaldo por REST si el socket no está disponible
      api
        .post<Message>(`/chat/${conversationId}/messages`, { body })
        .then((m) => setMessages((prev) => [...prev, m]))
        .catch((e) => setError(e.message || 'No se pudo enviar'));
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backLink}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView ref={scrollRef} contentContainerStyle={styles.messages}>
        {messages.map((m) => {
          const mine = Number(m.sender_id) === Number(user?.id);
          return (
            <View key={m.id} style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{m.body}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Escribe un mensaje…"
          placeholderTextColor={colors.muted}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <GlassButton title="Enviar" size="sm" onPress={send} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  backLink: { color: colors.accent, fontSize: 24, fontWeight: '700', marginRight: spacing.md },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  errorBox: { backgroundColor: '#3B1219', padding: spacing.sm },
  errorText: { color: '#FCA5A5', fontSize: 12, textAlign: 'center' },
  messages: { padding: spacing.lg, flexGrow: 1 },
  bubbleRow: { flexDirection: 'row', marginBottom: spacing.sm },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: spacing.md, paddingVertical: 10 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  bubbleText: { color: colors.text, fontSize: 15 },
  bubbleTextMine: { color: '#fff' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
  },
});
