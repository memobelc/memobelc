import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type PropsWithChildren,
} from 'react';
import { Platform, Modal, View, Text, TouchableOpacity } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useTranslation } from 'react-i18next';

// Configura exibição de notificações no app mobile (não web)
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowList: true,
    }),
  });
}

import { registerForPushNotificationsAsync } from '@/utils/notifications';
import api from '@/services/api';
import { useSession } from '@/contexts/AuthContext';
import { colors } from '@/styles/colors';
import { setStorageItemAsync, getStorageItemAsync } from '@/storage/useStorageState';

const NOTIFICATION_PROMPT_DISMISSED = 'notification_prompt_dismissed';

type PushNotificationContextType = {
  requestPermissionAndRegister: () => Promise<boolean>;
  isPermissionGranted: boolean | null;
  hasAskedUser: boolean;
};

const PushNotificationContext = createContext<PushNotificationContextType>({
  requestPermissionAndRegister: async () => false,
  isPermissionGranted: null,
  hasAskedUser: false,
});

export function usePushNotification() {
  return useContext(PushNotificationContext);
}

export function PushNotificationProvider({ children }: PropsWithChildren) {
  const { userInfo } = useSession();
  const { t } = useTranslation();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState<boolean | null>(null);
  const [hasAskedUser, setHasAskedUser] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const requestPermissionAndRegister = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;

    try {
      setIsRegistering(true);
      const token = await registerForPushNotificationsAsync();
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
          { headers: { Authorization: `Bearer ${userInfo.token}` } }
        );
        setIsPermissionGranted(true);
        setShowPrompt(false);
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Failed to register push token:', error);
      return false;
    } finally {
      setIsRegistering(false);
    }
  }, [userInfo?.token, userInfo?.user_id]);

  const handleEnable = async () => {
    const granted = await requestPermissionAndRegister();
    setHasAskedUser(true);
    if (!granted) {
      await setStorageItemAsync(NOTIFICATION_PROMPT_DISMISSED, 'true');
    }
  };

  const handleNotNow = async () => {
    setShowPrompt(false);
    setHasAskedUser(true);
    await setStorageItemAsync(NOTIFICATION_PROMPT_DISMISSED, 'true');
  };

  useEffect(() => {
    if (Platform.OS === 'web' || !userInfo?.token) return;

    const checkAndShowPrompt = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        setIsPermissionGranted(status === 'granted');

        if (status === 'granted') {
          setHasAskedUser(true);
          await requestPermissionAndRegister();
          return;
        }

        if (status === 'denied') {
          setHasAskedUser(true);
          return;
        }

        const val = await getStorageItemAsync(NOTIFICATION_PROMPT_DISMISSED);
        const dismissed = val === 'true';

        if (!dismissed) {
          setShowPrompt(true);
        }
      } catch (error) {
        console.warn('Error checking notification permission:', error);
      }
    };

    checkAndShowPrompt();
  }, [userInfo?.token]);

  return (
    <PushNotificationContext.Provider
      value={{
        requestPermissionAndRegister,
        isPermissionGranted,
        hasAskedUser,
      }}
    >
      {children}

      {showPrompt && Platform.OS !== 'web' && (
        <Modal
          visible={showPrompt}
          transparent
          animationType="fade"
          onRequestClose={handleNotNow}
        >
          <View className="flex-1 justify-center items-center bg-black/50 px-6">
            <View
              className="bg-white rounded-2xl p-6 max-w-sm w-full"
              style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}
            >
              <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
                {t('Enable daily reminders?')}
              </Text>
              <Text className="text-gray-600 mb-6 text-center">
                {t('Receive a daily notification to help you stay on track with your studies.')}
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={handleNotNow}
                  className="flex-1 py-3 rounded-xl border border-gray-300"
                >
                  <Text className="text-center font-medium text-gray-700">
                    {t('Not now')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleEnable}
                  disabled={isRegistering}
                  className="flex-1 py-3 rounded-xl"
                  style={{ backgroundColor: colors.primary[500] }}
                >
                  <Text className="text-center font-medium text-white">
                    {isRegistering ? t('Enabling...') : t('Enable')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </PushNotificationContext.Provider>
  );
}
