import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { mobileStaff, type StaffLeaveItem } from '@360schoolerp/shared';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { colors, spacing } from '../../src/theme';

export default function ApprovalsScreen() {
  const [items, setItems] = useState<StaffLeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await mobileStaff.pendingLeaveApprovals();
      setItems(res.items.filter((i) => i.status === 'PENDING'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(item: StaffLeaveItem) {
    try {
      await mobileStaff.approveLeave(item.id, { category: item.category });
      void load();
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Could not approve');
    }
  }

  async function reject(item: StaffLeaveItem) {
    try {
      await mobileStaff.rejectLeave(item.id, { category: item.category, remarks: 'Rejected on mobile' });
      void load();
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Could not reject');
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Leave approvals', headerShown: true }} />
      <Screen loading={loading} error={error} onRefresh={load}>
        {items.length === 0 ? <EmptyState title="No pending approvals" /> : null}
        {items.map((item) => (
          <Card key={item.id}>
            <Text style={styles.cat}>{item.categoryLabel || item.category}</Text>
            <Text style={styles.name}>{item.applicantName || 'Applicant'}</Text>
            <Text style={styles.meta}>
              {item.leaveTypeLabel} · {item.fromDate} → {item.toDate}
            </Text>
            <Text style={styles.reason}>{item.reason}</Text>
            <View style={styles.actions}>
              <Pressable style={styles.approve} onPress={() => approve(item)}>
                <Text style={styles.btnText}>Approve</Text>
              </Pressable>
              <Pressable style={styles.reject} onPress={() => reject(item)}>
                <Text style={styles.rejectText}>Reject</Text>
              </Pressable>
            </View>
          </Card>
        ))}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  cat: { fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  name: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 4 },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  reason: { fontSize: 14, color: colors.text, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  approve: { flex: 1, backgroundColor: colors.success, borderRadius: 8, padding: 10, alignItems: 'center' },
  reject: { flex: 1, borderWidth: 1, borderColor: colors.danger, borderRadius: 8, padding: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  rejectText: { color: colors.danger, fontWeight: '700' },
});
