import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { usePushNotification } from '@/contexts/PushNotificationContext';

export function NotificationPermissionCard() {
  const { t } = useTranslation();
  const {
    showHomeCard,
    dismissHomeCard,
    enableNotifications,
    openDeviceNotificationSettings,
    isRegistering,
  } = usePushNotification();

  if (!showHomeCard) return null;

  return (
    <View
      className="bg-white rounded-2xl p-4 mt-4 mb-2"
      style={{
        borderWidth: 1,
        borderColor: colors.primary[200],
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <View className="flex-row items-start">
        <View
          className="rounded-full p-2 mr-3"
          style={{ backgroundColor: colors.primary[50] }}
        >
          <MaterialIcons name="notifications-active" size={22} color={colors.primary[500]} />
        </View>
        <View className="flex-1 pr-2">
          <Text className="font-bold text-base mb-1" style={{ color: colors.primary[600] }}>
            {t('Enable notifications')}
          </Text>
          <Text className="text-sm text-gray-500">
            {t('Receive a daily notification to help you stay on track with your studies.')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={dismissHomeCard}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('Close')}
        >
          <MaterialIcons name="close" size={20} color={colors.gray[500]} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={enableNotifications}
        disabled={isRegistering}
        className="mt-4 py-3 rounded-xl"
        style={{ backgroundColor: colors.primary[500], opacity: isRegistering ? 0.7 : 1 }}
        accessibilityRole="button"
        accessibilityLabel={t('Enable')}
      >
        <Text className="text-center font-semibold text-white">
          {isRegistering ? t('Enabling...') : t('Enable')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={openDeviceNotificationSettings}
        className="mt-3 py-1"
        accessibilityRole="link"
        accessibilityLabel={t('Open notification settings')}
      >
        <Text
          className="text-center text-sm underline"
          style={{ color: colors.primary[500] }}
        >
          {t('Open notification settings')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
