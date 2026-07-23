import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useStudent } from '../context/StudentContext';
import { colors, radius, spacing } from '../theme';

export function ChildHeader() {
  const { user } = useAuth();
  const { activeStudentId, children } = useStudent();
  const router = useRouter();

  if (user?.role !== 'PARENT' || !activeStudentId) return null;

  const child = children.find((c) => c.id === activeStudentId);
  if (!child) return null;

  const canSwitch = children.length > 1;

  return (
    <Pressable
      style={styles.banner}
      onPress={canSwitch ? () => router.push('/(auth)/child-picker') : undefined}
      disabled={!canSwitch}
    >
      <View style={styles.dot} />
      <View style={styles.info}>
        <Text style={styles.name}>{child.name}</Text>
        <Text style={styles.meta}>
          {child.classGroup} · {child.admissionNumber}
        </Text>
      </View>
      {canSwitch ? <Text style={styles.switch}>Switch</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  switch: { fontSize: 13, fontWeight: '600', color: colors.primary },
});
