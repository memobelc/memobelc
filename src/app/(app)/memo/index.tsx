import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSession } from '@/contexts/AuthContext';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import { colors } from '@/styles/colors';
import { memoApiService } from '@/services/memoApi';
import { useToast } from '@/components/Toast';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function MemoScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { toast: showToast } = useToast();
  const flatListRef = useRef<FlatList<Message> | null>(null);

  const sessionId = userInfo?.user_id || userInfo?.email || 'default';

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [docCount, setDocCount] = useState(0);
  const [documentsAdded, setDocumentsAdded] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [addingText, setAddingText] = useState(false);
  const [addingFiles, setAddingFiles] = useState(false);

  const fetchDocCount = async () => {
    try {
      const res = await memoApiService.getDocumentCount(sessionId);
      setDocCount(res.count);
    } catch {
      setDocCount(0);
    }
  };

  useEffect(() => {
    fetchDocCount();
  }, [sessionId]);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleAddText = async () => {
    if (!textInput.trim()) return;
    setAddingText(true);
    try {
      await memoApiService.addText(textInput.trim(), sessionId);
      setDocumentsAdded((prev) => [...prev, 'Texto digitado']);
      setTextInput('');
      await fetchDocCount();
      showToast({ message: t('Text added!'), variant: 'success' });
    } catch (err) {
      showToast({ message: t('An unexpected error occurred'), variant: 'destructive' });
    } finally {
      setAddingText(false);
    }
  };

  const handleAddFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'text/plain',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled || !result.assets?.length) return;

      setAddingFiles(true);
      const files = result.assets.map((a) => ({
        uri: a.uri,
        name: a.name || 'document',
        type: a.mimeType || 'application/octet-stream',
      }));

      const res = await memoApiService.addFiles(files, sessionId);
      if (res.added?.length) {
        setDocumentsAdded((prev) => [...prev, ...res.added]);
        await fetchDocCount();
        showToast({ message: res.added.map((n: string) => `✓ ${n}`).join(', '), variant: 'success' });
      }
      if (res.errors?.length) {
        showToast({ message: res.errors.join('; '), variant: 'destructive' });
      }
    } catch (err) {
      showToast({ message: t('An unexpected error occurred'), variant: 'destructive' });
    } finally {
      setAddingFiles(false);
    }
  };

  const handleClearDocuments = async () => {
    try {
      await memoApiService.clearDocuments(sessionId);
      setDocumentsAdded([]);
      setDocCount(0);
      setMessages([]);
      showToast({ message: t('Base cleared!'), variant: 'success' });
      setModalVisible(false);
    } catch {
      showToast({ message: t('An unexpected error occurred'), variant: 'destructive' });
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMsg: Message = { role: 'user', content: message.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setMessage('');
    setLoading(true);

    try {
      const res = await memoApiService.query(message.trim(), sessionId);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.answer }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: t('An unexpected error occurred'),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <View className="w-full flex-row justify-between items-center p-4 border-b border-gray-200">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <Ionicons
            name="arrow-back-circle"
            size={24}
            color={colors.primary[500]}
          />
          <Text
            className="ml-2 font-[ComicSans] font-bold"
            style={{ color: colors.primary[600] }}
          >
            {t('Back')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="flex-row items-center px-3 py-2 rounded-xl"
          style={{ backgroundColor: colors.primary[100] }}
        >
          <MaterialIcons
            name="description"
            size={22}
            color={colors.primary[600]}
          />
          <Text
            className="ml-2 font-[ComicSans] font-semibold"
            style={{ color: colors.primary[600] }}
          >
            {t('Materials')}
          </Text>
          {docCount > 0 && (
            <View
              className="ml-2 px-2 py-0.5 rounded-full"
              style={{ backgroundColor: colors.primary[500] }}
            >
              <Text className="text-white text-xs font-bold">{docCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View className="flex-1 p-4">
        <Text
          className="font-[ComicSans] text-lg font-bold mb-1"
          style={{ color: colors.primary[600] }}
        >
          {t('Chat with your documents')}
        </Text>
        <Text className="font-[ComicSans] text-sm text-gray-500 mb-4">
          {t('Ask about the content of the materials you attached. The AI only answers based on them.')}
        </Text>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => (
            <View
              className={`mb-3 flex-row ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <View
                className="max-w-[85%] p-3 rounded-2xl"
                style={{
                  backgroundColor:
                    item.role === 'user'
                      ? colors.primary[500]
                      : colors.gray[200],
                  alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <Text
                  className={
                    item.role === 'user' ? 'text-white' : 'text-gray-800'
                  }
                  style={{ fontFamily: Platform.OS === 'web' ? 'Comic Sans MS' : undefined }}
                >
                  {item.content}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            docCount === 0 ? (
              <View className="flex-1 items-center justify-center py-12">
                <MaterialIcons
                  name="description"
                  size={48}
                  color={colors.gray[400]}
                />
                <Text
                  className="font-[ComicSans] text-center text-gray-500 mt-3 px-6"
                >
                  {t('Add documents or text. The AI will respond only based on them.')}
                </Text>
              </View>
            ) : null
          }
        />

        {loading && (
          <View className="flex-row justify-start mb-2">
            <ActivityIndicator size="small" color={colors.primary[500]} />
            <Text className="ml-2 text-gray-500 font-[ComicSans]">
              {t('Loading...')}
            </Text>
          </View>
        )}

        <View className="flex-row items-center border-t border-gray-200 pt-3">
          <TextInput
            className="flex-1 p-3 rounded-xl font-[ComicSans]"
            style={{
              backgroundColor: colors.gray[100],
              color: colors.gray[900],
            }}
            value={message}
            onChangeText={setMessage}
            placeholder={t('Type your question...')}
            placeholderTextColor={colors.gray[500]}
            editable={!loading}
          />
          <TouchableOpacity
            className="ml-3 p-3 rounded-full"
            style={{ backgroundColor: colors.primary[500] }}
            onPress={sendMessage}
            disabled={loading}
          >
            <Ionicons name="send" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl max-h-[80%]"
          >
            <View className="p-5">
              <View className="flex-row items-center justify-between mb-4">
                <Text
                  className="font-[ComicSans] font-bold text-lg"
                  style={{ color: colors.primary[600] }}
                >
                  {t('Materials')}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={28} color={colors.gray[600]} />
                </TouchableOpacity>
              </View>
              <Text className="font-[ComicSans] text-gray-600 text-sm mb-4">
                {t('Add documents or text. The AI will respond only based on them.')}
              </Text>

              <TouchableOpacity
                onPress={handleAddFiles}
                disabled={addingFiles}
                className="flex-row items-center justify-center py-3 rounded-xl mb-3"
                style={{ backgroundColor: colors.primary[100] }}
              >
                {addingFiles ? (
                  <ActivityIndicator size="small" color={colors.primary[600]} />
                ) : (
                  <>
                    <MaterialIcons
                      name="upload-file"
                      size={22}
                      color={colors.primary[600]}
                    />
                    <Text
                      className="ml-2 font-[ComicSans] font-semibold"
                      style={{ color: colors.primary[600] }}
                    >
                      {t('Send files (PDF, TXT, DOCX)')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <Text className="font-[ComicSans] text-gray-600 text-sm mb-2">
                {t('Or paste text here:')}
              </Text>
              <TextInput
                className="p-3 rounded-xl border border-gray-300 font-[ComicSans] mb-3"
                style={{ minHeight: 100, textAlignVertical: 'top' }}
                value={textInput}
                onChangeText={setTextInput}
                placeholder={t('Or paste text here:')}
                placeholderTextColor={colors.gray[500]}
                multiline
              />
              <TouchableOpacity
                onPress={handleAddText}
                disabled={addingText || !textInput.trim()}
                className="flex-row items-center justify-center py-3 rounded-xl mb-4"
                style={{
                  backgroundColor: textInput.trim()
                    ? colors.primary[500]
                    : colors.gray[300],
                }}
              >
                {addingText ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="font-[ComicSans] font-semibold text-white">
                    {t('Add text')}
                  </Text>
                )}
              </TouchableOpacity>

              <View className="mb-4">
                <Text className="font-[ComicSans] text-gray-600 text-sm">
                  {t('Indexed chunks')}: {docCount}
                </Text>
                {documentsAdded.length > 0 && (
                  <ScrollView className="mt-2 max-h-24">
                    {documentsAdded.slice(-8).map((d, i) => (
                      <Text
                        key={i}
                        className="font-[ComicSans] text-gray-600 text-xs"
                      >
                        • {d}
                      </Text>
                    ))}
                  </ScrollView>
                )}
              </View>

              <TouchableOpacity
                onPress={handleClearDocuments}
                className="flex-row items-center justify-center py-3 rounded-xl border border-red-300"
              >
                <MaterialIcons name="delete-outline" size={22} color="#DC2626" />
                <Text className="ml-2 font-[ComicSans] font-semibold text-red-600">
                  {t('Clear all documents')}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
