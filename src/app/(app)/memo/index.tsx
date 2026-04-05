import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { colors } from '@/styles/colors';
import { memoApiService, memoMetaService, MemoMessage, MemoSummary } from '@/services/memoApi';

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = { role: 'user' | 'assistant'; content: string };

// ─── Component ───────────────────────────────────────────────────────────────

export default function MemoScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { toast: showToast } = useToast();
  const token = userInfo?.token ?? null;

  // Memo list
  const [memos, setMemos] = useState<MemoSummary[]>([]);
  const [loadingMemos, setLoadingMemos] = useState(true);

  // Selected memo state
  const [activeMemo, setActiveMemo] = useState<MemoSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [docCount, setDocCount] = useState(0);
  const [documentsAdded, setDocumentsAdded] = useState<string[]>([]);

  // Chat input
  const [message, setMessage] = useState('');
  const [loadingReply, setLoadingReply] = useState(false);

  // Materials modal
  const [materialsVisible, setMaterialsVisible] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [addingText, setAddingText] = useState(false);
  const [addingFiles, setAddingFiles] = useState(false);

  // New memo modal
  const [newMemoVisible, setNewMemoVisible] = useState(false);
  const [newMemoName, setNewMemoName] = useState('');
  const [creatingMemo, setCreatingMemo] = useState(false);

  // Rename modal
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameName, setRenameName] = useState('');

  // Sidebar drawer
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(-300)).current;

  const flatListRef = useRef<FlatList<Message>>(null);

  // ── Load memo list ────────────────────────────────────────────────────────

  const fetchMemos = useCallback(async () => {
    try {
      setLoadingMemos(true);
      const list = await memoMetaService.list(token);
      setMemos(list);
    } catch {
      showToast({ message: t('An unexpected error occurred'), variant: 'destructive' });
    } finally {
      setLoadingMemos(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMemos();
  }, [fetchMemos]);

  // ── Select a memo ─────────────────────────────────────────────────────────

  const selectMemo = useCallback(
    async (memo: MemoSummary) => {
      setActiveMemo(memo);
      setMessages([]);
      setDocumentsAdded([]);
      closeSidebar();
      try {
        const detail = await memoMetaService.get(memo._id, token);
        const loaded: Message[] = (detail.messages ?? []).map((m: MemoMessage) => ({
          role: m.role,
          content: m.content,
        }));
        setMessages(loaded);

        const countRes = await memoApiService.getDocumentCount(memo._id, token);
        setDocCount(countRes.count ?? 0);
      } catch {
        setDocCount(0);
      }
    },
    [token],
  );

  // ── Sidebar animation ─────────────────────────────────────────────────────

  const openSidebar = () => {
    setSidebarVisible(true);
    Animated.timing(sidebarAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeSidebar = () => {
    Animated.timing(sidebarAnim, {
      toValue: -300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSidebarVisible(false));
  };

  // ── Create memo ───────────────────────────────────────────────────────────

  const handleCreateMemo = async () => {
    const name = newMemoName.trim() || t('New Memo');
    setCreatingMemo(true);
    try {
      const res = await memoMetaService.create(name, token);
      const created: MemoSummary = {
        _id: res.memo_id,
        name: res.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setMemos((prev) => [created, ...prev]);
      setNewMemoVisible(false);
      setNewMemoName('');
      selectMemo(created);
    } catch {
      showToast({ message: t('An unexpected error occurred'), variant: 'destructive' });
    } finally {
      setCreatingMemo(false);
    }
  };

  // ── Rename memo ───────────────────────────────────────────────────────────

  const handleRenameMemo = async () => {
    if (!activeMemo || !renameName.trim()) return;
    try {
      await memoMetaService.rename(activeMemo._id, renameName.trim(), token);
      const updated = { ...activeMemo, name: renameName.trim() };
      setActiveMemo(updated);
      setMemos((prev) => prev.map((m) => (m._id === activeMemo._id ? updated : m)));
      setRenameVisible(false);
    } catch {
      showToast({ message: t('An unexpected error occurred'), variant: 'destructive' });
    }
  };

  // ── Delete memo ───────────────────────────────────────────────────────────

  const handleDeleteMemo = async () => {
    if (!activeMemo) return;
    try {
      await memoApiService.clearDocuments(activeMemo._id, token);
    } catch {}
    try {
      await memoMetaService.delete(activeMemo._id, token);
      setMemos((prev) => prev.filter((m) => m._id !== activeMemo._id));
      setActiveMemo(null);
      setMessages([]);
      setDocCount(0);
      setMaterialsVisible(false);
    } catch {
      showToast({ message: t('An unexpected error occurred'), variant: 'destructive' });
    }
  };

  // ── Add text document ─────────────────────────────────────────────────────

  const handleAddText = async () => {
    if (!activeMemo || !textInput.trim()) return;
    setAddingText(true);
    try {
      await memoApiService.addText(textInput.trim(), activeMemo._id, token);
      setDocumentsAdded((prev) => [...prev, t('Typed text')]);
      setTextInput('');
      const countRes = await memoApiService.getDocumentCount(activeMemo._id, token);
      setDocCount(countRes.count ?? 0);
      showToast({ message: t('Text added!'), variant: 'success' });
    } catch {
      showToast({ message: t('An unexpected error occurred'), variant: 'destructive' });
    } finally {
      setAddingText(false);
    }
  };

  // ── Add file documents ────────────────────────────────────────────────────

  const handleAddFiles = async () => {
    if (!activeMemo) return;
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
      const res = await memoApiService.addFiles(files, activeMemo._id, token);
      if (res.added?.length) {
        setDocumentsAdded((prev) => [...prev, ...res.added]);
        const countRes = await memoApiService.getDocumentCount(activeMemo._id, token);
        setDocCount(countRes.count ?? 0);
        showToast({ message: res.added.map((n: string) => `✓ ${n}`).join(', '), variant: 'success' });
      }
      if (res.errors?.length) {
        showToast({ message: res.errors.join('; '), variant: 'destructive' });
      }
    } catch {
      showToast({ message: t('An unexpected error occurred'), variant: 'destructive' });
    } finally {
      setAddingFiles(false);
    }
  };

  // ── Clear documents ───────────────────────────────────────────────────────

  const handleClearDocuments = async () => {
    if (!activeMemo) return;
    try {
      await memoApiService.clearDocuments(activeMemo._id, token);
      await memoMetaService.clearMessages(activeMemo._id, token);
      setDocumentsAdded([]);
      setDocCount(0);
      setMessages([]);
      showToast({ message: t('Base cleared!'), variant: 'success' });
      setMaterialsVisible(false);
    } catch {
      showToast({ message: t('An unexpected error occurred'), variant: 'destructive' });
    }
  };

  // ── Send chat message ─────────────────────────────────────────────────────

  const sendMessage = async () => {
    if (!activeMemo || !message.trim()) return;

    const userMsg: Message = { role: 'user', content: message.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setMessage('');
    setLoadingReply(true);

    try {
      const res = await memoApiService.query(userMsg.content, activeMemo._id, token);
      const assistantMsg: Message = { role: 'assistant', content: res.answer };
      setMessages((prev) => [...prev, assistantMsg]);

      await memoMetaService.saveMessages(
        activeMemo._id,
        [
          { role: 'user', content: userMsg.content },
          { role: 'assistant', content: res.answer },
        ],
        token,
      );
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t('An unexpected error occurred') },
      ]);
    } finally {
      setLoadingReply(false);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-white">
      {/* ── Top bar ── */}
      <View className="w-full flex-row justify-between items-center p-4 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
          <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
          <Text className="ml-2 font-[ComicSans] font-bold" style={{ color: colors.primary[600] }}>
            {t('Back')}
          </Text>
        </TouchableOpacity>

        <View className="flex-row items-center gap-2">
          {activeMemo && (
            <TouchableOpacity
              onPress={() => { setMaterialsVisible(true); }}
              className="flex-row items-center px-3 py-2 rounded-xl"
              style={{ backgroundColor: colors.primary[100] }}
            >
              <MaterialIcons name="description" size={20} color={colors.primary[600]} />
              <Text className="ml-1 font-[ComicSans] font-semibold text-sm" style={{ color: colors.primary[600] }}>
                {t('Materials')}
              </Text>
              {docCount > 0 && (
                <View className="ml-1 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: colors.primary[500] }}>
                  <Text className="text-white text-xs font-bold">{docCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={openSidebar}
            className="p-2 rounded-xl"
            style={{ backgroundColor: colors.primary[100] }}
          >
            <MaterialIcons name="menu-book" size={22} color={colors.primary[600]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Main area ── */}
      {!activeMemo ? (
        /* ── No memo selected → landing ── */
        <View className="flex-1 items-center justify-center p-6">
          {loadingMemos ? (
            <ActivityIndicator size="large" color={colors.primary[500]} />
          ) : (
            <>
              <MaterialIcons name="auto-stories" size={56} color={colors.primary[300]} />
              <Text className="font-[ComicSans] font-bold text-xl mt-4 text-center" style={{ color: colors.primary[600] }}>
                Memo
              </Text>
              <Text className="font-[ComicSans] text-gray-500 text-center mt-2 mb-6 px-4">
                {t('Create a memo, upload documents and chat with your content.')}
              </Text>
              <TouchableOpacity
                onPress={() => setNewMemoVisible(true)}
                className="flex-row items-center px-6 py-3 rounded-2xl"
                style={{ backgroundColor: colors.primary[500] }}
              >
                <Ionicons name="add-circle-outline" size={22} color="white" />
                <Text className="ml-2 font-[ComicSans] font-bold text-white text-base">
                  {t('New Memo')}
                </Text>
              </TouchableOpacity>

              {memos.length > 0 && (
                <>
                  <Text className="font-[ComicSans] text-gray-500 mt-8 mb-3 font-semibold">
                    {t('Your memos')}
                  </Text>
                  <ScrollView className="w-full max-h-60">
                    {memos.map((m) => (
                      <TouchableOpacity
                        key={m._id}
                        onPress={() => selectMemo(m)}
                        className="flex-row items-center p-4 mb-2 rounded-2xl border border-gray-200"
                        style={{ backgroundColor: colors.primary[50] }}
                      >
                        <MaterialIcons name="chat" size={20} color={colors.primary[500]} />
                        <Text className="ml-3 font-[ComicSans] font-semibold flex-1" style={{ color: colors.primary[700] }}>
                          {m.name}
                        </Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.gray[400]} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}
            </>
          )}
        </View>
      ) : (
        /* ── Memo selected → chat view ── */
        <View className="flex-1 p-4">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="font-[ComicSans] text-lg font-bold flex-1" style={{ color: colors.primary[600] }} numberOfLines={1}>
              {activeMemo.name}
            </Text>
            <TouchableOpacity onPress={() => { setRenameName(activeMemo.name); setRenameVisible(true); }} className="ml-2 p-1">
              <MaterialIcons name="edit" size={18} color={colors.gray[400]} />
            </TouchableOpacity>
          </View>
          <Text className="font-[ComicSans] text-sm text-gray-500 mb-3">
            {t('Ask about the content of the materials you attached. The AI only answers based on them.')}
          </Text>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item }) => (
              <View className={`mb-3 flex-row ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <View
                  className="max-w-[85%] p-3 rounded-2xl"
                  style={{
                    backgroundColor: item.role === 'user' ? colors.primary[500] : colors.gray[200],
                  }}
                >
                  <Text
                    className={item.role === 'user' ? 'text-white' : 'text-gray-800'}
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
                  <MaterialIcons name="description" size={48} color={colors.gray[400]} />
                  <Text className="font-[ComicSans] text-center text-gray-500 mt-3 px-6">
                    {t('Add documents or text. The AI will respond only based on them.')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setMaterialsVisible(true)}
                    className="mt-4 px-5 py-2.5 rounded-2xl"
                    style={{ backgroundColor: colors.primary[500] }}
                  >
                    <Text className="font-[ComicSans] font-bold text-white">{t('Add materials')}</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />

          {loadingReply && (
            <View className="flex-row items-center justify-start mb-2">
              <ActivityIndicator size="small" color={colors.primary[500]} />
              <Text className="ml-2 text-gray-500 font-[ComicSans]">{t('Loading...')}</Text>
            </View>
          )}

          <View className="flex-row items-center border-t border-gray-200 pt-3">
            <TextInput
              className="flex-1 p-3 rounded-xl font-[ComicSans]"
              style={{ backgroundColor: colors.gray[100], color: colors.gray[900] }}
              value={message}
              onChangeText={setMessage}
              placeholder={t('Type your question...')}
              placeholderTextColor={colors.gray[500]}
              editable={!loadingReply}
            />
            <TouchableOpacity
              className="ml-3 p-3 rounded-full"
              style={{ backgroundColor: colors.primary[500] }}
              onPress={sendMessage}
              disabled={loadingReply}
            >
              <Ionicons name="send" size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ────── Sidebar drawer ────── */}
      <Modal visible={sidebarVisible} animationType="none" transparent onRequestClose={closeSidebar}>
        <TouchableOpacity activeOpacity={1} onPress={closeSidebar} className="flex-1 bg-black/40 flex-row">
          <Animated.View
            style={{ transform: [{ translateX: sidebarAnim }], width: 280 }}
            className="h-full bg-white shadow-xl pt-10 pb-6"
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}} className="flex-1">
              <View className="px-4 pb-3 border-b border-gray-200 flex-row items-center justify-between">
                <Text className="font-[ComicSans] font-bold text-lg" style={{ color: colors.primary[700] }}>
                  Memos
                </Text>
                <TouchableOpacity
                  onPress={() => { closeSidebar(); setTimeout(() => setNewMemoVisible(true), 250); }}
                  className="p-1 rounded-lg"
                  style={{ backgroundColor: colors.primary[100] }}
                >
                  <Ionicons name="add" size={22} color={colors.primary[600]} />
                </TouchableOpacity>
              </View>

              <ScrollView className="flex-1 px-3 pt-3">
                {loadingMemos ? (
                  <ActivityIndicator color={colors.primary[500]} className="mt-6" />
                ) : memos.length === 0 ? (
                  <Text className="font-[ComicSans] text-gray-400 text-center mt-8">
                    {t('No memos yet')}
                  </Text>
                ) : (
                  memos.map((m) => (
                    <TouchableOpacity
                      key={m._id}
                      onPress={() => selectMemo(m)}
                      className="flex-row items-center p-3 mb-1.5 rounded-xl"
                      style={{
                        backgroundColor:
                          activeMemo?._id === m._id ? colors.primary[100] : 'transparent',
                      }}
                    >
                      <MaterialIcons
                        name="chat"
                        size={18}
                        color={activeMemo?._id === m._id ? colors.primary[600] : colors.gray[500]}
                      />
                      <Text
                        className="ml-2 font-[ComicSans] flex-1 text-sm"
                        style={{
                          color: activeMemo?._id === m._id ? colors.primary[700] : colors.gray[700],
                          fontWeight: activeMemo?._id === m._id ? '700' : '400',
                        }}
                        numberOfLines={1}
                      >
                        {m.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* ────── New memo modal ────── */}
      <Modal visible={newMemoVisible} animationType="fade" transparent onRequestClose={() => setNewMemoVisible(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setNewMemoVisible(false)}
          className="flex-1 bg-black/50 items-center justify-center p-6"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-5 w-full max-w-sm"
          >
            <Text className="font-[ComicSans] font-bold text-lg mb-4" style={{ color: colors.primary[700] }}>
              {t('New Memo')}
            </Text>
            <TextInput
              className="p-3 rounded-xl border border-gray-300 font-[ComicSans] mb-4"
              value={newMemoName}
              onChangeText={setNewMemoName}
              placeholder={t('Memo name (optional)')}
              placeholderTextColor={colors.gray[400]}
              autoFocus
              onSubmitEditing={handleCreateMemo}
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setNewMemoVisible(false)}
                className="flex-1 py-3 rounded-xl border border-gray-300 items-center"
              >
                <Text className="font-[ComicSans] text-gray-600">{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateMemo}
                disabled={creatingMemo}
                className="flex-1 py-3 rounded-xl items-center"
                style={{ backgroundColor: colors.primary[500] }}
              >
                {creatingMemo ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="font-[ComicSans] font-bold text-white">{t('Create')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ────── Rename modal ────── */}
      <Modal visible={renameVisible} animationType="fade" transparent onRequestClose={() => setRenameVisible(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setRenameVisible(false)}
          className="flex-1 bg-black/50 items-center justify-center p-6"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-5 w-full max-w-sm"
          >
            <Text className="font-[ComicSans] font-bold text-lg mb-4" style={{ color: colors.primary[700] }}>
              {t('Rename Memo')}
            </Text>
            <TextInput
              className="p-3 rounded-xl border border-gray-300 font-[ComicSans] mb-4"
              value={renameName}
              onChangeText={setRenameName}
              placeholder={t('New name')}
              placeholderTextColor={colors.gray[400]}
              autoFocus
              onSubmitEditing={handleRenameMemo}
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setRenameVisible(false)}
                className="flex-1 py-3 rounded-xl border border-gray-300 items-center"
              >
                <Text className="font-[ComicSans] text-gray-600">{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRenameMemo}
                className="flex-1 py-3 rounded-xl items-center"
                style={{ backgroundColor: colors.primary[500] }}
              >
                <Text className="font-[ComicSans] font-bold text-white">{t('Save')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ────── Materials modal ────── */}
      <Modal
        visible={materialsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setMaterialsVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setMaterialsVisible(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl max-h-[85%]"
          >
            <View className="p-5">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="font-[ComicSans] font-bold text-lg" style={{ color: colors.primary[600] }}>
                  {t('Materials')}
                </Text>
                <TouchableOpacity onPress={() => setMaterialsVisible(false)}>
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
                    <MaterialIcons name="upload-file" size={22} color={colors.primary[600]} />
                    <Text className="ml-2 font-[ComicSans] font-semibold" style={{ color: colors.primary[600] }}>
                      {t('Send files (PDF, TXT, DOCX)')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <Text className="font-[ComicSans] text-gray-600 text-sm mb-2">{t('Or paste text here:')}</Text>
              <TextInput
                className="p-3 rounded-xl border border-gray-300 font-[ComicSans] mb-3"
                style={{ minHeight: 90, textAlignVertical: 'top' }}
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
                style={{ backgroundColor: textInput.trim() ? colors.primary[500] : colors.gray[300] }}
              >
                {addingText ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="font-[ComicSans] font-semibold text-white">{t('Add text')}</Text>
                )}
              </TouchableOpacity>

              <View className="mb-4">
                <Text className="font-[ComicSans] text-gray-600 text-sm">
                  {t('Indexed chunks')}: {docCount}
                </Text>
                {documentsAdded.length > 0 && (
                  <ScrollView className="mt-2 max-h-20">
                    {documentsAdded.slice(-8).map((d, i) => (
                      <Text key={i} className="font-[ComicSans] text-gray-600 text-xs">
                        • {d}
                      </Text>
                    ))}
                  </ScrollView>
                )}
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={handleClearDocuments}
                  className="flex-1 flex-row items-center justify-center py-3 rounded-xl border border-red-300"
                >
                  <MaterialIcons name="delete-outline" size={20} color="#DC2626" />
                  <Text className="ml-1 font-[ComicSans] font-semibold text-red-600 text-sm">
                    {t('Clear documents')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleDeleteMemo}
                  className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
                  style={{ backgroundColor: '#FEE2E2' }}
                >
                  <MaterialIcons name="delete-forever" size={20} color="#DC2626" />
                  <Text className="ml-1 font-[ComicSans] font-semibold text-red-700 text-sm">
                    {t('Delete Memo')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
