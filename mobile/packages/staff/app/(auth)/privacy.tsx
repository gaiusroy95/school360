import { ScrollView, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';

const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL;

const BODY = `360schoolERP Staff collects employee data and, for transport roles, GPS location during active vehicle tracking.

Push notifications use your device token. Location is collected only while you are on duty and using the GPS screen.

We do not sell personal data. Contact your school for data access or correction requests.

See mobile/docs/PRIVACY_POLICY.md in the repository for the full policy text.`;

export default function PrivacyScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Privacy policy' }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.title}>Privacy policy</Text>
        <Text style={styles.body}>{BODY}</Text>
        {PRIVACY_URL ? <Text style={styles.link}>Full policy: {PRIVACY_URL}</Text> : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 24 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16, color: '#0f172a' },
  body: { fontSize: 15, lineHeight: 24, color: '#334155' },
  link: { marginTop: 16, fontSize: 13, color: '#7c3aed' },
});
