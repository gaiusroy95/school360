import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { mobileApp, type NotificationsResponse } from '@360schoolerp/shared';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { colors, spacing } from '../../src/theme';

export default function NotificationsScreen() {
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await mobileApp.notifications());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  async function markRead(id: string) {
    await mobileApp.markNotificationRead(id);
    void load();
  }

  async function markAllRead() {
    await mobileApp.markAllNotificationsRead();
    void load();
  }

  return (
    <Screen
      loading={loading}
      error={error}
      onRefresh={() => {
        setRefreshing(true);
        void load();
      }}
      refreshing={refreshing}
    >
      {data && data.unreadCount > 0 ? (
        <Pressable style={styles.markAll} onPress={markAllRead}>
          <Text style={styles.markAllText}>Mark all as read ({data.unreadCount})</Text>
        </Pressable>
      ) : null}

      {data && data.records.length === 0 ? (
        <EmptyState title="No notifications" message="Alerts from school will appear here." />
      ) : null}

      {data?.records.map((n) => (
        <Pressable key={n.id} onPress={() => !n.isRead && markRead(n.id)}>
          <Card style={!n.isRead ? styles.unread : undefined}>
            <View style={styles.row}>
              <Text style={styles.category}>{n.category}</Text>
              {!n.isRead ? <View style={styles.badge} /> : null}
            </View>
            <Text style={styles.title}>{n.title}</Text>
            <Text style={styles.body}>{n.body}</Text>
            <Text style={styles.time}>{new Date(n.createdAt).toLocaleString()}</Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  markAll: { marginBottom: spacing.md },
  markAllText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  unread: { borderColor: colors.primary, backgroundColor: '#f8fafc' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  category: { fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  badge: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 4 },
  body: { fontSize: 14, color: colors.textMuted, marginTop: 6, lineHeight: 20 },
  time: { fontSize: 11, color: colors.textMuted, marginTop: 8 },
});
