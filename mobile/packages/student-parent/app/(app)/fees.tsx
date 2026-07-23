import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import { mobileApp, type FeesResponse } from '@360schoolerp/shared';
import { ChildHeader } from '../../src/components/ChildHeader';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { useStudentParams } from '../../src/context/StudentContext';
import { colors, spacing } from '../../src/theme';

export default function FeesScreen() {
  const params = useStudentParams();
  const [data, setData] = useState<FeesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await mobileApp.fees(params));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load fees');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    void load();
  }, [load]);

  async function payDue(feeDueId: string) {
    setPayingId(feeDueId);
    try {
      const order = await mobileApp.createPaymentOrder(feeDueId);
      if (order.stub) {
        Alert.alert(
          'Payment not configured',
          String(order.message || 'Razorpay keys are not set on the server.'),
        );
        return;
      }
      Alert.alert(
        'Payment initiated',
        `Order ${order.providerOrderId} created for INR ${order.amount}. Complete payment in the Razorpay checkout (integrate react-native-razorpay in production).`,
      );
    } catch (e) {
      Alert.alert('Payment failed', e instanceof Error ? e.message : 'Could not start payment');
    } finally {
      setPayingId(null);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Fees', headerShown: true }} />
      <Screen loading={loading} error={error} onRefresh={load}>
        <ChildHeader />

        {data ? (
          <Card>
            <Text style={styles.summaryLabel}>Pending</Text>
            <Text style={styles.summaryAmount}>
              {data.summary.currency} {data.summary.pendingAmount.toLocaleString()}
            </Text>
            <Text style={styles.paid}>Paid: {data.summary.currency} {data.summary.paidAmount.toLocaleString()}</Text>
          </Card>
        ) : null}

        {data && data.dues.length === 0 ? (
          <EmptyState title="No pending fees" message="All dues are cleared for this term." />
        ) : null}

        {data?.dues.map((due) => (
          <Card key={due.id}>
            <Text style={styles.dueTitle}>{due.title}</Text>
            <Text style={styles.dueMeta}>
              {due.feeHeadLabel} · Due {due.dueDate} · {due.status}
            </Text>
            <Text style={styles.amount}>INR {due.amount.toLocaleString()}</Text>
            {due.status !== 'PAID' && data.paymentsEnabled ? (
              <Pressable
                style={styles.payBtn}
                onPress={() => payDue(due.id)}
                disabled={payingId === due.id}
              >
                <Text style={styles.payText}>{payingId === due.id ? 'Starting…' : 'Pay now'}</Text>
              </Pressable>
            ) : null}
          </Card>
        ))}

        {data && data.receipts.length > 0 ? (
          <>
            <Text style={styles.section}>Recent receipts</Text>
            {data.receipts.map((r) => (
              <Card key={r.id}>
                <Text style={styles.dueTitle}>{r.receiptNumber}</Text>
                <Text style={styles.dueMeta}>
                  INR {r.amountPaid.toLocaleString()} · {new Date(r.collectedAt).toLocaleDateString()}
                </Text>
              </Card>
            ))}
          </>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  summaryLabel: { fontSize: 13, color: colors.textMuted },
  summaryAmount: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 4 },
  paid: { fontSize: 14, color: colors.success, marginTop: 4 },
  dueTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  dueMeta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  amount: { fontSize: 18, fontWeight: '700', color: colors.primary, marginTop: 8 },
  payBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  payText: { color: '#fff', fontWeight: '700' },
  section: { fontSize: 16, fontWeight: '700', color: colors.text, marginVertical: spacing.sm },
});
