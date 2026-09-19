import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { useToast } from '@/components/Toast';
import { Loading } from '@/components/Loading';
import { StarRating } from '@/components/molecules/StarRating';
import {
  DropDown,
  DropDownContent,
  DropDownItem,
  DropDownTrigger,
} from '@/components/DropDown';
import {
  supportApi,
  type SupportMessage,
  type SupportTicket,
} from '@/services/support';

const POLL_MS = 2000;

function statusLabel(status: string, t: (key: string) => string) {
  if (status === 'closed') return t('Closed');
  if (status === 'in_progress') return t('In progress');
  return t('Open');
}

export default function AdminSupportTicketScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { ticketId: ticketIdParam } = useLocalSearchParams<{ ticketId: string }>();
  const ticketId = Array.isArray(ticketIdParam) ? ticketIdParam[0] : ticketIdParam;
  const { userInfo } = useSession();
  const { roles: assignedRoles } = useHasRole();
  const { toast } = useToast();
  const isAssignedAdmin = assignedRoles.includes('admin');
  const listRef = useRef<FlatList<SupportMessage> | null>(null);

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);

  const lastCreatedAtRef = useRef<string | undefined>(undefined);

  const loadThread = useCallback(async () => {
    if (!userInfo?.token || !ticketId) return;
    try {
      setLoading(true);
      const response = await supportApi.adminGetMessages(userInfo.token, ticketId);
      setTicket(response.data.ticket);
      const loaded = response.data.messages || [];
      setMessages(loaded);
      lastCreatedAtRef.current = loaded[loaded.length - 1]?.created_at || undefined;
      await supportApi.adminMarkRead(userInfo.token, ticketId);
    } catch (error: any) {
      toast({
        message: error?.response?.data?.error || t('Error loading conversation'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [userInfo?.token, ticketId, t, toast]);

  useEffect(() => {
    if (userInfo && !isAssignedAdmin) {
      router.replace('/');
    }
  }, [userInfo, isAssignedAdmin, router]);

  useEffect(() => {
    if (!userInfo?.token || !isAssignedAdmin || !ticketId) return;
    loadThread();
  }, [userInfo?.token, isAssignedAdmin, ticketId, loadThread]);

  useEffect(() => {
    if (!userInfo?.token || !isAssignedAdmin || !ticketId) return;
    const timer = setInterval(async () => {
      try {
        const response = await supportApi.adminGetMessages(
          userInfo.token,
          ticketId,
          lastCreatedAtRef.current,
        );
        const incoming = response.data.messages || [];
        if (incoming.length) {
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
              lastPersisted[lastPersisted.length - 1]?.created_at ||
              lastCreatedAtRef.current;
            return merged;
          });
          await supportApi.adminMarkRead(userInfo.token, ticketId);
        }
        if (response.data.ticket) setTicket(response.data.ticket);
      } catch {
        // polling is best-effort
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [userInfo?.token, isAssignedAdmin, ticketId]);

  useEffect(() => {
    if (messages.length) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || sending || !userInfo?.token || !ticketId) return;
    if (ticket?.status === 'closed') return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: SupportMessage = {
      _id: tempId,
      ticket_id: ticketId,
      author_id: userInfo.user_id || '',
      author_role: 'admin',
      body,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    setSending(true);
    try {
      const response = await supportApi.adminSendMessage(
        userInfo.token,
        ticketId,
        body,
      );
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

  const handleCloseTicket = async (skipCsat = false) => {
    if (!userInfo?.token || !ticketId || updating) return;
    setUpdating(true);
    try {
      const response = await supportApi.adminClose(userInfo.token, ticketId, {
        skip_csat: skipCsat,
      });
      setTicket(response.data.ticket);
    } catch (error: any) {
      toast({
        message: error?.response?.data?.error || t('Error updating ticket'),
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleReopen = async () => {
    if (!userInfo?.token || !ticketId || updating) return;
    setUpdating(true);
    try {
      const response = await supportApi.adminReopen(userInfo.token, ticketId);
      setTicket(response.data.ticket);
    } catch (error: any) {
      toast({
        message: error?.response?.data?.error || t('Error updating ticket'),
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  if (!isAssignedAdmin) {
    return (
      <View className="flex-1 items-center justify-center">
        <Loading />
      </View>
    );
  }

  const isClosed = ticket?.status === 'closed';

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ backgroundColor: colors.background }}
    >
      <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8">
        <View className="flex-row items-center mb-3">
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
          <Text className="flex-1 text-center font-bold text-primary text-lg">
            {ticket?.user_name || t('Support')}
          </Text>
          {isClosed ? (
            <TouchableOpacity onPress={handleReopen} disabled={updating}>
              <Text style={{ color: colors.primary[500], fontWeight: 'bold' }}>
                {t('Reopen')}
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => handleCloseTicket(false)}
                disabled={updating}
              >
                <Text style={{ color: colors.primary[500], fontWeight: 'bold' }}>
                  {t('Close ticket')}
                </Text>
              </TouchableOpacity>
              <DropDown>
                <DropDownTrigger>
                  <TouchableOpacity disabled={updating} className="ml-1 p-1">
                    <MaterialIcons
                      name="arrow-drop-down"
                      size={22}
                      color={colors.primary[500]}
                    />
                  </TouchableOpacity>
                </DropDownTrigger>
                <DropDownContent className="right-0 top-8 min-w-[16rem]">
                  <DropDownItem onPress={() => handleCloseTicket(true)}>
                    <Text className="text-sm text-gray-700">
                      {t('Close without rating (exceptional)')}
                    </Text>
                  </DropDownItem>
                </DropDownContent>
              </DropDown>
            </View>
          )}
        </View>

        {ticket ? (
          <View className="mb-3">
            <Text className="text-xs text-gray-500">{ticket.user_email}</Text>
            <Text className="text-xs text-gray-500">
              {t('Status')}: {statusLabel(ticket.status, t)}
            </Text>
            {ticket.handled_by_name ? (
              <Text className="text-xs text-gray-500">
                {t('Handled by')} {ticket.handled_by_name}
              </Text>
            ) : null}
            {ticket.csat_score !== null && ticket.csat_score !== undefined ? (
              <View className="flex-row items-center mt-1">
                <Text className="text-xs text-gray-500 mr-2">{t('Rating')}</Text>
                <StarRating value={ticket.csat_score} readonly size={16} allowZero />
              </View>
            ) : isClosed && ticket.csat_required ? (
              <Text className="text-xs text-gray-500 mt-1">
                {t('Waiting for rating')}
              </Text>
            ) : isClosed ? (
              <Text className="text-xs text-gray-500 mt-1">
                {t('No rating requested')}
              </Text>
            ) : null}
          </View>
        ) : null}

        {loading && messages.length === 0 ? (
          <Loading classname="flex-1 items-center justify-center" />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item._id}
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 12 }}
            renderItem={({ item }) => {
              if (item.author_role === 'system') {
                return (
                  <View className="mb-2 items-center">
                    <Text className="text-xs text-center text-gray-500 italic px-4">
                      {t(item.body)}
                    </Text>
                  </View>
                );
              }
              const mine = item.author_role === 'admin';
              return (
                <View
                  className={`mb-2 flex-row ${mine ? 'justify-end' : 'justify-start'}`}
                >
                  <View
                    className="max-w-[80%] p-3 rounded-lg"
                    style={{
                      backgroundColor: mine ? '#DCF8C6' : colors.white,
                    }}
                  >
                    <Text style={{ color: colors.text }}>{item.body}</Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        <View className="flex-row items-center bg-white rounded-lg p-2 mb-6">
          <TextInput
            className="flex-1 p-2"
            value={draft}
            onChangeText={setDraft}
            placeholder={
              isClosed
                ? t('Reopen the ticket to reply')
                : t('Type your message')
            }
            placeholderTextColor={colors.gray[400]}
            editable={!isClosed}
            multiline
            maxLength={4000}
          />
          <TouchableOpacity
            className="ml-2 p-3 rounded-full"
            style={{
              backgroundColor:
                sending || !draft.trim() || isClosed
                  ? colors.gray[400]
                  : colors.primary[500],
            }}
            disabled={sending || !draft.trim() || isClosed}
            onPress={handleSend}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
