import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { colors } from '@/styles/colors';
import { useNotification } from '@/contexts/NotificationContext';

const NotificationBell = () => {
  const router = useRouter();
  const { unreadCount, refreshNotifications } = useNotification();

  const handlePress = () => {
    refreshNotifications();
    router.push('/notifications');
  };

  return (
    <TouchableOpacity onPress={handlePress} className="ml-3">
      <View>
        <Ionicons
          name="notifications-outline"
          size={24}
          color={colors.gray[100]}
        />
        {unreadCount > 0 && (
          <View
            className="absolute -top-2 -right-2 rounded-full px-1.5"
            style={{ backgroundColor: colors.error[500] }}
          >
            <Text className="text-white text-[10px] font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default NotificationBell;
