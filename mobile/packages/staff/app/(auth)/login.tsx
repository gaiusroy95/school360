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
import { mobileAuth, formatMobileWithPrefix, isValidIndiaMobile, type MobileAuthModes } from '@360schoolerp/shared';
import { useAuth } from '../../src/context/AuthContext';
import { MobileNumberInput } from '../../src/components/MobileNumberInput';
import { colors, radius, spacing } from '../../src/theme';

export default function LoginScreen() {
  const { login, loginWithOtp } = useAuth();
  const router = useRouter();
  const [modes, setModes] = useState<MobileAuthModes>({
    otpEnabled: false,
    otpRequired: false,
    passwordAllowed: true,
  });
  const [employeeCode, setEmployeeCode] = useState('');
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

  function mobileForApi() {
    return formatMobileWithPrefix(registeredMobile);
  }

  async function onPasswordLogin() {
    setError(null);
    if (!employeeCode.trim() || !registeredMobile.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (!isValidIndiaMobile(registeredMobile)) {
      setError('Enter a valid 10-digit mobile number after +91.');
      return;
    }
    setLoading(true);
    try {
      const user = await login(employeeCode.trim(), mobileForApi(), password);
      router.replace(user.mustResetPassword ? '/(auth)/change-password' : '/(app)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function onRequestOtp() {
    setError(null);
    if (!employeeCode.trim() || !registeredMobile.trim()) {
      setError('Enter employee code and mobile.');
      return;
    }
    if (!isValidIndiaMobile(registeredMobile)) {
      setError('Enter a valid 10-digit mobile number after +91.');
      return;
    }
    setLoading(true);
    try {
      const res = await mobileAuth.requestOtp({
        app: 'staff',
        employeeCode: employeeCode.trim(),
        registeredMobile: mobileForApi(),
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
    if (!isValidIndiaMobile(registeredMobile)) {
      setError('Enter a valid 10-digit mobile number after +91.');
      return;
    }
    setLoading(true);
    try {
      const user = await loginWithOtp(employeeCode.trim(), mobileForApi(), otp.trim());
      router.replace(user.mustResetPassword ? '/(auth)/change-password' : '/(app)');
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
        <Text style={styles.brand}>360schoolERP Staff</Text>
        <Text style={styles.subtitle}>Teacher · Principal · Transport</Text>

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
          <Text style={styles.label}>Employee code</Text>
          <TextInput style={styles.input} value={employeeCode} onChangeText={setEmployeeCode} autoCapitalize="characters" />

          <Text style={styles.label}>Registered mobile</Text>
          <MobileNumberInput value={registeredMobile} onChange={setRegisteredMobile} />

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

          {showPassword ? (
            <Text style={styles.hint}>First login uses your registered mobile (+91…) as the password.</Text>
          ) : null}

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
  brand: { fontSize: 26, fontWeight: '800', color: colors.primary, textAlign: 'center' },
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
  label: { fontSize: 13, fontWeight: '600', marginTop: 8, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, backgroundColor: '#fafafa' },
  error: { color: colors.danger, marginTop: spacing.sm },
  button: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 14, alignItems: 'center', marginTop: spacing.lg },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: spacing.md, lineHeight: 18 },
  privacy: { color: colors.primary, textAlign: 'center', marginTop: spacing.md, fontSize: 13 },
});
