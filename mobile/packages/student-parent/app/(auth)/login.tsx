import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { mobileAuth, type MobileAuthModes } from '@360schoolerp/shared';
import { useAuth } from '../../src/context/AuthContext';
import { colors, radius, spacing } from '../../src/theme';

export default function LoginScreen() {
  const { login, loginWithOtp } = useAuth();
  const router = useRouter();
  const [modes, setModes] = useState<MobileAuthModes>({
    otpEnabled: false,
    otpRequired: false,
    passwordAllowed: true,
  });
  const [layer, setLayer] = useState<'student' | 'parent'>('student');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [registeredMobile, setRegisteredMobile] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [useOtp, setUseOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void mobileAuth.modes().then(setModes).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (modes.otpRequired) setUseOtp(true);
  }, [modes.otpRequired]);

  function routeAfterLogin(user: Awaited<ReturnType<typeof login>>) {
    if (user.mustResetPassword) router.replace('/(auth)/change-password');
    else if (user.role === 'PARENT' && user.studentIds.length > 1) router.replace('/(auth)/child-picker');
    else router.replace('/(app)');
  }

  async function onPasswordLogin() {
    setError(null);
    if (!admissionNumber.trim() || !registeredMobile.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      routeAfterLogin(
        await login({
          layer,
          admissionNumber: admissionNumber.trim(),
          registeredMobile: registeredMobile.trim(),
          password,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function onRequestOtp() {
    setError(null);
    if (!admissionNumber.trim() || !registeredMobile.trim()) {
      setError('Enter admission number and mobile.');
      return;
    }
    setLoading(true);
    try {
      const res = await mobileAuth.requestOtp({
        app: 'student-parent',
        layer,
        admissionNumber: admissionNumber.trim(),
        registeredMobile: registeredMobile.trim(),
      });
      setOtpSent(true);
      if (res.devOtp) setError(`Dev OTP: ${res.devOtp}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyOtp() {
    setError(null);
    if (!otp.trim()) {
      setError('Enter the OTP code.');
      return;
    }
    setLoading(true);
    try {
      routeAfterLogin(
        await loginWithOtp({
          layer,
          admissionNumber: admissionNumber.trim(),
          registeredMobile: registeredMobile.trim(),
          otp: otp.trim(),
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  }

  const showPassword = modes.passwordAllowed && !useOtp;
  const showOtp = modes.otpEnabled && useOtp;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <Text style={styles.brand}>360schoolERP</Text>
        <Text style={styles.subtitle}>Family app — students & parents</Text>

        <View style={styles.tabs}>
          {(['student', 'parent'] as const).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tab, layer === tab && styles.tabActive]}
              onPress={() => setLayer(tab)}
            >
              <Text style={[styles.tabText, layer === tab && styles.tabTextActive]}>
                {tab === 'student' ? 'Student' : 'Parent'}
              </Text>
            </Pressable>
          ))}
        </View>

        {modes.otpEnabled && modes.passwordAllowed ? (
          <View style={styles.tabs}>
            <Pressable style={[styles.tab, !useOtp && styles.tabActive]} onPress={() => setUseOtp(false)}>
              <Text style={[styles.tabText, !useOtp && styles.tabTextActive]}>Password</Text>
            </Pressable>
            <Pressable style={[styles.tab, useOtp && styles.tabActive]} onPress={() => setUseOtp(true)}>
              <Text style={[styles.tabText, useOtp && styles.tabTextActive]}>OTP</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.form}>
          <Text style={styles.label}>Admission number</Text>
          <TextInput style={styles.input} value={admissionNumber} onChangeText={setAdmissionNumber} autoCapitalize="characters" />

          <Text style={styles.label}>Registered mobile</Text>
          <TextInput style={styles.input} value={registeredMobile} onChangeText={setRegisteredMobile} keyboardType="phone-pad" />

          {showPassword ? (
            <>
              <Text style={styles.label}>Password</Text>
              <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
            </>
          ) : null}

          {showOtp ? (
            <>
              {!otpSent ? (
                <Pressable style={styles.button} onPress={onRequestOtp} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send OTP</Text>}
                </Pressable>
              ) : (
                <>
                  <Text style={styles.label}>OTP code</Text>
                  <TextInput style={styles.input} value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} />
                  <Pressable style={styles.button} onPress={onVerifyOtp} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify & sign in</Text>}
                  </Pressable>
                </>
              )}
            </>
          ) : (
            <Pressable style={styles.button} onPress={onPasswordLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
            </Pressable>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Link href="/(auth)/privacy" style={styles.privacy}>
            Privacy policy
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  brand: { fontSize: 28, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: '#fff' },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  error: { color: colors.danger, marginTop: spacing.sm, fontSize: 13 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  privacy: { color: colors.primary, textAlign: 'center', marginTop: spacing.md, fontSize: 13 },
});
