import {
  View,
  TouchableOpacity,
  Text,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import { Octicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useProfile } from '@/contexts/profileContext';
import { Chats } from '@/contexts/CollectionContext';

type ChatExploreDrawerProps = {
  menuItems: Chats[];
  onSelectChat: (chatId: string) => void;
};

const ChatExploreDrawer = ({
  menuItems,
  onSelectChat,
}: ChatExploreDrawerProps) => {
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-300)).current;

  const handleClose = () => {
    setOpen(false);
  };

  useEffect(() => {
    if (open) {
      Animated.timing(translateX, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateX, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [open]);

  const groupMenuItemsByDate = (items: Chats[]) => {
    const now = new Date();
    const todayItems: Chats[] = [];
    const last7DaysItems: Chats[] = [];
    const last30DaysItems: Chats[] = [];
    const olderItems: Chats[] = [];

    items.forEach((item) => {
      const updatedAt = new Date(item.created_at);
      const diffInMs = now.getTime() - updatedAt.getTime();
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

      if (diffInDays < 1) {
        todayItems.push(item);
      } else if (diffInDays < 7) {
        last7DaysItems.push(item);
      } else if (diffInDays < 30) {
        last30DaysItems.push(item);
      } else {
        olderItems.push(item);
      }
    });

    return {
      todayItems,
      last7DaysItems,
      last30DaysItems,
      olderItems,
    };
  };

  const { todayItems, last7DaysItems, last30DaysItems, olderItems } =
    groupMenuItemsByDate(menuItems);

  const renderSection = (title: string, items: Chats[]) => {
    if (items.length === 0) return null;

    return (
      <View className="mb-6 bg-white p-3">
        <Text className="font-bold text-lg mb-2">{title}</Text>
        {items.map((item) => {
          return (
            <Pressable
              key={item._id}
              className="flex-row mb-2"
              onPress={() => {
                onSelectChat(item._id);
                handleClose();
              }}
              {...(Platform.OS === 'web' ? { onMouseLeave: () => {} } : {})}
            >
              <View className="relative max-w-[120px] overflow-hidden">
                <Text className="text-base" numberOfLines={1}>
                  {item.history[1].parts[0].text.slice(0, 15)}
                </Text>
                {item.history[1].parts[0].text.length > 10 && (
                  <LinearGradient
                    colors={['transparent', 'white']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="absolute right-0 top-0 bottom-0 w-8"
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  };

  return (
    <View>
      {!open && (
        <TouchableOpacity onPress={() => setOpen(true)}>
          <Octicons name="sidebar-expand" size={24} color="black" />
        </TouchableOpacity>
      )}
      <Modal
        transparent
        animationType="fade"
        visible={open}
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback
          onPress={(e) => {
            if (e.target === e.currentTarget) {
              handleClose();
            }
          }}
        >
          <View className="flex-1 relative">
            <Animated.View
              style={{
                position: 'absolute',
                right: 0,
                top: 65,
                padding: 20,
                transform: [{ translateX }],
                width: 200,
                height: '80%',
              }}
              className="bg-white h-full w-[300px] absolute right-0 top-0 p-4 rounded-l-2xl shadow-lg"
            >
              <TouchableOpacity
                className="flex flex-row gap-2 items-center mb-3"
                onPress={() => setOpen(false)}
              >
                <Octicons name="sidebar-collapse" size={24} color="black" />
              </TouchableOpacity>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
              >
                {renderSection(t('Today'), todayItems)}
                {renderSection(t('Last 7 days'), last7DaysItems)}
                {renderSection(t('Last 30 days'), last30DaysItems)}
                {renderSection(t('Oldest'), olderItems)}
              </ScrollView>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default ChatExploreDrawer;
