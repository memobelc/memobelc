import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

let Notifications: NotificationsModule | null = null;

function loadLocalNotificationsFallback(): NotificationsModule {
  const schedule = require('expo-notifications/build/scheduleNotificationAsync');
  const perms = require('expo-notifications/build/NotificationPermissions');
  const handler = require('expo-notifications/build/NotificationsHandler');
  const channel = require('expo-notifications/build/setNotificationChannelAsync');
  const channelTypes = require('expo-notifications/build/NotificationChannelManager.types');
  const types = require('expo-notifications/build/Notifications.types');
  const emitter = require('expo-notifications/build/NotificationsEmitter');

  let openSettingsAsync: NotificationsModule['openSettingsAsync'] | undefined;
  try {
    openSettingsAsync = require('expo-notifications/build/NotificationPermissions').openSettingsAsync;
  } catch {
    try {
      openSettingsAsync = require('expo-notifications/build/openSettingsAsync').openSettingsAsync;
    } catch {
      openSettingsAsync = undefined;
    }
  }

  return {
    scheduleNotificationAsync: schedule.scheduleNotificationAsync,
    getPermissionsAsync: perms.getPermissionsAsync,
    requestPermissionsAsync: perms.requestPermissionsAsync,
    openSettingsAsync,
    setNotificationHandler: handler.setNotificationHandler,
    setNotificationChannelAsync: channel.setNotificationChannelAsync,
    AndroidImportance: channelTypes.AndroidImportance,
    AndroidNotificationVisibility: channelTypes.AndroidNotificationVisibility,
    AndroidNotificationPriority: types.AndroidNotificationPriority,
    addNotificationReceivedListener: emitter.addNotificationReceivedListener,
    addNotificationResponseReceivedListener: emitter.addNotificationResponseReceivedListener,
    getExpoPushTokenAsync: async () => {
      throw new Error('remote-push-unavailable-expo-go');
    },
  } as NotificationsModule;
}

// Full import runs DevicePushTokenAutoRegistration, which throws on Expo Go Android.
try {
  Notifications = require('expo-notifications');
} catch {
  try {
    Notifications = loadLocalNotificationsFallback();
  } catch {
    Notifications = null;
  }
}

if (Platform.OS !== 'web' && Notifications?.setNotificationHandler) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      priority: Notifications.AndroidNotificationPriority?.MAX,
    }),
  });
}

export { Notifications };
