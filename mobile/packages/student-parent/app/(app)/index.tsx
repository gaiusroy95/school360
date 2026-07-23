import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { mobileApp, type DashboardResponse } from '@360schoolerp/shared';
import { ChildHeader } from '../../src/components/ChildHeader';
import { Card, StatCard } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { useStudentParams } from '../../src/context/StudentContext';
import { colors, spacing } from '../../src/theme';

export default function DashboardScreen() {
  const params = useStudentParams();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await mobileApp.dashboard(params);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
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
        <>
          <View style={styles.hero}>
            <Text style={styles.greeting}>Hello, {data.studentName}</Text>
            <Text style={styles.classGroup}>{data.classGroup}</Text>
            <Text style={styles.year}>{data.academicYear}</Text>
          </View>

          <Text style={styles.section}>Attendance — {data.attendance.month}</Text>
          <View style={styles.statsRow}>
            <StatCard label="Present" value={data.attendance.present} accent={colors.success} />
            <View style={styles.gap} />
            <StatCard label="Absent" value={data.attendance.absent} accent={colors.danger} />
            <View style={styles.gap} />
            <StatCard label="%" value={`${data.attendance.attendancePercent}%`} accent={colors.primary} />
          </View>

          <Text style={styles.section}>Academic performance</Text>
          <Card>
            <Text style={styles.metric}>
              Overall: {Math.round(data.performance.academicPerformance)}%
            </Text>
            <Text style={styles.submetric}>
              Class test average: {Math.round(data.performance.classTestAvg)}%
            </Text>
            {data.performance.subjectPerformance.slice(0, 3).map((s) => (
              <Text key={s.subjectName} style={styles.subjectRow}>
                {s.subjectName}: {Math.round(s.avgScore)}%
              </Text>
            ))}
          </Card>

          {data.extracurricular.totalActivities > 0 ? (
            <>
              <Text style={styles.section}>Co-scholastic</Text>
              <Card>
                <Text style={styles.submetric}>
                  {data.extracurricular.withPerformance} of {data.extracurricular.totalActivities}{' '}
                  activities graded
                </Text>
                {data.extracurricular.recent.map((a) => (
                  <Text key={a.id} style={styles.subjectRow}>
                    {a.title} — {a.band ?? 'Pending'}
                  </Text>
                ))}
              </Card>
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: '#fff' },
  classGroup: { fontSize: 15, color: '#dbeafe', marginTop: 4 },
  year: { fontSize: 13, color: '#bfdbfe', marginTop: 2 },
  section: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  statsRow: { flexDirection: 'row', marginBottom: spacing.md },
  gap: { width: spacing.sm },
  metric: { fontSize: 18, fontWeight: '700', color: colors.text },
  submetric: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  subjectRow: { fontSize: 14, color: colors.text, marginTop: 8 },
});
