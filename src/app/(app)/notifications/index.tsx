import React, { useCallback, useMemo } from 'react';
import { View, Text, FlatList, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useNotification } from '@/contexts/NotificationContext';
import { useSupportChat } from '@/contexts/SupportChatContext';
import { useHasRole } from '@/hooks/useHasRole';
import { useNow } from '@/hooks/useNow';
import { formatFriendlyDate, parseTimestamp } from '@/utils/formatFriendlyDate';
import { colors } from '@/styles/colors';
import NotificationListItem from '@/components/molecules/NotificationListItem';

const NotificationsScreen = () => {
  const router = useRouter();
  const { notifications, markAllAsRead, markAsRead, refreshNotifications } =
    useNotification();
  const { openChat } = useSupportChat();
  const { roles } = useHasRole();
  const { t, i18n } = useTranslation();
  const now = useNow(30_000);
  const isAssignedAdmin = roles.includes('admin');

  useFocusEffect(
    useCallback(() => {
      refreshNotifications();
    }, [refreshNotifications]),
  );

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => {
      const timeA = parseTimestamp(a.created_at)?.getTime() ?? 0;
      const timeB = parseTimestamp(b.created_at)?.getTime() ?? 0;
      return timeB - timeA;
    });
  }, [notifications]);

  const handleBack = () => {
    router.back();
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
  };

  return (
    <View
      className="flex-1 w-full px-4 md:w-4/5 max-w-[1440px] mx-auto mt-8"
      style={Platform.OS === 'web' ? { height: '100%' } : {}}
    >
      <View className="flex-row flex-wrap justify-between items-center mb-4 gap-2">
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel={t('Back')}
          hitSlop={4}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
            minHeight: 44,
            minWidth: 44,
            paddingRight: 12,
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 8,
            backgroundColor:
              pressed || hovered ? colors.primary[50] : 'transparent',
            ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
          })}
        >
          <Ionicons
            name="arrow-back-circle"
            size={24}
            color={colors.primary[500]}
          />
          <Text style={{ color: colors.primary[500], marginLeft: 6, fontWeight: '600' }}>
            {t('Back')}
          </Text>
        </Pressable>

        <View className="flex-row items-center" style={{ gap: 4 }}>
          <Pressable
            onPress={() => router.push('/settings' as any)}
            accessibilityRole="button"
            accessibilityLabel={t('Notification settings')}
            hitSlop={4}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
              minWidth: 44,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 22,
              backgroundColor:
                pressed || hovered ? colors.primary[50] : 'transparent',
              ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
            })}
          >
            <Ionicons name="settings-outline" size={22} color={colors.primary[500]} />
          </Pressable>
          {sortedNotifications.length > 0 && (
            <Pressable
              onPress={handleMarkAll}
              accessibilityRole="button"
              accessibilityLabel={t('Mark all as read')}
              hitSlop={4}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
                minHeight: 44,
                paddingHorizontal: 12,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                backgroundColor:
                  pressed || hovered ? colors.primary[50] : 'transparent',
                ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
              })}
            >
              <Text style={{ color: colors.primary[500], fontWeight: '700' }}>
                {t('Mark all as read')}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <Text
        className="text-2xl font-bold mb-5"
        style={{ color: colors.gray[900] }}
      >
        {t('Notifications')}
      </Text>

      {sortedNotifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6 py-16">
          <Ionicons
            name="notifications-off-outline"
            size={40}
            color={colors.gray[400]}
          />
          <Text
            className="mt-3 text-center"
            style={{ color: colors.gray[500], fontSize: 16, lineHeight: 24 }}
          >
            {t('You have no notifications yet')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedNotifications}
          keyExtractor={(item) => item._id}
          extraData={now}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }) => {
            const isRead = item.is_read;
            const title = item.data?.title || t('Notification');
            const body = item.data?.body || '';
            const timeLabel = formatFriendlyDate(item.created_at, t, {
              now,
              locale: i18n.language,
            });

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
              if (item.type === 'affiliate_sales') {
                router.push('/affiliate/sales' as any);
              }
              if (item.type === 'affiliate' && isAssignedAdmin) {
                const kind = item.data?.kind;
                if (kind === 'application') {
                  router.push('/admin/affiliates/applications' as any);
                } else if (kind === 'withdrawal') {
                  router.push('/admin/affiliates/withdrawals' as any);
                } else {
                  router.push('/admin/affiliates/commissions' as any);
                }
              }
            };

            return (
              <NotificationListItem
                title={title}
                body={body}
                isRead={isRead}
                timeLabel={timeLabel}
                onPress={handlePressItem}
              />
            );
          }}
        />
      )}
    </View>
  );
};

export default NotificationsScreen;
