import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNotifications } from '../notifications/NotificationsContext';
import { colors, spacing } from '../theme';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(iso).toLocaleDateString('es-PE');
}

export default function NotificationsScreen({ onBack }: { onBack: () => void }) {
  const { items, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backLink}>← Volver</Text>
      </TouchableOpacity>

      <View style={styles.headerRow}>
        <Text style={styles.title}>Notificaciones</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={styles.allBtn}>
            <Text style={styles.allText}>Marcar todas</Text>
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <Text style={styles.placeholder}>No tienes notificaciones.</Text>
      ) : (
        items.map((n) => (
          <TouchableOpacity
            key={n.id}
            style={[styles.card, !n.is_read && styles.cardUnread]}
            onPress={() => !n.is_read && markRead(n.id)}
            activeOpacity={0.85}
          >
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{n.title || 'Notificación'}</Text>
              {!n.is_read && <View style={styles.dot} />}
            </View>
            {n.body ? <Text style={styles.cardBody}>{n.body}</Text> : null}
            <Text style={styles.cardTime}>{timeAgo(n.created_at)}</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: 56, paddingBottom: 48 },
  backBtn: { marginBottom: spacing.md },
  backLink: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', flex: 1 },
  allBtn: { backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20 },
  allText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  placeholder: { color: colors.muted, fontSize: 14, marginTop: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700', flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginLeft: spacing.sm },
  cardBody: { color: colors.muted, fontSize: 14, marginTop: 4 },
  cardTime: { color: colors.muted, fontSize: 12, marginTop: 6 },
});
