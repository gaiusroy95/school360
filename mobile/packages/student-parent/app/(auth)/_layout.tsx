import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: '#2563eb',
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: '#f1f5f9' },
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Sign in' }} />
      <Stack.Screen name="change-password" options={{ title: 'Set new password' }} />
      <Stack.Screen name="child-picker" options={{ title: 'Select child' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy policy' }} />
    </Stack>
  );
}
