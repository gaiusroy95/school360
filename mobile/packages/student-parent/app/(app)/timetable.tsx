import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { mobileApp, type TimetableResponse } from '@360schoolerp/shared';
import { ChildHeader } from '../../src/components/ChildHeader';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { useStudentParams } from '../../src/context/StudentContext';
import { colors } from '../../src/theme';

export default function TimetableScreen() {
  const params = useStudentParams();
  const [data, setData] = useState<TimetableResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await mobileApp.timetable(params));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load timetable');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

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
      <ChildHeader />

      {data ? (
        <Text style={styles.header}>
          {data.dayLabel} · {data.date}
          {data.className ? ` · ${data.className}-${data.sectionName}` : ''}
        </Text>
      ) : null}

      {data && data.schedule.length === 0 ? (
        <EmptyState title="No classes scheduled" message="There is no published timetable for today." />
      ) : null}

      {data?.schedule.map((p) => (
        <Card key={`${p.periodNumber}-${p.time}`}>
          <Text style={styles.time}>
            {p.period} · {p.time}
          </Text>
          <Text style={styles.subject}>{p.subject}</Text>
          {p.teacher ? <Text style={styles.teacher}>{p.teacher}</Text> : null}
          {p.room ? <Text style={styles.room}>Room {p.room}</Text> : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 14, color: colors.textMuted, marginBottom: 12 },
  time: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  subject: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 4 },
  teacher: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  room: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
