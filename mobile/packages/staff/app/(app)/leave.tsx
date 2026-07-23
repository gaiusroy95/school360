import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { Stack } from 'expo-router';
import { mobileStaff, type StaffLeaveItem } from '@360schoolerp/shared';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { colors, radius, spacing } from '../../src/theme';

export default function LeaveScreen() {
  const [items, setItems] = useState<StaffLeaveItem[]>([]);
  const [leaveType, setLeaveType] = useState('PLANNED');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    const res = await mobileStaff.leave();
    setItems(res.items);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    try {
      await mobileStaff.submitLeave({ leaveType, fromDate, toDate, reason });
      Alert.alert('Submitted', 'Leave application sent for approval.');
      setFromDate('');
      setToDate('');
      setReason('');
      void load();
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Could not submit leave');
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Leave', headerShown: true }} />
      <Screen onRefresh={load}>
        <Card>
          <Text style={styles.label}>Type</Text>
          <TextInput style={styles.input} value={leaveType} onChangeText={setLeaveType} />
          <Text style={styles.label}>From (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={fromDate} onChangeText={setFromDate} />
          <Text style={styles.label}>To</Text>
          <TextInput style={styles.input} value={toDate} onChangeText={setToDate} />
          <Text style={styles.label}>Reason</Text>
          <TextInput style={[styles.input, styles.multiline]} value={reason} onChangeText={setReason} multiline />
          <Pressable style={styles.btn} onPress={submit}>
            <Text style={styles.btnText}>Submit</Text>
          </Pressable>
        </Card>
        {items.map((item) => (
          <Card key={item.id}>
            <Text style={styles.title}>{item.leaveTypeLabel}</Text>
            <Text style={styles.meta}>{item.fromDate} → {item.toDate} · {item.statusLabel}</Text>
          </Card>
        ))}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, backgroundColor: '#fafafa' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  btn: { backgroundColor: colors.primary, borderRadius: 8, padding: 12, alignItems: 'center', marginTop: spacing.md },
  btnText: { color: '#fff', fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});
