import { useCallback, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { mobileStaff } from '@360schoolerp/shared';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { StyleSheet, Text } from 'react-native';
import { colors } from '../../src/theme';

export default function MarksScreen() {
  const [assignments, setAssignments] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await mobileStaff.marksEntry();
    setAssignments((res.assignments as Record<string, unknown>[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <Stack.Screen options={{ title: 'Marks entry', headerShown: true }} />
      <Screen loading={loading} onRefresh={load}>
        {assignments.length === 0 ? (
          <EmptyState title="No marking sheets" message="Semester exam sheets assigned to you will appear here." />
        ) : null}
        {assignments.map((a, i) => {
          const assignment = a.assignment as Record<string, unknown>;
          const sheet = a.sheet as Record<string, unknown>;
          return (
            <Card key={i}>
              <Text style={styles.title}>{String(assignment.subjectName)}</Text>
              <Text style={styles.meta}>
                {String(assignment.className)} · {String(sheet?.status || 'DRAFT')}
              </Text>
              <Text style={styles.meta}>{String(a.studentCount)} students</Text>
            </Card>
          );
        })}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});
