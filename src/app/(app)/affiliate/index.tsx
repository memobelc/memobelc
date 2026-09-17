import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { useToast } from '@/components/Toast';
import { affiliateApi, formatMoney, type AffiliateProfile } from '@/services/affiliate';

export default function AffiliateHomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { hasRole } = useHasRole();
  const { toast } = useToast();
  const [profile, setProfile] = useState<AffiliateProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const response = await affiliateApi.me(userInfo.token);
      setProfile(response.data);
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error loading affiliate data'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [userInfo?.token, t]);

  useEffect(() => {
    if (userInfo && !hasRole('affiliate') && !hasRole('admin')) {
      router.replace('/');
    }
  }, [userInfo, hasRole, router]);

  useEffect(() => {
    load();
  }, [load]);

  const wallet = profile?.wallet;

  return (
    <ScrollView className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8" contentContainerStyle={{ paddingBottom: 80 }}>
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
        <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
      </TouchableOpacity>
      <Text className="text-2xl font-bold mb-4">{t('Affiliate')}</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : (
        <>
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="text-gray-500 text-xs mb-1">{t('Referral code')}</Text>
            <Text className="text-xl font-bold" style={{ color: colors.primary[700] }}>
              {profile?.referral_code}
            </Text>
          </View>
          <View className="flex-row flex-wrap -mx-1 mb-4">
            {[
              { label: t('Pending balance'), value: wallet?.pending },
              { label: t('Available balance'), value: wallet?.available },
              { label: t('Withdrawn'), value: wallet?.withdrawn },
            ].map((item) => (
              <View key={item.label} className="w-1/3 px-1 mb-2">
                <View className="bg-white rounded-xl p-3">
                  <Text className="text-xs text-gray-500">{item.label}</Text>
                  <Text className="font-bold mt-1">{formatMoney(item.value)}</Text>
                </View>
              </View>
            ))}
          </View>
          {[
            { label: t('Products'), path: '/affiliate/products', icon: 'storefront' as const },
            { label: t('Sales'), path: '/affiliate/sales', icon: 'receipt-long' as const },
            { label: t('Wallet'), path: '/affiliate/wallet', icon: 'account-balance-wallet' as const },
          ].map((item) => (
            <TouchableOpacity
              key={item.path}
              onPress={() => router.push(item.path as any)}
              className="bg-white rounded-xl p-4 mb-3 flex-row items-center"
            >
              <MaterialIcons name={item.icon} size={22} color={colors.primary[500]} />
              <Text className="ml-3 flex-1 font-bold" style={{ color: colors.primary[700] }}>
                {item.label}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.gray[400]} />
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}
