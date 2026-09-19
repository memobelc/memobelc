import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type PropsWithChildren,
} from 'react';
import { AppState, Platform } from 'react-native';
import * as Device from 'expo-device';
import { Notifications } from '@/utils/loadExpoNotifications';
import {
  registerForPushNotificationsAsync,
  getNotificationPermissionStatus,
  openDeviceNotificationSettings as openOsNotificationSettings,
  type NotificationPermissionStatus,
} from '@/utils/notifications';
import api from '@/services/api';
import { useSession } from '@/contexts/AuthContext';

type PushNotificationContextType = {
  requestPermissionAndRegister: () => Promise<boolean>;
  enableNotifications: () => Promise<boolean>;
  isPermissionGranted: boolean | null;
  permissionStatus: NotificationPermissionStatus | null;
  showHomeCard: boolean;
  dismissHomeCard: () => void;
  openDeviceNotificationSettings: () => Promise<void>;
  refreshPermission: () => Promise<void>;
  isRegistering: boolean;
};

const PushNotificationContext = createContext<PushNotificationContextType>({
  requestPermissionAndRegister: async () => false,
  enableNotifications: async () => false,
  isPermissionGranted: null,
  permissionStatus: null,
  showHomeCard: false,
  dismissHomeCard: () => {},
  openDeviceNotificationSettings: async () => {},
  refreshPermission: async () => {},
  isRegistering: false,
});

export function usePushNotification() {
  return useContext(PushNotificationContext);
}

export function PushNotificationProvider({ children }: PropsWithChildren) {
  const { userInfo } = useSession();
  const [isPermissionGranted, setIsPermissionGranted] = useState<boolean | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus | null>(
    null,
  );
  const [homeCardDismissed, setHomeCardDismissed] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const requestPermissionAndRegister = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;

    try {
      setIsRegistering(true);
      const token = await registerForPushNotificationsAsync();
      const status = await getNotificationPermissionStatus();
      setPermissionStatus(status);
      const permissionGranted = status === 'granted';
      setIsPermissionGranted(permissionGranted);

      if (token && userInfo?.token && userInfo?.user_id) {
        const deviceInfo = Device.isDevice
          ? {
              deviceName: Device.deviceName || null,
              deviceType: Device.deviceType || null,
              osName: Device.osName || Platform.OS,
              osVersion: Device.osVersion || null,
              platformApiLevel: Device.platformApiLevel || null,
              isPhysicalDevice: Device.isDevice || false,
              manufacturer: Device.manufacturer || null,
            }
          : undefined;

        await api.post(
          '/notifications/register_token',
          { push_token: token, device_info: deviceInfo },
          { headers: { Authorization: `Bearer ${userInfo.token}` } },
        );
        return true;
      }

      return permissionGranted;
    } catch (error) {
      console.warn('Failed to register push token:', error);
      return false;
    } finally {
      setIsRegistering(false);
    }
  }, [userInfo?.token, userInfo?.user_id]);

  const refreshPermission = useCallback(async () => {
    if (Platform.OS === 'web' || !Notifications) return;

    try {
      const status = await getNotificationPermissionStatus();
      setPermissionStatus(status);
      setIsPermissionGranted(status === 'granted');
      if (status === 'granted' && userInfo?.token) {
        await requestPermissionAndRegister();
      }
    } catch (error) {
      console.warn('Error checking notification permission:', error);
    }
  }, [userInfo?.token, requestPermissionAndRegister]);

  const openDeviceNotificationSettings = useCallback(async () => {
    await openOsNotificationSettings();
  }, []);

  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;

    const status = permissionStatus ?? (await getNotificationPermissionStatus());
    if (status === 'denied') {
      await openOsNotificationSettings();
      return false;
    }
    return requestPermissionAndRegister();
  }, [permissionStatus, requestPermissionAndRegister]);

  const dismissHomeCard = useCallback(() => {
    setHomeCardDismissed(true);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    if (!userInfo?.token) {
      setHomeCardDismissed(false);
      setIsPermissionGranted(null);
      setPermissionStatus(null);
      return;
    }

    refreshPermission();
  }, [userInfo?.token, refreshPermission]);

  useEffect(() => {
    if (Platform.OS === 'web' || !userInfo?.token) return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        refreshPermission();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [userInfo?.token, refreshPermission]);

  const showHomeCard =
    Platform.OS !== 'web' &&
    !!userInfo?.token &&
    isPermissionGranted === false &&
    !homeCardDismissed;

  return (
    <PushNotificationContext.Provider
      value={{
        requestPermissionAndRegister,
        enableNotifications,
        isPermissionGranted,
        permissionStatus,
        showHomeCard,
        dismissHomeCard,
        openDeviceNotificationSettings,
        refreshPermission,
        isRegistering,
      }}
    >
      {children}
    </PushNotificationContext.Provider>
  );
}
