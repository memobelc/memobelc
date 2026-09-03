import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { affiliateApi, formatMoney, type AffiliateCommission } from '@/services/affiliate';

export default function AffiliateSalesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { toast } = useToast();
  const [sales, setSales] = useState<AffiliateCommission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const response = await affiliateApi.sales(userInfo.token);
      setSales(response.data.sales || []);
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
    load();
  }, [load]);

  const statusLabel = (status: string) => {
    if (status === 'pending') return t('Pending review');
    if (status === 'available') return t('Available');
    return t('Cancelled');
  };

  return (
    <ScrollView className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8" contentContainerStyle={{ paddingBottom: 80 }}>
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
        <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
      </TouchableOpacity>
      <Text className="text-2xl font-bold mb-4">{t('Sales')}</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : sales.length === 0 ? (
        <Text className="text-gray-500">{t('No sales yet')}</Text>
      ) : (
        sales.map((sale) => (
          <View key={sale._id} className="bg-white rounded-xl p-4 mb-3">
            <Text className="font-bold">{sale.product_name || t('Product')}</Text>
            <Text className="text-sm text-gray-600 mt-1">
              {t('Sale')}: {formatMoney(sale.sale_amount)} · {sale.percent}% = {formatMoney(sale.amount)}
            </Text>
            <Text className="text-xs mt-1" style={{ color: colors.warning[700] }}>
              {statusLabel(sale.status)}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
