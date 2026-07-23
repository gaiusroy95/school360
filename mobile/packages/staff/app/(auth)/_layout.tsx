import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: '#7c3aed',
        contentStyle: { backgroundColor: '#f8fafc' },
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Staff sign in' }} />
      <Stack.Screen name="change-password" options={{ title: 'Set new password' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy policy' }} />
    </Stack>
  );
}
