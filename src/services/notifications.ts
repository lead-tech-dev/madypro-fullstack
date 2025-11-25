import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export async function registerForPushNotificationsAsync() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // SDK 49+ nécessite projectId pour getExpoPushTokenAsync
  const projectId =
    process.env.EXPO_PUBLIC_PROJECT_ID ||
    Constants?.expoConfig?.extra?.eas?.projectId ||
    Constants?.easConfig?.projectId;
  if (!projectId) {
    console.warn('projectId Expo manquant : ajoute-le dans app.json (extra.eas.projectId) ou .env (EXPO_PUBLIC_PROJECT_ID).');
  }

  const { data } = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  return data ?? null;
}
