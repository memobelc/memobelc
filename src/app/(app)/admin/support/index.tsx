import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { useToast } from '@/components/Toast';
import { Loading } from '@/components/Loading';
import { supportApi, type SupportTicket, type SupportTicketStatus } from '@/services/support';

const POLL_MS = 4000;

function statusLabel(status: string, t: (key: string) => string) {
  if (status === 'closed') return t('Closed');
  if (status === 'in_progress') return t('In progress');
  return t('Open');
}

export default function AdminSupportScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { roles: assignedRoles } = useHasRole();
  const { toast } = useToast();
  const isAssignedAdmin = assignedRoles.includes('admin');

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SupportTicketStatus | ''>('');

  const loadTickets = useCallback(
    async (silent = false) => {
      if (!userInfo?.token) return;
      try {
        if (!silent) setLoading(true);
        const response = await supportApi.adminListTickets(userInfo.token, {
          status,
          q: search.trim() || undefined,
        });
        setTickets(response.data.tickets || []);
      } catch (error: any) {
        if (!silent) {
          toast({
            message: error?.response?.data?.error || t('Error loading conversations'),
            variant: 'destructive',
          });
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [userInfo?.token, status, search, t, toast],
  );

  useEffect(() => {
    if (userInfo && !isAssignedAdmin) {
      router.replace('/');
    }
  }, [userInfo, isAssignedAdmin, router]);

  useEffect(() => {
    if (!userInfo?.token || !isAssignedAdmin) return;
    const timeout = setTimeout(() => {
      loadTickets();
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, status, userInfo?.token, isAssignedAdmin, loadTickets]);

  useEffect(() => {
    if (!userInfo?.token || !isAssignedAdmin) return;
    const timer = setInterval(() => loadTickets(true), POLL_MS);
    return () => clearInterval(timer);
  }, [userInfo?.token, isAssignedAdmin, loadTickets]);

  if (!isAssignedAdmin) {
    return (
      <View className="flex-1 items-center justify-center">
        <Loading />
      </View>
    );
  }

  const filters: { value: SupportTicketStatus | ''; label: string }[] = [
    { value: '', label: t('All') },
    { value: 'open', label: t('Open') },
    { value: 'in_progress', label: t('In progress') },
    { value: 'closed', label: t('Closed') },
  ];

  return (
    <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8">
      <View className="flex-row items-center mb-4">
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
          {t('Support')}
        </Text>
        <View style={{ width: 70 }} />
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={t('Search conversations...')}
        placeholderTextColor={colors.gray[400]}
        className="border border-gray-200 rounded-lg px-4 py-2.5 mb-3 bg-white"
      />

      <View className="flex-row flex-wrap gap-2 mb-4">
        {filters.map((item) => {
          const active = status === item.value;
          return (
            <TouchableOpacity
              key={item.value || 'all'}
              onPress={() => setStatus(item.value)}
              className="px-3 py-1.5 rounded-full"
              style={{
                backgroundColor: active ? colors.primary[500] : colors.white,
              }}
            >
              <Text
                style={{
                  color: active ? colors.white : colors.primary[600],
                  fontWeight: 'bold',
                  fontSize: 12,
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <Loading classname="flex-1 items-center justify-center" />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        >
          {tickets.length === 0 ? (
            <Text className="text-center text-gray-500 mt-8">
              {t('No conversations yet')}
            </Text>
          ) : (
            tickets.map((ticket) => (
              <TouchableOpacity
                key={ticket._id}
                onPress={() =>
                  router.push({
                    pathname: '/admin/support/[ticketId]' as any,
                    params: { ticketId: ticket._id },
                  })
                }
                className="bg-white rounded-xl p-4 mb-3"
                style={{
                  shadowColor: '#000',
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <View className="flex-row items-center">
                  <View className="flex-1">
                    <Text className="font-bold text-primary">
                      {ticket.user_name || t('(sem nome)')}
                    </Text>
                    <Text className="text-xs text-gray-500">{ticket.user_email}</Text>
                    <Text className="text-sm text-gray-700 mt-2" numberOfLines={2}>
                      {ticket.last_message_preview || t('No messages yet')}
                    </Text>
                  </View>
                  <View className="items-end ml-3">
                    <View
                      className="px-2 py-0.5 rounded-full mb-2"
                      style={{ backgroundColor: colors.primary[100] }}
                    >
                      <Text
                        className="text-xs"
                        style={{ color: colors.primary[700] }}
                      >
                        {statusLabel(ticket.status, t)}
                      </Text>
                    </View>
                    {ticket.unread_for_admin > 0 ? (
                      <View
                        className="min-w-[20px] h-5 px-1.5 rounded-full items-center justify-center"
                        style={{ backgroundColor: colors.error[500] }}
                      >
                        <Text className="text-white text-xs font-bold">
                          {ticket.unread_for_admin}
                        </Text>
                      </View>
                    ) : (
                      <MaterialIcons
                        name="chevron-right"
                        size={22}
                        color={colors.gray[400]}
                      />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
