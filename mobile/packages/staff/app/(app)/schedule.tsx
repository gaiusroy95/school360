import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import { mobileStaff } from '@360schoolerp/shared';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { colors } from '../../src/theme';

export default function ScheduleScreen() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setData(await mobileStaff.schedule());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const schedule = (data?.schedule as { period: string; time: string; subject: string; class: string }[]) || [];

  return (
    <>
      <Stack.Screen options={{ title: 'Schedule', headerShown: true }} />
      <Screen loading={loading} onRefresh={load}>
        <Text style={styles.header}>
          {String(data?.dayLabel || '')} · {String(data?.date || '')}
        </Text>
        {schedule.map((p, i) => (
          <Card key={i}>
            <Text style={styles.time}>{p.period} · {p.time}</Text>
            <Text style={styles.subject}>{p.subject}</Text>
            <Text style={styles.meta}>{p.class}</Text>
          </Card>
        ))}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 14, color: colors.textMuted, marginBottom: 12 },
  time: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  subject: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 4 },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});
