import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  mobileApp,
  type TestAttemptStart,
  type TestPaper,
  type TestSubmitResult,
  type TestsResponse,
} from '@360schoolerp/shared';
import { ChildHeader } from '../../src/components/ChildHeader';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { useStudentParams } from '../../src/context/StudentContext';
import { colors, radius, spacing } from '../../src/theme';

export default function TestsScreen() {
  const params = useStudentParams();
  const [data, setData] = useState<TestsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activePaper, setActivePaper] = useState<TestPaper | null>(null);
  const [attempt, setAttempt] = useState<TestAttemptStart | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TestSubmitResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);

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

  useEffect(() => {
    if (remainingSec == null || remainingSec <= 0 || !attempt || result) return;
    const t = setInterval(() => {
      setRemainingSec((s) => (s == null ? s : Math.max(0, s - 1)));
    }, 1000);
    return () => clearInterval(t);
  }, [remainingSec, attempt, result]);

  useEffect(() => {
    if (remainingSec === 0 && attempt && !result && !busy) {
      void submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSec]);

  async function start(paper: TestPaper) {
    setBusy(true);
    setError(null);
    try {
      const started = await mobileApp.startTest(paper.id, params);
      setActivePaper(paper);
      setAttempt(started);
      setAnswers({});
      setResult(null);
      setRemainingSec(started.durationMinutes * 60);
    } catch (e) {
      Alert.alert('Cannot start', e instanceof Error ? e.message : 'Failed to start test');
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!attempt || !activePaper) return;
    setBusy(true);
    try {
      const res = await mobileApp.submitTest(activePaper.id, {
        attemptId: attempt.attemptId,
        answers,
        studentId: params.studentId,
      });
      setResult(res);
      setRemainingSec(null);
    } catch (e) {
      Alert.alert('Submit failed', e instanceof Error ? e.message : 'Could not submit');
    } finally {
      setBusy(false);
    }
  }

  function exitAttempt() {
    setActivePaper(null);
    setAttempt(null);
    setAnswers({});
    setResult(null);
    setRemainingSec(null);
    void load();
  }

  const mm = remainingSec != null ? Math.floor(remainingSec / 60) : 0;
  const ss = remainingSec != null ? remainingSec % 60 : 0;

  if (attempt && activePaper) {
    return (
      <Screen>
        <ChildHeader />
        <View style={styles.attemptHeader}>
          <Text style={styles.attemptTitle}>{activePaper.title}</Text>
          {remainingSec != null && !result ? (
            <Text style={styles.timer}>
              {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
            </Text>
          ) : null}
        </View>

        {result ? (
          <Card>
            <Text style={styles.resultTitle}>{result.passed ? 'Passed' : 'Completed'}</Text>
            <Text style={styles.resultScore}>{result.score}%</Text>
            <Text style={styles.meta}>
              Correct {result.correctCount} · Wrong {result.wrongCount} · Unanswered {result.unansweredCount}
            </Text>
            <Text style={[styles.meta, { marginTop: 8 }]}>
              Result is synced to school exam marks.
            </Text>
            <Pressable style={styles.primaryBtn} onPress={exitAttempt}>
              <Text style={styles.primaryBtnText}>Back to Tests</Text>
            </Pressable>
          </Card>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {attempt.questions.map((q, idx) => (
              <Card key={q.id}>
                <Text style={styles.qText}>
                  Q{idx + 1}. {q.questionText}
                </Text>
                {q.options?.length ? (
                  q.options.map((opt, oi) => {
                    const selected = answers[q.id] === opt;
                    return (
                      <Pressable
                        key={`${q.id}-${oi}`}
                        style={[styles.option, selected && styles.optionSelected]}
                        onPress={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                      >
                        <Text style={styles.optionText}>
                          ({String.fromCharCode(65 + oi)}) {opt}
                        </Text>
                      </Pressable>
                    );
                  })
                ) : (
                  <TextInput
                    style={styles.input}
                    multiline
                    placeholder="Your answer"
                    value={answers[q.id] || ''}
                    onChangeText={(t) => setAnswers((prev) => ({ ...prev, [q.id]: t }))}
                  />
                )}
              </Card>
            ))}
            <Pressable
              style={[styles.primaryBtn, busy && styles.btnDisabled]}
              disabled={busy}
              onPress={() => void submit()}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Submit & View Result</Text>
              )}
            </Pressable>
          </ScrollView>
        )}
      </Screen>
    );
  }

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
            {paper.passMarksPercent != null ? ` · Pass ${paper.passMarksPercent}%` : ''}
          </Text>
          {paper.mobilePublishedAt ? (
            <Text style={styles.published}>
              Published {new Date(paper.mobilePublishedAt).toLocaleDateString()}
            </Text>
          ) : null}
          <Pressable
            style={[styles.primaryBtn, busy && styles.btnDisabled]}
            disabled={busy}
            onPress={() => void start(paper)}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Start Test</Text>
            )}
          </Pressable>
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
  primaryBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.6 },
  attemptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  attemptTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  timer: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.warning || '#b45309',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  qText: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 10 },
  option: {
    borderWidth: 1,
    borderColor: colors.border || '#e2e8f0',
    borderRadius: radius.sm,
    padding: 10,
    marginBottom: 8,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  optionText: { fontSize: 14, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border || '#e2e8f0',
    borderRadius: radius.sm,
    padding: 10,
    minHeight: 80,
    textAlignVertical: 'top',
    color: colors.text,
  },
  resultTitle: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
  resultScore: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginVertical: 8,
  },
});
