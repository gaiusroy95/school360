import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import { mobileStaff } from '@360schoolerp/shared';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { colors, spacing } from '../../src/theme';

export default function PapersScreen() {
  const [papers, setPapers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await mobileStaff.papers();
    setPapers(res.papers);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function publish(id: string) {
    try {
      await mobileStaff.publishPaper(id);
      Alert.alert('Published', 'Test paper is now visible on student mobile app.');
      void load();
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Could not publish');
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Test papers', headerShown: true }} />
      <Screen loading={loading} onRefresh={load}>
        {papers.length === 0 ? <EmptyState title="No papers" message="Question papers from examination module appear here." /> : null}
        {papers.map((p) => (
          <Card key={String(p.id)}>
            <Text style={styles.title}>{String(p.title)}</Text>
            <Text style={styles.meta}>
              {String(p.subjectName)} · {String(p.classGroup)} · {p.isMobilePublished ? 'On mobile' : 'Draft'}
            </Text>
            {!p.isMobilePublished && p.canPublishToMobile ? (
              <Pressable style={styles.btn} onPress={() => publish(String(p.id))}>
                <Text style={styles.btnText}>Publish to mobile</Text>
              </Pressable>
            ) : null}
          </Card>
        ))}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  btn: { marginTop: spacing.sm, backgroundColor: colors.primary, borderRadius: 8, padding: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});
