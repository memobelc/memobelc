import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import api from '@/services/api';
import { useSession } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/styles/colors';
import { useProfile } from '@/contexts/profileContext';
import ChatExploreDrawer from '@/components/molecules/ChatExploreDrawer';
import { Chats } from '@/contexts/CollectionContext';

type TextMessage = {
  text: string;
};

type Message = {
  role: string;
  parts: TextMessage[];
};

type Settings = {
  language_conversation: string;
};

export default function ChatScreen() {
  const { t } = useTranslation();
  const { language } = useProfile();
  const router = useRouter();
  const flatListRef = useRef<FlatList<any> | null>(null);

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<boolean>(false);

  const [setting_language, setSetting_language] = useState(language || 'en');
  const [menuItems, setMenuItems] = useState<Chats[] | null>();

  const { userInfo } = useSession();

  const fetchDataChats = async () => {
    try {
      const response = await api.get('/chat/get_chats_by_user', {
        headers: {
          Authorization: `Bearer ${userInfo?.token}`,
        },
      });

      if (response.status === 200) {
        setMenuItems(response.data.chats);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const sendMessage = async (newMessage: string) => {
    if (!newMessage.trim()) return;

    const newMessages: Message[] = [
      ...messages,
      { role: 'user', parts: [{ text: newMessage }] },
    ];

    setMessages(newMessages);

    const settings = { language_conversation: setting_language };

    const response = await api.post(
      '/chat/talk_to_me',
      { history: newMessages, message: newMessage, settings, id: chatId },
      {
        headers: {
          Authorization: `Bearer ${userInfo?.token}`,
        },
      },
    );
    setSelectedChatId(false);
    setMessages([
      ...newMessages,
      { role: 'model', parts: [{ text: response.data.reply }] },
    ]);
    setChatId(response.data.chat_id);
  };

  const handleSetChat = async (id: string) => {
    setChatId(id);
    setSelectedChatId(true);
  };

  useEffect(() => {
    fetchDataChats();
    if (messages.length == 0) {
      setMessages([
        {
          role: 'model',
          parts: [
            {
              text:
                setting_language == 'pt-BR'
                  ? `Oi, ${userInfo!.name.charAt(0).toUpperCase() + userInfo!.name.slice(1)}! 🚀 Que tal aprender algo novo de um jeito super divertido? 🎉 O que você quer explorar hoje?`
                  : `Hi, ${userInfo!.name.charAt(0).toUpperCase() + userInfo!.name.slice(1)}! 🚀 How about learning something new in a super fun way? 🎉 What do you want to explore today?`,
            },
          ],
        },
      ]);
    }
  }, []);
  useEffect(() => {
    if (chatId && selectedChatId) {
      const selected = menuItems?.find((item) => item._id === chatId);
      setMessages(selected?.history ?? []);
    }
  }, [chatId]);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  return (
    <View className="flex-1 bg-white">
      <View className="w-full flex-row justify-between  p-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <Ionicons
            name="arrow-back-circle"
            size={24}
            color={colors.primary[500]}
          />
          <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
        </TouchableOpacity>
        {menuItems && menuItems.length > 0 && (
          <View className="">
            <ChatExploreDrawer
              menuItems={menuItems}
              onSelectChat={handleSetChat}
            />
          </View>
        )}
      </View>
      <View className="flex-1  pt-0 p-4">
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => (
            <View
              className={`mb-2 flex-row ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <View
                className="relative max-w-[80%] p-3 rounded-lg"
                style={{
                  backgroundColor: item.role === 'user' ? '#DCF8C6' : '#E5E5EA',
                  alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <Text className="text-black">{item.parts[0].text}</Text>
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    width: 0,
                    height: 0,
                    borderStyle: 'solid',
                    borderLeftWidth: 10,
                    borderRightWidth: 10,
                    borderBottomWidth: 10,
                    borderLeftColor: 'transparent',
                    borderRightColor: 'transparent',
                    borderBottomColor:
                      item.role === 'user' ? '#DCF8C6' : '#E5E5EA',
                    transform: [
                      { rotate: item.role === 'user' ? '45deg' : '-45deg' },
                    ],
                    left: item.role === 'user' ? 'auto' : -5,
                    right: item.role === 'user' ? -5 : 'auto',
                  }}
                />
              </View>
            </View>
          )}
        />

        <View className="flex-row items-center border-t border-gray-300 p-2">
          <TextInput
            className="flex-1 p-2 bg-gray-100 rounded-lg"
            value={message}
            onChangeText={setMessage}
            placeholder={t('Type your message')}
            autoCorrect={false}
            spellCheck={false}
            autoCapitalize="none"
          />
          <TouchableOpacity
            className="ml-2 p-3 bg-blue-500 rounded-full"
            onPress={() => {
              sendMessage(message);
              setMessage('');
            }}
          >
            <Text className="text-white font-bold">
              <Ionicons name="send" size={24} color="white" />
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
