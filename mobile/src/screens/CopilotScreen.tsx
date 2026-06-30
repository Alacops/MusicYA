import { useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { colors, fonts, radius, spacing } from '../theme';

type Msg = { role: 'user' | 'assistant'; content: string };

const WELCOME: Msg = {
  role: 'assistant',
  content:
    '¡Hola! Soy el asistente de MusicYA 🎵 Puedo ayudarte con reservas, pagos con QR, tarifas, el mapa de artistas y la verificación de artistas. ¿En qué te ayudo?',
};

const SUGGESTIONS = [
  '¿Cómo reservo un artista?',
  '¿Cómo funciona la verificación?',
  '¿Cómo pago con QR?',
];

export default function CopilotScreen({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  async function send(raw?: string) {
    const content = (raw ?? text).trim();
    if (!content || sending) return;
    setText('');
    const history = messages; // contexto previo (el backend recorta y valida)
    setMessages((prev) => [...prev, { role: 'user', content }]);
    setSending(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const res = await api.post<{ reply: string }>('/chat/bot', { message: content, history });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Lo siento, hubo un problema. Inténtalo de nuevo.' },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🤖 Asistente IA</Text>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.messages}>
        {messages.map((m, i) => {
          const mine = m.role === 'user';
          return (
            <View key={i} style={[styles.row, mine ? styles.rowMine : styles.rowBot]}>
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleBot]}>
                <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{m.content}</Text>
              </View>
            </View>
          );
        })}

        {sending && (
          <View style={[styles.row, styles.rowBot]}>
            <View style={[styles.bubble, styles.bubbleBot]}>
              <ActivityIndicator color={colors.muted} />
            </View>
          </View>
        )}

        {messages.length <= 1 && (
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity key={s} style={styles.chip} onPress={() => send(s)} activeOpacity={0.85}>
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Escribe tu pregunta…"
          placeholderTextColor={colors.muted}
          onSubmitEditing={() => send()}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={() => send()} activeOpacity={0.85}>
          <Text style={styles.sendText}>Enviar</Text>
        </TouchableOpacity>
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
  back: { color: colors.accent, fontSize: 24, fontFamily: fonts.display, marginRight: spacing.md },
  title: { color: colors.text, fontSize: 18, fontFamily: fonts.display },
  messages: { padding: spacing.lg, flexGrow: 1 },
  row: { flexDirection: 'row', marginBottom: spacing.sm },
  rowMine: { justifyContent: 'flex-end' },
  rowBot: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 10 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleBot: { backgroundColor: colors.surfaceAlt, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bubbleText: { color: colors.text, fontSize: 15, lineHeight: 21, fontFamily: fonts.regular },
  bubbleTextMine: { color: '#fff' },
  suggestions: { marginTop: spacing.md, gap: spacing.sm },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  chipText: { color: colors.accent, fontSize: 13, fontFamily: fonts.medium },
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
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    fontFamily: fonts.regular,
  },
  sendBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 10 },
  sendText: { color: '#fff', fontSize: 14, fontFamily: fonts.bold },
});
