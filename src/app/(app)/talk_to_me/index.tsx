import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  FlatList,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import api from '@/services/api';
import { useSession } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import {
  createAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';

import { colors } from '@/styles/colors';
import { useProfile } from '@/contexts/profileContext';
import ChatExploreDrawer from '@/components/molecules/ChatExploreDrawer';
import { Chats } from '@/contexts/CollectionContext';
import {
  VoiceRealtimeClient,
  recordingToBase64,
} from '@/services/voiceRealtime';

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
  const [callMode, setCallMode] = useState(false);
  const [callStatus, setCallStatus] = useState<'disconnected' | 'connecting' | 'listening' | 'processing' | 'speaking'>('disconnected');
  const [callError, setCallError] = useState<string | null>(null);

  const { userInfo } = useSession();
  const voiceClientRef = useRef<VoiceRealtimeClient | null>(null);
  const soundRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const streamAudioRef = useRef('');
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    sampleRate: 16000,
    numberOfChannels: 1,
    android: {
      ...RecordingPresets.HIGH_QUALITY.android,
      sampleRate: 16000,
      numberOfChannels: 1,
      extension: '.m4a',
    },
    ios: {
      ...RecordingPresets.HIGH_QUALITY.ios,
      sampleRate: 16000,
      numberOfChannels: 1,
      extension: '.m4a',
    },
  });

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

  const stopSound = async () => {
    if (!soundRef.current) return;
    try {
      soundRef.current.pause();
      soundRef.current.seekTo(0);
      soundRef.current.remove();
    } catch {
      // ignore unload errors for old sounds
    } finally {
      soundRef.current = null;
    }
  };

  const connectVoiceSession = async () => {
    if (!userInfo?.token) return;

    setCallStatus('connecting');
    setCallError(null);
    streamAudioRef.current = '';
    const client = new VoiceRealtimeClient({
      onOpen: () => {
        client.send('session.start', {
          token: userInfo.token,
          chat_id: chatId,
          history: messages,
          settings: { language_conversation: setting_language },
        });
      },
      onClose: () => {
        setCallMode(false);
        setCallStatus('disconnected');
      },
      onError: (error) => {
        setCallMode(false);
        setCallStatus('disconnected');
        setCallError(error);
      },
      onMessage: async (messageEvent) => {
        const { event, data } = messageEvent;
        if (event === 'session.started') {
          setCallStatus('listening');
          if (data?.chat_id) setChatId(data.chat_id);
          return;
        }
        if (event === 'transcript.partial') {
          setCallStatus('processing');
          return;
        }
        if (event === 'transcript.final') {
          setMessages((prev) => [
            ...prev,
            { role: 'user', parts: [{ text: data?.text ?? '' }] },
          ]);
          return;
        }
        if (event === 'assistant.text') {
          setMessages((prev) => [
            ...prev,
            { role: 'model', parts: [{ text: data?.text ?? '' }] },
          ]);
          if (data?.chat_id) setChatId(data.chat_id);
          return;
        }
        if (event === 'assistant.audio.chunk') {
          setCallStatus('speaking');
          streamAudioRef.current += data?.chunk ?? '';
          return;
        }
        if (event === 'assistant.audio.end') {
          if (!streamAudioRef.current) {
            setCallStatus('listening');
            return;
          }
          const mimeType = data?.mime_type ?? 'audio/mpeg';
          const source = `data:${mimeType};base64,${streamAudioRef.current}`;
          streamAudioRef.current = '';
          await stopSound();
          const player = createAudioPlayer({ uri: source });
          soundRef.current = player;
          player.addListener('playbackStatusUpdate', (status) => {
            if (status.didJustFinish) {
              setCallStatus('listening');
            }
          });
          player.play();
          return;
        }
        if (event === 'error') {
          const errorMessage = data?.message ?? 'Unknown voice session error.';
          console.error('Voice session error:', errorMessage);
          setCallError(errorMessage);
          setCallStatus('listening');
        }
      },
    });

    client.connect();
    voiceClientRef.current = client;
    setCallMode(true);
  };

  const startRecording = async () => {
    if (!callMode || callStatus !== 'listening') return;
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      setCallError('Microphone permission denied.');
      return;
    }
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
      shouldPlayInBackground: false,
    });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stopRecordingAndSend = async () => {
    if (!recorder.isRecording || !voiceClientRef.current) return;
    setCallStatus('processing');
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    const uri = recorder.uri ?? recorder.getStatus().url;
    if (!uri) {
      setCallError('Failed to read recorded audio.');
      setCallStatus('listening');
      return;
    }
    const base64 = await recordingToBase64(uri);
    const mimeType = Platform.OS === 'web' ? 'audio/webm' : 'audio/mp4';
    voiceClientRef.current.send('audio.input.chunk', {
      chunk: base64,
      mime_type: mimeType,
    });
    voiceClientRef.current.send('audio.input.commit', { mime_type: mimeType });
  };

  const disconnectVoiceSession = async () => {
    try {
      voiceClientRef.current?.send('session.end', {});
    } catch {
      // connection may already be closed
    }
    voiceClientRef.current?.close();
    voiceClientRef.current = null;
    streamAudioRef.current = '';
    await stopSound();
    setCallMode(false);
    setCallStatus('disconnected');
    setCallError(null);
  };

  const handleSetChat = async (id: string) => {
    setChatId(id);
    setSelectedChatId(true);
  };

  useEffect(() => {
    fetchDataChats();
    if (messages.length == 0) {
      const rawName = userInfo?.name ?? '';
      const displayName = rawName
        ? rawName.charAt(0).toUpperCase() + rawName.slice(1)
        : '';
      const greeting =
        setting_language == 'pt-BR'
          ? `Oi${displayName ? `, ${displayName}` : ''}! 🚀 Que tal aprender algo novo de um jeito super divertido? 🎉 O que você quer explorar hoje?`
          : `Hi${displayName ? `, ${displayName}` : ''}! 🚀 How about learning something new in a super fun way? 🎉 What do you want to explore today?`;
      setMessages([
        {
          role: 'model',
          parts: [{ text: greeting }],
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

  useEffect(() => {
    return () => {
      disconnectVoiceSession();
    };
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
          <TouchableOpacity
            className={`ml-2 p-3 rounded-full ${callMode ? 'bg-red-500' : 'bg-green-600'}`}
            onPress={() => (callMode ? disconnectVoiceSession() : connectVoiceSession())}
          >
            <Ionicons name={callMode ? 'call' : 'call-outline'} size={22} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            className={`ml-2 p-3 rounded-full ${callMode ? 'bg-purple-600' : 'bg-gray-400'}`}
            disabled={!callMode}
            onPressIn={startRecording}
            onPressOut={stopRecordingAndSend}
          >
            <Ionicons name="mic" size={22} color="white" />
          </TouchableOpacity>
        </View>
        {callMode && (
          <>
            <Text className="text-center text-xs text-gray-600 mt-2">
              Call mode: {callStatus}
            </Text>
            {callError && (
              <Text className="text-center text-xs text-red-500 mt-1">
                {callError}
              </Text>
            )}
          </>
        )}
      </View>
    </View>
  );
}
