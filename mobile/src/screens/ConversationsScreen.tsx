import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors, spacing } from '../theme';

type Conversation = {
  id: number;
  client_id: number;
  artist_id: number;
  created_at: string;
  users: { name: string } | null; // cliente
  artist_profiles: { genre: string | null; users: { name: string } | null } | null;
};

export default function ConversationsScreen({
  onBack,
  onOpenChat,
}: {
  onBack: () => void;
  onOpenChat: (conversationId: number, title: string) => void;
}) {
  const { user } = useAuth();
  const [items, setItems] = useState<Conversation[] | null>(null);

  useEffect(() => {
    api
      .get<Conversation[]>('/chat')
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]));
  }, []);

  const isArtist = user?.role === 'artista';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backLink}>← Volver</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Mensajes</Text>

      {items === null ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: spacing.lg }} />
      ) : items.length === 0 ? (
        <Text style={styles.placeholder}>
          No tienes conversaciones. Abre el perfil de un artista y pulsa “Chatear”.
        </Text>
      ) : (
        items.map((c) => {
          const name = isArtist
            ? c.users?.name || 'Cliente'
            : c.artist_profiles?.users?.name || 'Artista';
          return (
            <TouchableOpacity
              key={c.id}
              style={styles.row}
              onPress={() => onOpenChat(c.id, name)}
              activeOpacity={0.85}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{name}</Text>
                {!isArtist && c.artist_profiles?.genre ? (
                  <Text style={styles.meta}>{c.artist_profiles.genre}</Text>
                ) : null}
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: 56, paddingBottom: 48 },
  backBtn: { marginBottom: spacing.md },
  backLink: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: spacing.lg },
  placeholder: { color: colors.muted, fontSize: 14, marginTop: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: { color: colors.text, fontSize: 18, fontWeight: '800' },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  chevron: { color: colors.muted, fontSize: 24 },
});
