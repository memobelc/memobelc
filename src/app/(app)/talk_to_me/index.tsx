import React, { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import api from '@/services/api';
import { useSession } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/colors';

type Message = {
  sender: 'user' | 'bot';
  text: string;
};

type Settings = {
  language_conversation: string;
};

export default function ChatScreen() {
  const router = useRouter();

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const [setting_language, setSetting_language] = useState('pt-br');

  const { userInfo } = useSession();

  const sendMessage = async (current_message: string) => {
    if (!current_message.trim()) return;

    const newMessages: Message[] = [
      ...messages,
      { sender: 'user', text: current_message },
    ];
    setMessages(newMessages);

    const settings = { language_conversation: setting_language };

    const response = await api.post(
      '/chat',
      { messages, current_message, settings },
      {
        headers: {
          Authorization: `Bearer ${userInfo?.token}`,
        },
      },
    );
    setMessages([...newMessages, { sender: 'bot', text: response.data.reply }]);
    setMessage('');
  };

  useEffect(() => {
    if (messages.length == 0) {
      setMessages([
        {
          sender: 'bot',
          text:
            setting_language == 'pt-br'
              ? `Oi, ${userInfo!.name.charAt(0).toUpperCase() + userInfo!.name.slice(1)}! 🚀 Que tal aprender algo novo de um jeito super divertido? 🎉 O que você quer explorar hoje?`
              : `Hi, ${userInfo!.name.charAt(0).toUpperCase() + userInfo!.name.slice(1)}! 🚀 How about learning something new in a super fun way? 🎉 What do you want to explore today?`,
        },
      ]);
    }
  }, []);

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
          <Text style={{ color: colors.primary[500] }}>Back</Text>
        </TouchableOpacity>
      </View>
      <View className="flex-1  pt-0 p-4 bg-white">
        <FlatList
          data={messages}
          renderItem={({ item }) => (
            <View
              className={`mb-2 flex-row ${item.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <View
                className="relative max-w-[80%] p-3 rounded-lg"
                style={{
                  backgroundColor:
                    item.sender === 'user' ? '#DCF8C6' : '#E5E5EA',
                  alignSelf: item.sender === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <Text className="text-black">{item.text}</Text>
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
                      item.sender === 'user' ? '#DCF8C6' : '#E5E5EA',
                    transform: [
                      { rotate: item.sender === 'user' ? '45deg' : '-45deg' },
                    ],
                    left: item.sender === 'user' ? 'auto' : -5,
                    right: item.sender === 'user' ? -5 : 'auto',
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
            placeholder="Digite sua mensagem"
            autoCorrect={false}
            spellCheck={false}
            autoCapitalize="none"
          />
          <TouchableOpacity
            className="ml-2 p-3 bg-blue-500 rounded-full"
            onPress={() => {
              setMessage('');
              sendMessage(message);
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
