import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { mobileApp, type ConsentItem } from '@360schoolerp/shared';
import { ChildHeader } from '../../src/components/ChildHeader';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { useStudentParams } from '../../src/context/StudentContext';
import { colors, spacing } from '../../src/theme';

export default function ConsentsScreen() {
  const params = useStudentParams();
  const [consents, setConsents] = useState<ConsentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await mobileApp.consents(params);
      setConsents(res.consents);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load consents');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    void load();
  }, [load]);

  async function respond(id: string, status: 'APPROVED' | 'REJECTED') {
    try {
      await mobileApp.respondConsent(id, { status });
      void load();
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Could not update consent');
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Consents', headerShown: true }} />
      <Screen loading={loading} error={error} onRefresh={load}>
        <ChildHeader />

        {consents.length === 0 ? (
          <EmptyState title="No consent requests" message="School consent forms will appear here." />
        ) : null}

        {consents.map((c) => (
          <Card key={c.id}>
            <Text style={styles.status}>{c.status}</Text>
            <Text style={styles.title}>{c.template.title}</Text>
            <Text style={styles.desc}>{c.template.description}</Text>
            {c.status === 'PENDING' ? (
              <View style={styles.actions}>
                <Pressable style={styles.approve} onPress={() => respond(c.id, 'APPROVED')}>
                  <Text style={styles.btnText}>Approve</Text>
                </Pressable>
                <Pressable style={styles.reject} onPress={() => respond(c.id, 'REJECTED')}>
                  <Text style={styles.rejectText}>Reject</Text>
                </Pressable>
              </View>
            ) : null}
          </Card>
        ))}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  status: { fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 4 },
  desc: { fontSize: 14, color: colors.textMuted, marginTop: 8, lineHeight: 20 },
  actions: { flexDirection: 'row', marginTop: spacing.md, gap: 8 },
  approve: {
    flex: 1,
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  reject: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
  rejectText: { color: colors.danger, fontWeight: '700' },
});
