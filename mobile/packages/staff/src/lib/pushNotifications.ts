import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { mobileApp } from '@360schoolerp/shared';

function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export async function registerPushNotifications(): Promise<string | null> {
  // Remote push is not supported in Expo Go (SDK 53+). Use an EAS development build.
  if (isExpoGo()) {
    if (__DEV__) {
      console.info('[push] Skipped in Expo Go — use a development build to test push.');
    }
    return null;
  }

  if (!Device.isDevice) return null;

  const Notifications = await import('expo-notifications');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  const token = tokenData.data;

  const platform =
    Platform.OS === 'ios' ? 'IOS' : Platform.OS === 'android' ? 'ANDROID' : 'OTHER';

  await mobileApp.registerDevice({
    fcmToken: token,
    platform,
    deviceName: Device.modelName || Device.deviceName || Platform.OS,
    appVersion: Constants.expoConfig?.version || '1.0.0',
  });

  return token;
}
