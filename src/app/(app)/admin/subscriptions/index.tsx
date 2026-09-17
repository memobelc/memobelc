import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { useToast } from '@/components/Toast';
import { billingApi } from '@/services/billing';

export default function AdminSubscriptionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { roles } = useHasRole();
  const { toast } = useToast();
  const isAdmin = roles.includes('admin');
  const [tab, setTab] = useState<'subscriptions' | 'payments'>('subscriptions');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [grant, setGrant] = useState({ user_id: '', type: 'plan', resource_id: '', notes: '' });

  const load = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (status) params.status = status;
      if (search) params.user_id = search;
      const res = tab === 'subscriptions'
        ? await billingApi.subscriptions(userInfo.token, params)
        : await billingApi.paymentsAdmin(userInfo.token, params);
      setItems(res.data.subscriptions || res.data.payments || []);
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error loading data'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [userInfo?.token, tab, status, search, t]);

  useEffect(() => {
    if (userInfo && !isAdmin) router.replace('/');
  }, [userInfo, isAdmin, router]);
  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const act = async (id: string, action: string) => {
    try {
      await billingApi.subscriptionAction(userInfo?.token, id, { action });
      toast({ message: t('Subscription updated'), variant: 'success' });
      load();
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error updating subscription'), variant: 'destructive' });
    }
  };

  const doGrant = async () => {
    try {
      await billingApi.grant(userInfo?.token, grant);
      toast({ message: t('Access granted'), variant: 'success' });
      setGrant({ user_id: '', type: 'plan', resource_id: '', notes: '' });
      load();
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error granting access'), variant: 'destructive' });
    }
  };

  if (!isAdmin) return null;

  return (
    <ScrollView className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8" contentContainerStyle={{ paddingBottom: 80 }}>
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
        <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
      </TouchableOpacity>
      <Text className="text-2xl font-bold mb-4">{t('Purchases and subscriptions')}</Text>
      <View className="flex-row mb-3">
        {(['subscriptions', 'payments'] as const).map((item) => (
          <TouchableOpacity key={item} onPress={() => setTab(item)} className="px-3 py-2 rounded-lg mr-2" style={{ backgroundColor: tab === item ? colors.primary[500] : colors.gray[200] }}>
            <Text style={{ color: tab === item ? '#fff' : colors.gray[800] }}>{t(item === 'subscriptions' ? 'Subscriptions' : 'Purchases')}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2 bg-white" placeholder={t('Filter by user id or status')} value={search} onChangeText={setSearch} />
      <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-3 bg-white" placeholder={t('Status')} value={status} onChangeText={setStatus} />
      {loading ? <ActivityIndicator color={colors.primary[500]} /> : items.map((item) => (
        <View key={item._id} className="bg-white rounded-xl p-4 mb-3">
          <Text className="font-semibold">{item.provider} · {item.status}</Text>
          <Text style={{ color: colors.gray[500] }}>{t('User')}: {item.user_id}</Text>
          <Text style={{ color: colors.gray[500] }}>{item.plan_id || item.product_id} · R$ {item.value ?? item.amount}</Text>
          {tab === 'subscriptions' && (
            <View className="flex-row mt-2">
              <TouchableOpacity onPress={() => act(item._id, 'cancel')} className="mr-2"><Text style={{ color: colors.danger?.[500] || '#b91c1c' }}>{t('Cancel')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => act(item._id, 'suspend')} className="mr-2"><Text>{t('Suspend')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => act(item._id, 'reactivate')}><Text style={{ color: colors.primary[500] }}>{t('Reactivate')}</Text></TouchableOpacity>
            </View>
          )}
        </View>
      ))}
      <View className="bg-white rounded-xl p-4 mt-4">
        <Text className="font-semibold mb-2">{t('Grant access manually')}</Text>
        <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder="user_id" value={grant.user_id} onChangeText={(user_id) => setGrant((prev) => ({ ...prev, user_id }))} />
        <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder={t('Type (plan, book, bundle, service)')} value={grant.type} onChangeText={(type) => setGrant((prev) => ({ ...prev, type }))} />
        <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder="resource_id" value={grant.resource_id} onChangeText={(resource_id) => setGrant((prev) => ({ ...prev, resource_id }))} />
        <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder={t('Notes')} value={grant.notes} onChangeText={(notes) => setGrant((prev) => ({ ...prev, notes }))} />
        <TouchableOpacity onPress={doGrant} className="px-4 py-2 rounded-lg self-start" style={{ backgroundColor: colors.primary[500] }}>
          <Text className="text-white">{t('Grant')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
