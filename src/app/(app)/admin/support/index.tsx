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
import { StarRating } from '@/components/molecules/StarRating';
import {
  supportApi,
  type SupportCsatMetrics,
  type SupportTicket,
  type SupportTicketStatus,
} from '@/services/support';

const POLL_MS = 4000;

function statusLabel(status: string, t: (key: string) => string) {
  if (status === 'closed') return t('Closed');
  if (status === 'in_progress') return t('In progress');
  return t('Open');
}

function formatAverage(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return value.toFixed(2).replace(/\.00$/, '');
}

export default function AdminSupportScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { roles: assignedRoles } = useHasRole();
  const { toast } = useToast();
  const isAssignedAdmin = assignedRoles.includes('admin');

  const [tab, setTab] = useState<'conversations' | 'metrics'>('conversations');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [metrics, setMetrics] = useState<SupportCsatMetrics | null>(null);
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

  const loadMetrics = useCallback(
    async (silent = false) => {
      if (!userInfo?.token) return;
      try {
        if (!silent) setLoading(true);
        const response = await supportApi.adminMetrics(userInfo.token);
        setMetrics(response.data);
      } catch (error: any) {
        if (!silent) {
          toast({
            message: error?.response?.data?.error || t('Error loading metrics'),
            variant: 'destructive',
          });
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [userInfo?.token, t, toast],
  );

  useEffect(() => {
    if (userInfo && !isAssignedAdmin) {
      router.replace('/');
    }
  }, [userInfo, isAssignedAdmin, router]);

  useEffect(() => {
    if (!userInfo?.token || !isAssignedAdmin) return;
    if (tab === 'metrics') {
      loadMetrics();
      return;
    }
    const timeout = setTimeout(() => {
      loadTickets();
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, status, tab, userInfo?.token, isAssignedAdmin, loadTickets, loadMetrics]);

  useEffect(() => {
    if (!userInfo?.token || !isAssignedAdmin || tab !== 'conversations') return;
    const timer = setInterval(() => loadTickets(true), POLL_MS);
    return () => clearInterval(timer);
  }, [userInfo?.token, isAssignedAdmin, tab, loadTickets]);

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

  const distribution = metrics?.team.distribution || {};
  const maxDist = Math.max(
    1,
    ...[0, 1, 2, 3, 4, 5].map((score) => Number(distribution[String(score)] || 0)),
  );

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

      <View className="flex-row mb-4 border-b border-gray-300">
        <TouchableOpacity
          onPress={() => setTab('conversations')}
          className={`px-4 py-2 ${tab === 'conversations' ? 'border-b-2 border-primary-500' : ''}`}
        >
          <Text
            className={`font-bold ${tab === 'conversations' ? 'text-primary-500' : 'text-gray-500'}`}
          >
            {t('Conversations')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('metrics')}
          className={`px-4 py-2 ${tab === 'metrics' ? 'border-b-2 border-primary-500' : ''}`}
        >
          <Text
            className={`font-bold ${tab === 'metrics' ? 'text-primary-500' : 'text-gray-500'}`}
          >
            {t('Metrics')}
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'conversations' ? (
        <>
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
        </>
      ) : null}

      {loading ? (
        <Loading classname="flex-1 items-center justify-center" />
      ) : tab === 'metrics' ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="font-bold text-gray-700 mb-2">{t('Team')}</Text>
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1 bg-white rounded-xl p-4">
              <Text className="text-xs text-gray-500">{t('Average rating')}</Text>
              <Text className="text-2xl font-bold text-primary mt-1">
                {formatAverage(metrics?.team.average)}
              </Text>
            </View>
            <View className="flex-1 bg-white rounded-xl p-4">
              <Text className="text-xs text-gray-500">{t('Ratings')}</Text>
              <Text className="text-2xl font-bold text-primary mt-1">
                {metrics?.team.count ?? 0}
              </Text>
            </View>
            <View className="flex-1 bg-white rounded-xl p-4">
              <Text className="text-xs text-gray-500">{t('Pending ratings')}</Text>
              <Text className="text-2xl font-bold text-primary mt-1">
                {metrics?.team.pending ?? 0}
              </Text>
            </View>
          </View>

          <View className="bg-white rounded-xl p-4 mb-4">
            <Text className="font-bold text-gray-700 mb-3">{t('Score distribution')}</Text>
            {[5, 4, 3, 2, 1, 0].map((score) => {
              const count = Number(distribution[String(score)] || 0);
              return (
                <View key={score} className="flex-row items-center mb-2">
                  <Text className="w-4 text-xs text-gray-500">{score}</Text>
                  <View className="flex-1 h-2 mx-2 rounded-full bg-gray-100 overflow-hidden">
                    <View
                      className="h-2 rounded-full"
                      style={{
                        width: `${(count / maxDist) * 100}%`,
                        backgroundColor: colors.warning[500],
                      }}
                    />
                  </View>
                  <Text className="w-8 text-xs text-right text-gray-500">{count}</Text>
                </View>
              );
            })}
          </View>

          <Text className="font-bold text-gray-700 mb-2">{t('Agents')}</Text>
          {!metrics?.agents.length ? (
            <Text className="text-center text-gray-500 mb-4">{t('No ratings yet')}</Text>
          ) : (
            metrics.agents.map((agent) => (
              <View key={agent.admin_id || 'unknown'} className="bg-white rounded-xl p-4 mb-3">
                <Text className="font-bold text-primary">
                  {agent.admin_name || t('(sem nome)')}
                </Text>
                <Text className="text-xs text-gray-500 mb-2">
                  {agent.admin_email || ''}
                </Text>
                <View className="flex-row items-center justify-between">
                  <StarRating
                    value={agent.average === null ? null : Math.round(agent.average)}
                    readonly
                    allowZero
                    size={18}
                  />
                  <Text className="text-sm text-gray-700">
                    {formatAverage(agent.average)} · {agent.count} {t('Ratings').toLowerCase()}
                  </Text>
                </View>
              </View>
            ))
          )}

          <Text className="font-bold text-gray-700 mt-2 mb-2">{t('Recent ratings')}</Text>
          {!metrics?.recent.length ? (
            <Text className="text-center text-gray-500">{t('No ratings yet')}</Text>
          ) : (
            metrics.recent.map((item) => (
              <TouchableOpacity
                key={`${item.ticket_id}-${item.submitted_at}`}
                onPress={() =>
                  router.push({
                    pathname: '/admin/support/[ticketId]' as any,
                    params: { ticketId: item.ticket_id },
                  })
                }
                className="bg-white rounded-xl p-4 mb-3"
              >
                <View className="flex-row items-center">
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-800">
                      {item.user_name || t('(sem nome)')}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      {t('Handled by')} {item.admin_name || t('(sem nome)')}
                    </Text>
                  </View>
                  <StarRating value={item.score} readonly allowZero size={16} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
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
                    {ticket.handled_by_name ? (
                      <Text className="text-xs text-gray-500">
                        {t('Handled by')} {ticket.handled_by_name}
                      </Text>
                    ) : null}
                    <Text className="text-sm text-gray-700 mt-2" numberOfLines={2}>
                      {ticket.last_message_preview || t('No messages yet')}
                    </Text>
                    {ticket.csat_score !== null && ticket.csat_score !== undefined ? (
                      <View className="mt-1">
                        <StarRating value={ticket.csat_score} readonly size={14} allowZero />
                      </View>
                    ) : null}
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
