import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { mobileApp, type ProfileResponse } from '@360schoolerp/shared';
import { ChildHeader } from '../../src/components/ChildHeader';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { useAuth } from '../../src/context/AuthContext';
import { useStudent, useStudentParams } from '../../src/context/StudentContext';
import { colors, radius, spacing } from '../../src/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { children } = useStudent();
  const params = useStudentParams();
  const router = useRouter();
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await mobileApp.profile(params));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    void load();
  }, [load]);

  const isParent = user?.role === 'PARENT';

  return (
    <Screen loading={loading} error={error} onRefresh={load}>
      <ChildHeader />

      {data ? (
        <Card>
          <Text style={styles.name}>{data.student.name}</Text>
          <Text style={styles.meta}>{data.student.classGroup}</Text>
          <Text style={styles.meta}>Admission: {data.student.admissionNumber}</Text>
          <Text style={styles.meta}>Year: {data.student.academicYear}</Text>
          {data.student.mobile ? <Text style={styles.meta}>Mobile: {data.student.mobile}</Text> : null}
        </Card>
      ) : null}

      <Text style={styles.section}>Account</Text>
      <Card>
        <Text style={styles.accountName}>{user?.displayName}</Text>
        <Text style={styles.meta}>Role: {user?.role}</Text>
      </Card>

      {isParent ? (
        <>
          <Text style={styles.section}>Parent services</Text>
          <MenuLink label="Fees & payments" onPress={() => router.push('/(app)/fees')} />
          <MenuLink label="Leave application" onPress={() => router.push('/(app)/leave')} />
          <MenuLink label="Consent approvals" onPress={() => router.push('/(app)/consents')} />
          <MenuLink label="Reminder settings" onPress={() => router.push('/(app)/reminders')} />
        </>
      ) : null}

      <Text style={styles.section}>More</Text>
      <MenuLink label="School website" onPress={() => router.push('/(app)/website')} />
      {isParent && children.length > 1 ? (
        <MenuLink label="Switch child" onPress={() => router.push('/(auth)/child-picker')} />
      ) : null}

      <Pressable
        style={styles.logout}
        onPress={async () => {
          await logout();
          router.replace('/(auth)/login');
        }}
      >
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

function MenuLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  meta: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  section: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  accountName: { fontSize: 16, fontWeight: '600', color: colors.text },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuLabel: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
  chevron: { fontSize: 22, color: colors.textMuted },
  logout: {
    marginTop: spacing.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
});
