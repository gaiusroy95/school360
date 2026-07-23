import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import { mobileApp, uploadFileUrl, type LmsResponse } from '@360schoolerp/shared';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { useStudentParams } from '../../src/context/StudentContext';
import { colors, spacing } from '../../src/theme';

export default function LmsScreen() {
  const params = useStudentParams();
  const [data, setData] = useState<LmsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await mobileApp.lms(params));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load LMS content');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen loading={loading} error={error} onRefresh={load}>
      {data && data.chapters.length === 0 ? (
        <EmptyState title="No LMS content" message="Chapter resources from your teachers will appear here." />
      ) : null}

      {data?.chapters.map((ch) => (
        <Card key={ch.id}>
          <Text style={styles.subject}>{ch.subjectName}</Text>
          <Text style={styles.title}>{ch.chapterTitle}</Text>
          {ch.teacherInstructions ? (
            <Text style={styles.instructions}>{ch.teacherInstructions}</Text>
          ) : null}

          {ch.mediaItems.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => Linking.openURL(uploadFileUrl(item.url))}
              style={styles.mediaRow}
            >
              <Text style={styles.mediaType}>{item.type.toUpperCase()}</Text>
              <Text style={styles.mediaTitle}>{item.title}</Text>
            </Pressable>
          ))}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subject: { fontSize: 12, fontWeight: '600', color: colors.primary, textTransform: 'uppercase' },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 4 },
  instructions: { fontSize: 14, color: colors.textMuted, marginTop: 8, lineHeight: 20 },
  mediaRow: {
    marginTop: spacing.sm,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mediaType: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  mediaTitle: { fontSize: 14, color: colors.primary, fontWeight: '600', marginTop: 2 },
});
