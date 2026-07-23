import { useCallback, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { mobileStaff, type StaffEvaluation } from '@360schoolerp/shared';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { StyleSheet, Text } from 'react-native';
import { colors } from '../../src/theme';

export default function EvaluationsScreen() {
  const [records, setRecords] = useState<StaffEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await mobileStaff.evaluations();
    setRecords(res.records as StaffEvaluation[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <Stack.Screen options={{ title: 'CCE evaluations', headerShown: true }} />
      <Screen loading={loading} onRefresh={load}>
        {records.length === 0 ? <EmptyState title="No evaluations" /> : null}
        {records.map((r) => (
          <Card key={r.id}>
            <Text style={styles.title}>{r.classGroup}</Text>
            <Text style={styles.meta}>{r.subjectName} · {r.statusLabel}</Text>
          </Card>
        ))}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});
