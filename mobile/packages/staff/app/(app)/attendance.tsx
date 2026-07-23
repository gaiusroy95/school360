import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { mobileStaff, type AttendanceRosterStudent } from '@360schoolerp/shared';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { colors, spacing } from '../../src/theme';

type ClassGroup = { className: string; sectionName: string; label: string };

export default function AttendanceScreen() {
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [selected, setSelected] = useState<ClassGroup | null>(null);
  const [students, setStudents] = useState<AttendanceRosterStudent[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void mobileStaff
      .attendanceMeta()
      .then((meta) => {
        setClasses(meta.classGroups || []);
        if (meta.classGroups?.[0]) setSelected(meta.classGroups[0]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load classes'))
      .finally(() => setLoading(false));
  }, []);

  const loadRoster = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await mobileStaff.attendanceRoster({
        className: selected.className,
        sectionName: selected.sectionName,
      });
      setStudents(res.students);
      const map: Record<string, string> = {};
      for (const s of res.students) map[s.studentId] = s.status || 'PRESENT';
      setStatusMap(map);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load roster');
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    if (selected) void loadRoster();
  }, [selected, loadRoster]);

  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      await mobileStaff.markAttendance({
        className: selected.className,
        sectionName: selected.sectionName,
        records: students.map((s) => ({
          studentId: s.studentId,
          status: statusMap[s.studentId] || 'PRESENT',
        })),
      });
      Alert.alert('Saved', 'Attendance submitted. Parents of absent students will be notified.');
      void loadRoster();
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Could not save attendance');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen loading={loading && !students.length} error={error} onRefresh={loadRoster}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {classes.map((c) => {
          const active = selected?.className === c.className && selected?.sectionName === c.sectionName;
          return (
            <Pressable
              key={`${c.className}-${c.sectionName}`}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setSelected(c)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.hint}>Default: all present. Tap a student to toggle absent.</Text>

      {students.length === 0 && !loading ? (
        <EmptyState title="No students" message="Select a class to load the roster." />
      ) : null}

      {students.map((s) => {
        const isAbsent = (statusMap[s.studentId] || 'PRESENT') === 'ABSENT';
        return (
          <Pressable
            key={s.studentId}
            onPress={() =>
              setStatusMap((prev) => ({
                ...prev,
                [s.studentId]: isAbsent ? 'PRESENT' : 'ABSENT',
              }))
            }
          >
            <Card>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{s.name}</Text>
                  <Text style={styles.meta}>{s.admissionNumber}</Text>
                </View>
                <Text style={[styles.badge, isAbsent ? styles.absent : styles.present]}>
                  {isAbsent ? 'Absent' : 'Present'}
                </Text>
              </View>
            </Card>
          </Pressable>
        );
      })}

      {students.length > 0 ? (
        <Pressable style={styles.saveBtn} onPress={save} disabled={saving}>
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Submit attendance'}</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { marginBottom: spacing.md, maxHeight: 44 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  chipTextActive: { color: '#fff' },
  hint: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  present: { backgroundColor: '#d1fae5', color: colors.success },
  absent: { backgroundColor: '#fee2e2', color: colors.danger },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: spacing.sm },
  saveText: { color: '#fff', fontWeight: '700' },
});
