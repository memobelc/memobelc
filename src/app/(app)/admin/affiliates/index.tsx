import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import api from '@/services/api';
import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { useToast } from '@/components/Toast';
import { adminAffiliateApi, formatMoney, type AffiliateProfile } from '@/services/affiliate';
import { formatCpfCnpj } from '@/services/checkout';

type AdminUser = {
  _id: string;
  name?: string;
  email?: string;
  cpf_cnpj?: string | null;
  roles: string[];
};

export default function AdminAffiliatesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { roles } = useHasRole();
  const { toast } = useToast();
  const isAdmin = roles.includes('admin');
  const [affiliates, setAffiliates] = useState<AffiliateProfile[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadAffiliates = useCallback(async () => {
    if (!userInfo?.token) return;
    const response = await adminAffiliateApi.list(userInfo.token);
    setAffiliates(response.data.affiliates || []);
  }, [userInfo?.token]);

  const loadUsers = useCallback(
    async (query?: string) => {
      if (!userInfo?.token) return;
      const response = await api.get('/admin/users', {
        headers: { Authorization: `Bearer ${userInfo.token}` },
        params: query ? { search: query } : undefined,
      });
      setUsers(response.data.users || []);
    },
    [userInfo?.token],
  );

  const load = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      await Promise.all([loadAffiliates(), loadUsers(search.trim())]);
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error loading affiliate data'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [userInfo?.token, search, loadAffiliates, loadUsers, t]);

  useEffect(() => {
    if (userInfo && !isAdmin) router.replace('/');
  }, [userInfo, isAdmin, router]);

  useEffect(() => {
    if (!userInfo?.token || !isAdmin) return;
    const timeout = setTimeout(() => {
      load();
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, userInfo?.token, isAdmin, load]);

  const affiliatesByUser = useMemo(() => {
    const map: Record<string, AffiliateProfile> = {};
    affiliates.forEach((item) => {
      map[item.user_id] = item;
    });
    return map;
  }, [affiliates]);

  const promote = async (user: AdminUser) => {
    try {
      setSavingId(user._id);
      await adminAffiliateApi.add(userInfo?.token, user._id);
      toast({ message: t('Affiliate added'), variant: 'success' });
      await loadAffiliates();
      await loadUsers(search.trim());
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error adding affiliate'),
        variant: 'destructive',
      });
    } finally {
      setSavingId(null);
    }
  };

  const toggleStatus = async (affiliate: AffiliateProfile) => {
    try {
      setSavingId(affiliate.user_id);
      await adminAffiliateApi.update(userInfo?.token, affiliate._id, {
        status: affiliate.status === 'active' ? 'suspended' : 'active',
      });
      await loadAffiliates();
      await loadUsers(search.trim());
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error adding affiliate'),
        variant: 'destructive',
      });
    } finally {
      setSavingId(null);
    }
  };

  const links = [
    { label: t('Affiliate products'), path: '/admin/affiliates/products' },
    { label: t('Applications'), path: '/admin/affiliates/applications' },
    { label: t('Commissions'), path: '/admin/affiliates/commissions' },
    { label: t('Withdrawals'), path: '/admin/affiliates/withdrawals' },
    { label: t('Withdrawal settings'), path: '/admin/affiliates/settings' },
  ];

  return (
    <ScrollView className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8" contentContainerStyle={{ paddingBottom: 80 }}>
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
        <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
      </TouchableOpacity>
      <Text className="text-2xl font-bold mb-4">{t('Affiliates')}</Text>
      <View className="flex-row flex-wrap mb-4">
        {links.map((item) => (
          <TouchableOpacity
            key={item.path}
            onPress={() => router.push(item.path as any)}
            className="mr-2 mb-2 px-3 py-2 rounded-lg"
            style={{ backgroundColor: colors.primary[100] }}
          >
            <Text style={{ color: colors.primary[700] }}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text className="font-bold mb-2">{t('Add affiliate')}</Text>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={t('Search by name, email or CPF')}
        placeholderTextColor={colors.gray[400]}
        className="border border-gray-200 rounded-lg px-4 py-2.5 mb-4 bg-white"
      />

      {loading ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : users.length === 0 ? (
        <Text className="text-gray-500">{t('No users found')}</Text>
      ) : (
        users.map((user) => {
          const affiliate = affiliatesByUser[user._id];
          const isAffiliate = Boolean(affiliate) || (user.roles || []).includes('affiliate');
          const cpf = user.cpf_cnpj ? formatCpfCnpj(String(user.cpf_cnpj)) : null;
          return (
            <View key={user._id} className="bg-white rounded-xl p-4 mb-3">
              <Text className="font-bold" style={{ color: colors.primary[700] }}>
                {user.name || t('(sem nome)')}
              </Text>
              <Text className="text-xs text-gray-500">{user.email}</Text>
              {cpf ? <Text className="text-xs text-gray-500 mt-1">{t('CPF')}: {cpf}</Text> : null}
              {affiliate ? (
                <>
                  <Text className="text-xs mt-1">{t('Referral code')}: {affiliate.referral_code}</Text>
                  <Text className="text-xs mt-1">
                    {t('Pending balance')}: {formatMoney(affiliate.wallet?.pending)} · {t('Available balance')}: {formatMoney(affiliate.wallet?.available)}
                  </Text>
                </>
              ) : null}
              <View className="flex-row mt-3">
                {isAffiliate && affiliate ? (
                  <TouchableOpacity
                    onPress={() => toggleStatus(affiliate)}
                    disabled={savingId === user._id}
                    className="px-3 py-2 rounded-lg"
                    style={{ backgroundColor: colors.primary[100] }}
                  >
                    {savingId === user._id ? (
                      <ActivityIndicator color={colors.primary[500]} />
                    ) : (
                      <Text style={{ color: colors.primary[700] }}>
                        {affiliate.status === 'active' ? t('Suspended') : t('Active')}
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => promote(user)}
                    disabled={savingId === user._id}
                    className="px-3 py-2 rounded-lg"
                    style={{ backgroundColor: colors.primary[500] }}
                  >
                    {savingId === user._id ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-white font-bold">{t('Promote')}</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
