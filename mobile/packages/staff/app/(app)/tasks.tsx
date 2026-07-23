import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { mobileStaff, type StaffTask } from '@360schoolerp/shared';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { colors, spacing } from '../../src/theme';

export default function TasksScreen() {
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await mobileStaff.tasks();
      setTasks(res.tasks);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function completeTask(id: string) {
    try {
      await mobileStaff.updateTask(id, { status: 'COMPLETED' });
      void load();
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Could not update task');
    }
  }

  return (
    <Screen loading={loading} error={error} onRefresh={load}>
      {tasks.length === 0 ? <EmptyState title="No tasks" message="Assigned roster tasks will appear here." /> : null}
      {tasks.map((t) => (
        <Card key={t.id}>
          <Text style={styles.type}>{t.taskTypeLabel}</Text>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.meta}>
            {t.classGroup} · {t.statusLabel}
            {t.isOverdue ? ' · Overdue' : ''}
          </Text>
          {t.dueDate ? <Text style={styles.meta}>Due {new Date(t.dueDate).toLocaleDateString()}</Text> : null}
          {t.status !== 'COMPLETED' ? (
            <Pressable style={styles.btn} onPress={() => completeTask(t.id)}>
              <Text style={styles.btnText}>Mark completed</Text>
            </Pressable>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  type: { fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 4 },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  btn: { marginTop: spacing.sm, backgroundColor: colors.success, borderRadius: 8, padding: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});
