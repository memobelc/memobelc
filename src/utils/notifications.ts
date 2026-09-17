import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Notifications } from '@/utils/loadExpoNotifications';

const projectId = Constants.expoConfig?.extra?.eas?.projectId;

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android' || !Notifications?.setNotificationChannelAsync) {
    return;
  }
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Memobelc',
      importance: Notifications.AndroidImportance?.MAX ?? 7,
      sound: 'default',
    });
  } catch {
    // Channel setup can fail in Expo Go; local presentation may still work.
  }
}

export async function ensureNotificationPermission() {
  if (Platform.OS === 'web') {
    const WebNotification = (globalThis as any).Notification;
    if (!WebNotification) return false;
    try {
      if (WebNotification.permission === 'default') {
        await WebNotification.requestPermission();
      }
      return WebNotification.permission === 'granted';
    } catch {
      return false;
    }
  }

  if (!Notifications) return false;
  try {
    if (Platform.OS === 'android') {
      await ensureAndroidChannel();
    }
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted' && existing !== 'denied') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function presentLocalNotification(title?: string, body?: string) {
  const heading = title || 'Memobelc';
  const message = body || '';

  if (Platform.OS === 'web') {
    try {
      const WebNotification = (globalThis as any).Notification;
      if (!WebNotification) return;
      if (WebNotification.permission === 'default') {
        await WebNotification.requestPermission();
      }
      if (WebNotification.permission === 'granted') {
        new WebNotification(heading, { body: message });
      }
    } catch {
      // Ignore web Notification API failures.
    }
    return;
  }

  if (!Notifications?.scheduleNotificationAsync) return;
  try {
    const allowed = await ensureNotificationPermission();
    if (!allowed) return;
    await ensureAndroidChannel();
    const trigger = Platform.OS === 'android' ? { channelId: 'default' } : null;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: heading,
        body: message,
        sound: true,
        channelId: 'default',
        priority: Notifications.AndroidNotificationPriority?.MAX,
      },
      trigger,
    });
  } catch {
    // Ignore local notification failures so they never block the app.
  }
}

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web' || !Notifications) return undefined;

  const allowed = await ensureNotificationPermission();
  if (!allowed) return undefined;

  let token;
  if (Device.isDevice) {
    try {
      token = (
        await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
      ).data;
    } catch {
      // Expo Go Android cannot issue remote push tokens.
    }
  }

  await ensureAndroidChannel();
  return token;
}
