import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useNotification } from '@/contexts/NotificationContext';
import { useSupportChat } from '@/contexts/SupportChatContext';
import { useHasRole } from '@/hooks/useHasRole';
import { colors } from '@/styles/colors';
import { useTranslation } from 'react-i18next';

const NotificationsScreen = () => {
  const router = useRouter();
  const { notifications, markAllAsRead, markAsRead } = useNotification();
  const { openChat } = useSupportChat();
  const { roles } = useHasRole();
  const { t } = useTranslation();
  const isAssignedAdmin = roles.includes('admin');

  const handleBack = () => {
    router.back();
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
  };

  return (
    <View
      className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8"
      style={Platform.OS === 'web' ? { height: '100%' } : {}}
    >
      <View className="flex-row justify-between items-center mb-4">
        <TouchableOpacity
          onPress={handleBack}
          className="flex-row items-center mb-3 mr-5"
        >
          <Ionicons
            name="arrow-back-circle"
            size={24}
            color={colors.primary[500]}
          />
          <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
        </TouchableOpacity>

        {notifications.length > 0 && (
          <TouchableOpacity onPress={handleMarkAll}>
            <Text style={{ color: colors.primary[500], fontWeight: 'bold' }}>
              {t('Mark all as read')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Text
        className="text-2xl font-bold mb-4"
        style={{ color: colors.gray[900] }}
      >
        {t('Notifications')}
      </Text>

      {notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: colors.gray[500] }}>
            {t('You have no notifications yet')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => {
            const isRead = item.is_read;
            const title = item.data?.title || t('Notification');
            const body = item.data?.body || '';

            const handlePressItem = async () => {
              if (!isRead) {
                await markAsRead(item._id);
              }
              if (item.type === 'support') {
                const ticketId = item.data?.ticket_id;
                if (isAssignedAdmin && ticketId) {
                  router.push({
                    pathname: '/admin/support/[ticketId]' as any,
                    params: { ticketId },
                  });
                } else {
                  openChat();
                }
              }
            };

            return (
              <TouchableOpacity onPress={handlePressItem} activeOpacity={0.7}>
                <View
                  className="mb-3 p-3 rounded-lg"
                  style={{
                    backgroundColor: isRead ? colors.gray[100] : colors.info[500],
                    borderLeftWidth: 4,
                    borderLeftColor: isRead ? colors.gray[300] : colors.info[500],
                  }}
                >
                  <Text
                    className="font-semibold mb-1"
                    style={{
                      color: isRead ? colors.gray[800] : colors.info[700],
                    }}
                  >
                    {title}
                  </Text>
                  {!!body && (
                    <Text style={{ color: colors.gray[700] }}>{body}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

export default NotificationsScreen;
