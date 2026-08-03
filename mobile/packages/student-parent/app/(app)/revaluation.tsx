import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { mobileApp, type MobileRevaluationOverview } from '@360schoolerp/shared';
import { ChildHeader } from '../../src/components/ChildHeader';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { useStudentParams } from '../../src/context/StudentContext';
import { colors, radius, spacing } from '../../src/theme';

type Tab = 'requests' | 'new' | 'back';

export default function RevaluationScreen() {
  const params = useStudentParams();
  const [data, setData] = useState<MobileRevaluationOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>('requests');

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await mobileApp.revaluation(params));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load revaluation');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  async function createRequest(studentResultId: string, subjectName: string, requestType: 'REVALUATION' | 'RECHECK') {
    setBusy(true);
    try {
      const res = await mobileApp.createRevaluationRequest({
        ...params,
        studentResultId,
        subjectName,
        requestType,
      });
      Alert.alert('Request created', res.message);
      setTab('requests');
      await load();
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Could not create request');
    } finally {
      setBusy(false);
    }
  }

  async function payRequest(id: string) {
    setBusy(true);
    try {
      const res = await mobileApp.payRevaluationRequest(id, params);
      Alert.alert(
        res.paid || res.stub ? 'Fee paid' : 'Payment started',
        res.message || (res.stub
          ? `₹${res.amount} recorded (gateway not configured).`
          : `Order created for ₹${res.amount}. Complete Razorpay checkout in production.`),
      );
      await load();
    } catch (e) {
      Alert.alert('Payment failed', e instanceof Error ? e.message : 'Could not pay');
    } finally {
      setBusy(false);
    }
  }

  async function createBack(studentResultId: string, subjectName: string) {
    setBusy(true);
    try {
      const res = await mobileApp.createBackPaper({ ...params, studentResultId, subjectName });
      Alert.alert('Back paper', res.message);
      setTab('back');
      await load();
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Could not create');
    } finally {
      setBusy(false);
    }
  }

  async function payBack(id: string) {
    setBusy(true);
    try {
      const res = await mobileApp.payBackPaper(id, params);
      Alert.alert(
        res.paid || res.stub ? 'Fee paid' : 'Payment started',
        res.message || `Order for ₹${res.amount}`,
      );
      await load();
    } catch (e) {
      Alert.alert('Payment failed', e instanceof Error ? e.message : 'Could not pay');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Revaluation / Recheck', headerShown: true }} />
      <Screen loading={loading} error={error} onRefresh={load}>
        <ChildHeader />

        {data ? (
          <Card>
            <Text style={styles.cfg}>
              Grace {data.config.gracePeriodDays} days · Reval ₹{data.config.revaluationFee} · Recheck ₹
              {data.config.recheckFee} · Back paper ₹{data.config.backPaperFee}
            </Text>
          </Card>
        ) : null}

        <View style={styles.tabs}>
          {([
            ['requests', 'My Requests'],
            ['new', 'New Request'],
            ['back', 'Back Paper'],
          ] as const).map(([id, label]) => (
            <Pressable
              key={id}
              style={[styles.tab, tab === id && styles.tabActive]}
              onPress={() => setTab(id)}
            >
              <Text style={[styles.tabText, tab === id && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {busy ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} /> : null}

        {tab === 'requests' && (
          <>
            {data && data.requests.length === 0 ? (
              <EmptyState title="No requests" message="Create a revaluation or recheck within the grace period." />
            ) : null}
            {data?.requests.map((r) => (
              <Card key={r.id}>
                <Text style={styles.title}>{r.subjectName} · {r.requestType}</Text>
                <Text style={styles.meta}>{r.examinationName} · {r.status.replace(/_/g, ' ')}</Text>
                <Text style={styles.meta}>
                  Marks {r.originalMarks}/{r.originalMaxMarks}
                  {r.revisedMarks != null ? ` → ${r.revisedMarks}` : ''}
                </Text>
                <Text style={styles.amount}>
                  Fee ₹{r.feeAmount} {r.feePaid ? '✓ Paid' : '· Pending'}
                  {r.withinGracePeriod ? ` · ${r.daysLeftInGrace}d left` : ' · Grace expired'}
                </Text>
                {r.canPayFee && !r.feePaid ? (
                  <Pressable style={styles.payBtn} onPress={() => void payRequest(r.id)} disabled={busy}>
                    <Text style={styles.payText}>Pay fee</Text>
                  </Pressable>
                ) : null}
              </Card>
            ))}
          </>
        )}

        {tab === 'new' && (
          <>
            {data && data.eligible.length === 0 ? (
              <EmptyState
                title="No eligible subjects"
                message="No eligible students within grace period. Publish results first."
              />
            ) : null}
            {data?.eligible.map((e) => (
              <Card key={`${e.studentResultId}-${e.subjectName}`}>
                <Text style={styles.title}>{e.subjectName}</Text>
                <Text style={styles.meta}>
                  {e.examinationName} · {e.obtained}/{e.max} ({e.grade})
                </Text>
                <View style={styles.row}>
                  <Pressable
                    style={[styles.payBtn, styles.flex]}
                    disabled={busy}
                    onPress={() => void createRequest(e.studentResultId, e.subjectName, 'REVALUATION')}
                  >
                    <Text style={styles.payText}>Reval ₹{e.revaluationFee}</Text>
                  </Pressable>
                  <View style={{ width: 8 }} />
                  <Pressable
                    style={[styles.secondaryBtn, styles.flex]}
                    disabled={busy}
                    onPress={() => void createRequest(e.studentResultId, e.subjectName, 'RECHECK')}
                  >
                    <Text style={styles.secondaryText}>Recheck ₹{e.recheckFee}</Text>
                  </Pressable>
                </View>
              </Card>
            ))}
          </>
        )}

        {tab === 'back' && (
          <>
            <Text style={styles.section}>Failed subjects</Text>
            {data && data.failed.length === 0 ? (
              <EmptyState title="No back papers needed" message="No failed subjects for this student." />
            ) : null}
            {data?.failed.map((f) => (
              <Card key={`${f.studentResultId}-${f.subjectName}`}>
                <Text style={styles.title}>{f.subjectName}</Text>
                <Text style={styles.meta}>
                  {f.obtained}/{f.max} (need {f.passingMarks}) · {f.examinationName}
                </Text>
                <Pressable
                  style={styles.payBtn}
                  disabled={busy}
                  onPress={() => void createBack(f.studentResultId, f.subjectName)}
                >
                  <Text style={styles.payText}>
                    Apply back paper ₹{f.backPaperFee ?? data.config.backPaperFee}
                  </Text>
                </Pressable>
              </Card>
            ))}

            <Text style={styles.section}>My back papers</Text>
            {data?.backPapers.map((bp) => (
              <Card key={bp.id}>
                <Text style={styles.title}>{bp.subjectName}</Text>
                <Text style={styles.meta}>{bp.status} · {bp.recordId}</Text>
                <Text style={styles.amount}>
                  Fee ₹{bp.feeAmount} {bp.feePaid ? '✓ Paid' : '· Pending'}
                </Text>
                {bp.canPayFee ? (
                  <Pressable style={styles.payBtn} disabled={busy} onPress={() => void payBack(bp.id)}>
                    <Text style={styles.payText}>Pay fee</Text>
                  </Pressable>
                ) : null}
              </Card>
            ))}
          </>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  cfg: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  tabs: { flexDirection: 'row', marginBottom: spacing.sm, gap: 6 },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#eff6ff', borderColor: colors.primary },
  tabText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  amount: { fontSize: 14, fontWeight: '600', color: colors.primary, marginTop: 8 },
  payBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  payText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  secondaryBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  section: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
});
