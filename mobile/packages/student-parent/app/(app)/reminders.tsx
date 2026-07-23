import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { mobileApp, type ReminderPreferences } from '@360schoolerp/shared';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { colors, spacing } from '../../src/theme';

const REMINDER_LABELS: Record<string, string> = {
  fee: 'Fee due reminders',
  homework: 'Homework due reminders',
  ptm: 'PTM reminders',
  annualFunction: 'Annual function',
  dress: 'Dress code days',
  books: 'Book return',
  sports: 'Sports events',
  feedback: 'Feedback requests',
};

export default function RemindersScreen() {
  const [data, setData] = useState<ReminderPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await mobileApp.reminders());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(key: string, enabled: boolean) {
    if (!data) return;
    const next = {
      ...data.preferences,
      [key]: { ...data.preferences[key], enabled },
    };
    setSaving(true);
    try {
      const res = await mobileApp.updateReminders(next);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Reminders', headerShown: true }} />
      <Screen loading={loading} error={error} onRefresh={load}>
        <Text style={styles.intro}>
          Choose which automatic push reminders you receive for your children.
        </Text>

        {data
          ? Object.entries(data.preferences).map(([key, pref]) => (
              <Card key={key}>
                <View style={styles.row}>
                  <View style={styles.info}>
                    <Text style={styles.label}>{REMINDER_LABELS[key] || key}</Text>
                    {'daysBefore' in pref && pref.daysBefore !== undefined ? (
                      <Text style={styles.meta}>{pref.daysBefore} day(s) before</Text>
                    ) : null}
                    {'minutesBefore' in pref && pref.minutesBefore !== undefined ? (
                      <Text style={styles.meta}>{pref.minutesBefore} min before</Text>
                    ) : null}
                  </View>
                  <Switch
                    value={pref.enabled}
                    onValueChange={(v) => toggle(key, v)}
                    disabled={saving}
                    trackColor={{ true: colors.primary }}
                  />
                </View>
              </Card>
            ))
          : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.md, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center' },
  info: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
