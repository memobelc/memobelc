import {
  View,
  TouchableOpacity,
  Text,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Pressable,
  ScrollView,
} from 'react-native';
import { Octicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import type { SupportTicket } from '@/services/support';

type SupportHistoryDrawerProps = {
  tickets: SupportTicket[];
  selectedId?: string | null;
  onSelect: (ticketId: string) => void;
};

function ticketDate(ticket: SupportTicket) {
  return ticket.last_message_at || ticket.closed_at || ticket.created_at || '';
}

export default function SupportHistoryDrawer({
  tickets,
  selectedId,
  onSelect,
}: SupportHistoryDrawerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const translateX = useRef(new Animated.Value(300)).current;

  const handleClose = () => setOpen(false);

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: open ? 0 : 300,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [open, translateX]);

  const groupByDate = (items: SupportTicket[]) => {
    const now = new Date();
    const todayItems: SupportTicket[] = [];
    const last7DaysItems: SupportTicket[] = [];
    const last30DaysItems: SupportTicket[] = [];
    const olderItems: SupportTicket[] = [];

    items.forEach((item) => {
      const updatedAt = new Date(ticketDate(item));
      const diffInDays =
        (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (!ticketDate(item) || Number.isNaN(diffInDays) || diffInDays < 1) {
        todayItems.push(item);
      } else if (diffInDays < 7) {
        last7DaysItems.push(item);
      } else if (diffInDays < 30) {
        last30DaysItems.push(item);
      } else {
        olderItems.push(item);
      }
    });

    return { todayItems, last7DaysItems, last30DaysItems, olderItems };
  };

  const { todayItems, last7DaysItems, last30DaysItems, olderItems } =
    groupByDate(tickets);

  const renderSection = (title: string, items: SupportTicket[]) => {
    if (items.length === 0) return null;
    return (
      <View className="mb-5">
        <Text className="font-bold text-base mb-2" style={{ color: colors.text }}>
          {title}
        </Text>
        {items.map((item) => {
          const selected = item._id === selectedId;
          const closed = item.status === 'closed';
          return (
            <Pressable
              key={item._id}
              className="mb-2 p-2 rounded-lg"
              style={{
                backgroundColor: selected ? colors.primary[100] : 'transparent',
              }}
              onPress={() => {
                onSelect(item._id);
                handleClose();
              }}
            >
              <Text
                className="text-sm"
                numberOfLines={2}
                style={{ color: colors.text }}
              >
                {item.last_message_preview || t('No messages yet')}
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: colors.gray[500] }}>
                {closed
                  ? t('Closed')
                  : item.status === 'in_progress'
                    ? t('In progress')
                    : t('Open')}
                {item.unread_for_user > 0 ? ` · ${item.unread_for_user}` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  if (!tickets.length) return null;

  return (
    <View>
      <TouchableOpacity onPress={() => setOpen(true)} className="p-1">
        <Octicons name="sidebar-expand" size={22} color={colors.text} />
      </TouchableOpacity>
      <Modal
        transparent
        animationType="fade"
        visible={open}
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View className="flex-1" style={{ backgroundColor: colors.overlay.medium }}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 280,
                  transform: [{ translateX }],
                  backgroundColor: colors.surface,
                  padding: 16,
                }}
              >
                <TouchableOpacity
                  className="flex-row items-center mb-4"
                  onPress={handleClose}
                >
                  <Octicons name="sidebar-collapse" size={22} color={colors.text} />
                  <Text className="ml-2 font-bold" style={{ color: colors.text }}>
                    {t('Support history')}
                  </Text>
                </TouchableOpacity>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {renderSection(t('Today'), todayItems)}
                  {renderSection(t('Last 7 days'), last7DaysItems)}
                  {renderSection(t('Last 30 days'), last30DaysItems)}
                  {renderSection(t('Oldest'), olderItems)}
                </ScrollView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
