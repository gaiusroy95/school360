import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { WebView } from 'react-native-webview';
import { colors } from '../../src/theme';

const SCHOOL_URL = process.env.EXPO_PUBLIC_SCHOOL_WEBSITE_URL || 'https://school360-weld.vercel.app';

export default function WebsiteScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'School website', headerShown: true }} />
      <View style={styles.container}>
        <WebView source={{ uri: SCHOOL_URL }} style={styles.web} startInLoadingState />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  web: { flex: 1 },
});
