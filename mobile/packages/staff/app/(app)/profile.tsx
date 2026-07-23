import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { colors, radius, spacing } from '../../src/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <Screen>
      <Card>
        <Text style={styles.name}>{user?.displayName}</Text>
        <Text style={styles.meta}>Role: {user?.role}</Text>
        <Text style={styles.meta}>Code: {user?.employeeCode}</Text>
      </Card>

      <Text style={styles.section}>Work</Text>
      {(user?.role === 'TEACHER' || user?.role === 'PRINCIPAL') && (
        <MenuLink label="Class schedule" onPress={() => router.push('/(app)/schedule')} />
      )}
      <MenuLink label="Leave application" onPress={() => router.push('/(app)/leave')} />
      {user?.role === 'TEACHER' && (
        <>
          <MenuLink label="Marks entry" onPress={() => router.push('/(app)/marks')} />
          <MenuLink label="CCE evaluations" onPress={() => router.push('/(app)/evaluations')} />
          <MenuLink label="Test papers" onPress={() => router.push('/(app)/papers')} />
        </>
      )}

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
  section: { fontSize: 14, fontWeight: '700', color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.sm, textTransform: 'uppercase' },
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
  menuLabel: { flex: 1, fontSize: 15, color: colors.text },
  chevron: { fontSize: 22, color: colors.textMuted },
  logout: { marginTop: spacing.lg, padding: spacing.md, alignItems: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.danger },
  logoutText: { color: colors.danger, fontWeight: '700' },
});
