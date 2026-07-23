import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { mobileStaff, type NotificationsResponse } from '@360schoolerp/shared';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { colors, spacing } from '../../src/theme';

export default function NotificationsScreen() {
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await mobileStaff.notifications());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen loading={loading} error={error} onRefresh={load}>
      {data && data.records.length === 0 ? <EmptyState title="No notifications" /> : null}
      {data?.records.map((n) => (
        <Pressable key={n.id} onPress={() => !n.isRead && mobileStaff.markNotificationRead(n.id).then(load)}>
          <Card>
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
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, color: colors.textMuted, marginTop: 6 },
  time: { fontSize: 11, color: colors.textMuted, marginTop: 8 },
});
