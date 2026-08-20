import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useSupportChat } from '@/contexts/SupportChatContext';
import { supportApi, type SupportMessage, type SupportTicket } from '@/services/support';
import { useToast } from '@/components/Toast';

const POLL_MS = 2000;

export default function SupportChatModal() {
  const { t } = useTranslation();
  const { userInfo } = useSession();
  const { isOpen, closeChat, refreshUnread } = useSupportChat();
  const { toast } = useToast();
  const listRef = useRef<FlatList<SupportMessage> | null>(null);

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const lastCreatedAtRef = useRef<string | undefined>(undefined);

  const loadConversation = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const response = await supportApi.getConversation(userInfo.token);
      setTicket(response.data.ticket);
      const loaded = response.data.messages || [];
      setMessages(loaded);
      lastCreatedAtRef.current = loaded[loaded.length - 1]?.created_at || undefined;
      if (response.data.ticket?.unread_for_user) {
        await supportApi.markRead(userInfo.token);
        await refreshUnread();
      }
    } catch (error: any) {
      toast({
        message: error?.response?.data?.error || t('Error loading conversation'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [userInfo?.token, refreshUnread, t, toast]);

  const mergeIncoming = useCallback((incoming: SupportMessage[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const persisted = prev.filter((item) => !item._id.startsWith('temp-'));
      const known = new Set(persisted.map((item) => item._id));
      const next = incoming.filter((item) => !known.has(item._id));
      if (!next.length) return prev;
      const withoutMatchingTemp = prev.filter((item) => {
        if (!item._id.startsWith('temp-')) return true;
        return !next.some(
          (msg) => msg.body === item.body && msg.author_role === item.author_role,
        );
      });
      const merged = [...withoutMatchingTemp, ...next];
      const lastPersisted = merged.filter((item) => !item._id.startsWith('temp-'));
      lastCreatedAtRef.current =
        lastPersisted[lastPersisted.length - 1]?.created_at || lastCreatedAtRef.current;
      return merged;
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadConversation();
    } else {
      setDraft('');
      setMessages([]);
      setTicket(null);
      lastCreatedAtRef.current = undefined;
    }
  }, [isOpen, loadConversation]);

  useEffect(() => {
    if (!isOpen || !userInfo?.token) return;
    const timer = setInterval(async () => {
      try {
        const response = await supportApi.getMessages(
          userInfo.token,
          lastCreatedAtRef.current,
        );
        mergeIncoming(response.data.messages || []);
        if (response.data.ticket) {
          setTicket(response.data.ticket);
          if (response.data.ticket.unread_for_user) {
            await supportApi.markRead(userInfo.token);
            await refreshUnread();
          }
        }
      } catch {
        // polling is best-effort
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [isOpen, userInfo?.token, mergeIncoming, refreshUnread]);

  useEffect(() => {
    if (messages.length) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || sending || !userInfo?.token) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: SupportMessage = {
      _id: tempId,
      ticket_id: ticket?._id || '',
      author_id: userInfo.user_id || '',
      author_role: 'user',
      body,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    setSending(true);

    try {
      const response = await supportApi.sendMessage(userInfo.token, body);
      setTicket(response.data.ticket);
      setMessages((prev) => {
        const withoutTemp = prev.filter((item) => item._id !== tempId);
        if (withoutTemp.some((item) => item._id === response.data.message._id)) {
          return withoutTemp;
        }
        lastCreatedAtRef.current =
          response.data.message.created_at || lastCreatedAtRef.current;
        return [...withoutTemp, response.data.message];
      });
    } catch (error: any) {
      setMessages((prev) => prev.filter((item) => item._id !== tempId));
      setDraft(body);
      toast({
        message: error?.response?.data?.error || t('Error sending message'),
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      transparent
      animationType="slide"
      visible={isOpen}
      onRequestClose={closeChat}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1 justify-end items-center bg-black/75">
          <View
            className="bg-white rounded-t-lg w-full h-[90%] p-4"
            style={{ backgroundColor: colors.surface }}
          >
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-2xl font-bold" style={{ color: colors.text }}>
                {t('Support')}
              </Text>
              <TouchableOpacity onPress={closeChat}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text className="text-xs mb-3" style={{ color: colors.textSecondary }}>
              {t('Send a message to the support team')}
            </Text>

            {loading && messages.length === 0 ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color={colors.primary[500]} />
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(item) => item._id}
                className="flex-1"
                contentContainerStyle={{
                  paddingBottom: 12,
                  flexGrow: 1,
                  justifyContent: messages.length ? 'flex-end' : 'center',
                }}
                ListEmptyComponent={
                  <Text className="text-center" style={{ color: colors.gray[500] }}>
                    {t('How can we help you?')}
                  </Text>
                }
                renderItem={({ item }) => {
                  const mine = item.author_role === 'user';
                  return (
                    <View
                      className={`mb-2 flex-row ${mine ? 'justify-end' : 'justify-start'}`}
                    >
                      <View
                        className="max-w-[80%] p-3 rounded-lg"
                        style={{
                          backgroundColor: mine ? '#DCF8C6' : colors.gray[200],
                        }}
                      >
                        <Text style={{ color: colors.text }}>{item.body}</Text>
                      </View>
                    </View>
                  );
                }}
              />
            )}

            <View className="flex-row items-center border-t border-gray-200 pt-3">
              <TextInput
                className="flex-1 p-2 bg-gray-100 rounded-lg"
                value={draft}
                onChangeText={setDraft}
                placeholder={t('Type your message')}
                placeholderTextColor={colors.gray[400]}
                autoCorrect={false}
                multiline
                maxLength={4000}
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity
                className="ml-2 p-3 rounded-full"
                style={{
                  backgroundColor:
                    sending || !draft.trim()
                      ? colors.gray[400]
                      : colors.primary[500],
                }}
                disabled={sending || !draft.trim()}
                onPress={handleSend}
              >
                <Ionicons name="send" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
