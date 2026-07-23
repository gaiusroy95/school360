import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { useStudent } from '../src/context/StudentContext';
import { colors } from '../src/theme';

export default function Index() {
  const { user, isLoading } = useAuth();
  const { activeStudentId } = useStudent();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.mustResetPassword) return <Redirect href="/(auth)/change-password" />;
  if (user.role === 'PARENT' && user.studentIds.length > 1 && !activeStudentId) {
    return <Redirect href="/(auth)/child-picker" />;
  }

  return <Redirect href="/(app)" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
});
