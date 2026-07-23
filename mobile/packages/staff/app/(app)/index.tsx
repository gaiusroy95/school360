import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { mobileStaff, type StaffDashboard } from '@360schoolerp/shared';
import { Card, StatCard } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { useAuth } from '../../src/context/AuthContext';
import { colors, spacing } from '../../src/theme';

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<StaffDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await mobileStaff.dashboard());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen loading={loading} error={error} onRefresh={load}>
      {data ? (
        <>
          <View style={styles.hero}>
            <Text style={styles.greeting}>Hello, {data.displayName}</Text>
            <Text style={styles.role}>{data.role}{data.department ? ` · ${data.department}` : ''}</Text>
          </View>

          <View style={styles.statsRow}>
            {user?.role === 'TRANSPORT' ? (
              <StatCard label="Active vehicles" value={data.summary.activeVehicles ?? 0} />
            ) : (
              <>
                <StatCard label="Tasks pending" value={data.summary.tasksPending ?? 0} />
                <View style={styles.gap} />
                <StatCard label="Overdue" value={data.summary.tasksOverdue ?? 0} />
              </>
            )}
          </View>

          {user?.role === 'PRINCIPAL' ? (
            <Card>
              <Text style={styles.cardTitle}>Pending leave approvals</Text>
              <Text style={styles.big}>{data.summary.pendingLeaveApprovals ?? 0}</Text>
              <Pressable onPress={() => router.push('/(app)/approvals')}>
                <Text style={styles.link}>Review queue →</Text>
              </Pressable>
            </Card>
          ) : null}

          {user?.role === 'TEACHER' ? (
            <Card>
              <Text style={styles.cardTitle}>Quick links</Text>
              <LinkRow label="Class schedule" onPress={() => router.push('/(app)/schedule')} />
              <LinkRow label="Marks entry" onPress={() => router.push('/(app)/marks')} />
              <LinkRow label="CCE evaluations" onPress={() => router.push('/(app)/evaluations')} />
              <LinkRow label="Test papers" onPress={() => router.push('/(app)/papers')} />
              <LinkRow label="Self check-in" onPress={() => void mobileStaff.selfAttendance().then(load)} />
            </Card>
          ) : null}

          {user?.role === 'TRANSPORT' ? (
            <Card>
              <Pressable onPress={() => router.push('/(app)/transport')}>
                <Text style={styles.link}>Open GPS tracking →</Text>
              </Pressable>
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.linkRow}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primary, borderRadius: 16, padding: spacing.lg, marginBottom: spacing.md },
  greeting: { fontSize: 22, fontWeight: '700', color: '#fff' },
  role: { fontSize: 14, color: '#ede9fe', marginTop: 4 },
  statsRow: { flexDirection: 'row', marginBottom: spacing.md },
  gap: { width: spacing.sm },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  big: { fontSize: 32, fontWeight: '800', color: colors.text, marginVertical: 8 },
  link: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  linkRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
});
