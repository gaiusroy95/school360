import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { colors, radius, spacing } from '../../src/theme';

export default function ChangePasswordScreen() {
  const { changePassword } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (newPassword.length < 8) return setError('New password must be at least 8 characters.');
    if (newPassword !== confirm) return setError('Passwords do not match.');
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      router.replace('/(app)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <Text style={styles.message}>Set a new password before continuing.</Text>
        <Text style={styles.label}>Current password</Text>
        <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
        <Text style={styles.label}>New password</Text>
        <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
        <Text style={styles.label}>Confirm</Text>
        <TextInput style={styles.input} value={confirm} onChangeText={setConfirm} secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.button} onPress={onSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save & continue</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  message: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: '600', marginTop: 8, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, backgroundColor: colors.surface },
  error: { color: colors.danger, marginTop: spacing.sm },
  button: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 14, alignItems: 'center', marginTop: spacing.lg },
  buttonText: { color: '#fff', fontWeight: '700' },
});
