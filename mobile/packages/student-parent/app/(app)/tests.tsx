import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { mobileApp, type TestsResponse } from '@360schoolerp/shared';
import { ChildHeader } from '../../src/components/ChildHeader';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { useStudentParams } from '../../src/context/StudentContext';
import { colors } from '../../src/theme';

export default function TestsScreen() {
  const params = useStudentParams();
  const [data, setData] = useState<TestsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await mobileApp.tests(params));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tests');
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

      {data && data.papers.length === 0 ? (
        <EmptyState title="No tests available" message="Published test papers will appear here." />
      ) : null}

      {data?.papers.map((paper) => (
        <Card key={paper.id}>
          <Text style={styles.subject}>{paper.subjectName}</Text>
          <Text style={styles.title}>{paper.title}</Text>
          <Text style={styles.meta}>
            {paper.purposeLabel ? `${paper.purposeLabel} · ` : ''}
            {paper.durationMinutes ? `${paper.durationMinutes} min · ` : ''}
            {paper.questionCount ? `${paper.questionCount} questions` : ''}
          </Text>
          {paper.mobilePublishedAt ? (
            <Text style={styles.published}>
              Published {new Date(paper.mobilePublishedAt).toLocaleDateString()}
            </Text>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subject: { fontSize: 12, fontWeight: '600', color: colors.primary, textTransform: 'uppercase' },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 4 },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 8 },
  published: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
});
