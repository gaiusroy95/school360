import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useStudent } from '../../src/context/StudentContext';
import { colors, radius, spacing } from '../../src/theme';

export default function ChildPickerScreen() {
  const { user } = useAuth();
  const { children, setActiveStudentId, refreshChildren } = useStudent();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void refreshChildren().finally(() => setLoading(false));
  }, [refreshChildren]);

  async function selectChild(id: string) {
    await setActiveStudentId(id);
    router.replace('/(app)');
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.intro}>Choose which child&apos;s information to view.</Text>

      {children.map((child) => (
        <Pressable key={child.id} style={styles.card} onPress={() => selectChild(child.id)}>
          <Text style={styles.name}>{child.name}</Text>
          <Text style={styles.meta}>
            {child.classGroup} · {child.admissionNumber}
          </Text>
        </Pressable>
      ))}

      {children.length === 0 && user?.studentIds.length ? (
        <Text style={styles.empty}>Loading children…</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, padding: spacing.lg },
  intro: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 24 },
});
