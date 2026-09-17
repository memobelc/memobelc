import React, { useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { useNotification } from '@/contexts/NotificationContext';

const NotificationBell = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { unreadCount, refreshNotifications } = useNotification();
  const [focused, setFocused] = useState(false);

  const handlePress = () => {
    refreshNotifications();
    router.push('/notifications');
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={t('Notifications')}
      accessibilityHint={
        unreadCount > 0
          ? t('{{count}} unread', { count: unreadCount })
          : undefined
      }
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
        minWidth: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 22,
        borderWidth: 2,
        borderColor: focused ? 'rgba(255,255,255,0.9)' : 'transparent',
        backgroundColor:
          pressed || hovered ? 'rgba(255,255,255,0.18)' : 'transparent',
        opacity: pressed ? 0.92 : 1,
        ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
      })}
    >
      <View>
        <Ionicons
          name="notifications-outline"
          size={24}
          color={colors.gray[100]}
        />
        {unreadCount > 0 && (
          <View
            className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full px-1 items-center justify-center"
            style={{ backgroundColor: colors.error[500] }}
          >
            <Text className="text-white text-[10px] font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
};

export default NotificationBell;
