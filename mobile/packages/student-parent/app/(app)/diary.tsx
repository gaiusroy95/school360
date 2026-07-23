import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import { mobileApp, uploadFileUrl, type HomeworkResponse } from '@360schoolerp/shared';
import { ChildHeader } from '../../src/components/ChildHeader';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { useStudentParams } from '../../src/context/StudentContext';
import { colors, spacing } from '../../src/theme';

export default function DiaryScreen() {
  const params = useStudentParams();
  const [data, setData] = useState<HomeworkResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await mobileApp.homework(params));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load diary');
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

      {data && data.homework.length === 0 ? (
        <EmptyState title="No homework today" message="Check back later for daily diary updates." />
      ) : null}

      {data?.homework.map((hw) => (
        <Card key={hw.id}>
          <Text style={styles.subject}>{hw.subjectName}</Text>
          <Text style={styles.title}>{hw.title}</Text>
          {hw.description ? <Text style={styles.desc}>{hw.description}</Text> : null}
          <Text style={styles.meta}>
            Due: {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString() : '—'} · {hw.statusLabel}
          </Text>

          {(hw.attachments || []).map((att, i) => {
            const url = att.url ? uploadFileUrl(att.url) : null;
            if (!url) return null;
            return (
              <Pressable key={att.id || i} onPress={() => Linking.openURL(url)}>
                <Text style={styles.attachment}>📎 {att.title || att.fileName || 'Open attachment'}</Text>
              </Pressable>
            );
          })}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subject: { fontSize: 12, fontWeight: '600', color: colors.primary, textTransform: 'uppercase' },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 4 },
  desc: { fontSize: 14, color: colors.textMuted, marginTop: 8, lineHeight: 20 },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
  attachment: { fontSize: 14, color: colors.primary, marginTop: 8, fontWeight: '600' },
});
