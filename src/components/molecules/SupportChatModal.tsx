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
import {
  supportApi,
  type SupportMessage,
  type SupportTicket,
} from '@/services/support';
import { useToast } from '@/components/Toast';
import { StarRating } from '@/components/molecules/StarRating';
import SupportHistoryDrawer from '@/components/molecules/SupportHistoryDrawer';

const POLL_MS = 2000;

export default function SupportChatModal() {
  const { t } = useTranslation();
  const { userInfo } = useSession();
  const {
    isOpen,
    closeChat,
    refreshUnread,
    focusTicketId,
    clearFocusTicketId,
  } = useSupportChat();
  const { toast } = useToast();
  const listRef = useRef<FlatList<SupportMessage> | null>(null);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingCsat, setSavingCsat] = useState(false);
  const [csatValue, setCsatValue] = useState<number | null>(null);
  const [csatDismissed, setCsatDismissed] = useState(false);
  const [composingNew, setComposingNew] = useState(false);

  const lastCreatedAtRef = useRef<string | undefined>(undefined);
  const selectedTicketId = composingNew ? null : ticket?._id;
  const focusTicketIdRef = useRef(focusTicketId);
  focusTicketIdRef.current = focusTicketId;

  const pendingCsat =
    !composingNew &&
    ticket?.status === 'closed' &&
    ticket.csat_required &&
    ticket.csat_score === null;

  const showCsat = Boolean(pendingCsat && !csatDismissed);

  const applyConversation = useCallback(
    (data: {
      ticket: SupportTicket | null;
      messages: SupportMessage[];
      tickets?: SupportTicket[];
    }) => {
      if (data.tickets) setTickets(data.tickets);
      setTicket(data.ticket);
      const loaded = data.messages || [];
      setMessages(loaded);
      lastCreatedAtRef.current = loaded[loaded.length - 1]?.created_at || undefined;
    },
    [],
  );

  const loadConversation = useCallback(
    async (ticketId?: string, asNew = false) => {
      if (!userInfo?.token) return;
      try {
        setLoading(true);
        const response = await supportApi.getConversation(userInfo.token, {
          ticketId: asNew ? undefined : ticketId,
        });
        if (asNew) {
          setTickets(response.data.tickets || []);
          setTicket(null);
          setMessages([]);
          lastCreatedAtRef.current = undefined;
          setComposingNew(true);
          return;
        }
        setComposingNew(false);
        applyConversation(response.data);
        const loadedTicket = response.data.ticket;
        if (loadedTicket?.unread_for_user) {
          await supportApi.markRead(userInfo.token, loadedTicket._id);
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
    },
    [userInfo?.token, refreshUnread, t, toast, applyConversation],
  );

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
      const targetId = focusTicketIdRef.current || undefined;
      if (focusTicketIdRef.current) clearFocusTicketId();
      loadConversation(targetId);
    } else {
      setDraft('');
      setMessages([]);
      setTicket(null);
      setTickets([]);
      setComposingNew(false);
      setCsatValue(null);
      setCsatDismissed(false);
      lastCreatedAtRef.current = undefined;
    }
  }, [isOpen, loadConversation, clearFocusTicketId]);

  useEffect(() => {
    setCsatDismissed(false);
    setCsatValue(null);
  }, [ticket?._id, ticket?.status, ticket?.csat_required, ticket?.csat_submitted_at]);

  useEffect(() => {
    if (!isOpen || !userInfo?.token || composingNew) return;
    const timer = setInterval(async () => {
      try {
        const response = await supportApi.getMessages(userInfo.token, {
          since: lastCreatedAtRef.current,
          ticketId: ticket?._id,
        });
        mergeIncoming(response.data.messages || []);
        if (response.data.tickets) setTickets(response.data.tickets);
        if (response.data.ticket) {
          setTicket(response.data.ticket);
          if (response.data.ticket.unread_for_user) {
            await supportApi.markRead(userInfo.token, response.data.ticket._id);
            await refreshUnread();
          }
        }
      } catch {
        // polling is best-effort
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [
    isOpen,
    userInfo?.token,
    composingNew,
    ticket?._id,
    mergeIncoming,
    refreshUnread,
  ]);

  useEffect(() => {
    if (messages.length) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  const handleSelectTicket = (ticketId: string) => {
    loadConversation(ticketId);
  };

  const handleNewConversation = () => {
    const active = tickets.find((item) => item.status !== 'closed');
    if (active) {
      loadConversation(active._id);
      return;
    }
    setComposingNew(true);
    setTicket(null);
    setMessages([]);
    setDraft('');
    lastCreatedAtRef.current = undefined;
  };

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || sending || !userInfo?.token) return;
    if (ticket?.status === 'closed') return;

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
      const response = await supportApi.sendMessage(
        userInfo.token,
        body,
        composingNew ? undefined : ticket?._id,
      );
      setComposingNew(false);
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
      const listed = await supportApi.listTickets(userInfo.token);
      setTickets(listed.data.tickets || []);
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

  const handleSubmitCsat = async () => {
    if (csatValue === null || !ticket || !userInfo?.token || savingCsat) return;
    setSavingCsat(true);
    try {
      const response = await supportApi.submitCsat(
        userInfo.token,
        ticket._id,
        csatValue,
      );
      setTicket(response.data.ticket);
      setTickets((prev) =>
        prev.map((item) =>
          item._id === response.data.ticket._id ? response.data.ticket : item,
        ),
      );
    } catch (error: any) {
      toast({
        message: error?.response?.data?.error || t('Error sending rating'),
        variant: 'destructive',
      });
    } finally {
      setSavingCsat(false);
    }
  };

  const isClosed = !composingNew && ticket?.status === 'closed';
  const canSend = !isClosed;

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
            className="bg-white rounded-t-lg w-full h-[90%] p-4 relative"
            style={{ backgroundColor: colors.surface }}
          >
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-2xl font-bold" style={{ color: colors.text }}>
                {t('Support')}
              </Text>
              <View className="flex-row items-center">
                <SupportHistoryDrawer
                  tickets={tickets}
                  selectedId={selectedTicketId}
                  onSelect={handleSelectTicket}
                />
                <TouchableOpacity onPress={closeChat} className="ml-2">
                  <MaterialIcons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
            <Text className="text-xs mb-3" style={{ color: colors.textSecondary }}>
              {isClosed
                ? t('This conversation is closed')
                : t('Send a message to the support team')}
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
                  if (item.author_role === 'system') {
                    return (
                      <View className="mb-2 items-center">
                        <Text className="text-xs text-center italic px-4" style={{ color: colors.gray[500] }}>
                          {t(item.body)}
                        </Text>
                      </View>
                    );
                  }
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

            {isClosed && ticket?.csat_score !== null && ticket?.csat_score !== undefined ? (
              <View className="items-center mb-3">
                <Text className="text-xs mb-1" style={{ color: colors.gray[500] }}>
                  {t('Your rating')}
                </Text>
                <StarRating value={ticket.csat_score} readonly allowZero size={20} />
              </View>
            ) : null}

            {canSend ? (
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
            ) : (
              <View className="border-t border-gray-200 pt-3">
                <TouchableOpacity
                  onPress={handleNewConversation}
                  className="rounded-xl py-3 items-center"
                  style={{ backgroundColor: colors.primary[500] }}
                >
                  <Text className="font-bold text-white">{t('New conversation')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {showCsat ? (
              <View
                className="absolute inset-0 items-center justify-center px-6 rounded-t-lg z-50"
                style={{ backgroundColor: colors.overlay.medium }}
              >
                <View
                  className="w-full max-w-[420px] rounded-2xl p-6"
                  style={{ backgroundColor: colors.white }}
                >
                  <Text className="text-lg font-bold text-gray-800 text-center">
                    {t('How was the support?')}
                  </Text>
                  <Text className="text-sm text-gray-500 text-center mt-1 mb-5">
                    {t('This support conversation was closed. Please rate your experience.')}
                  </Text>
                  <View className="items-center mb-6">
                    <StarRating
                      value={csatValue}
                      onChange={setCsatValue}
                      size={36}
                      allowZero
                    />
                  </View>
                  <TouchableOpacity
                    onPress={handleSubmitCsat}
                    disabled={csatValue === null || savingCsat}
                    className="rounded-xl py-3 items-center mb-3"
                    style={{
                      backgroundColor:
                        csatValue !== null ? colors.primary[500] : colors.gray[300],
                    }}
                  >
                    {savingCsat ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text className="font-bold text-white">{t('Submit rating')}</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setCsatDismissed(true)}
                    disabled={savingCsat}
                    className="py-2 items-center"
                  >
                    <Text className="font-semibold" style={{ color: colors.gray[500] }}>
                      {t('Not now')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
