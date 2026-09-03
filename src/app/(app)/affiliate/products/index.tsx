import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { affiliateApi, type AffiliateProduct } from '@/services/affiliate';

export default function AffiliateProductsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { toast } = useToast();
  const [resellable, setResellable] = useState<AffiliateProduct[]>([]);
  const [available, setAvailable] = useState<AffiliateProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const response = await affiliateApi.products(userInfo.token);
      setResellable(response.data.resellable || []);
      setAvailable(response.data.available || []);
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

  const renderCard = (product: AffiliateProduct, badge?: string) => (
    <TouchableOpacity
      key={product._id}
      onPress={() =>
        router.push({ pathname: '/affiliate/products/[id]' as any, params: { id: product._id } })
      }
      className="bg-white rounded-xl p-4 mb-3 flex-row"
    >
      {product.image ? (
        <Image source={{ uri: product.image }} className="w-16 h-16 rounded-lg mr-3" />
      ) : (
        <View className="w-16 h-16 rounded-lg mr-3" style={{ backgroundColor: colors.primary[100] }} />
      )}
      <View className="flex-1">
        <Text className="font-bold" style={{ color: colors.primary[700] }}>
          {product.name}
        </Text>
        <Text className="text-xs text-gray-500 mt-1">
          {t('Commission')}: {product.current_percent ?? 0}%
        </Text>
        {badge ? (
          <Text className="text-xs mt-1" style={{ color: colors.warning[700] }}>
            {badge}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8" contentContainerStyle={{ paddingBottom: 80 }}>
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
        <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
      </TouchableOpacity>
      <Text className="text-2xl font-bold mb-4">{t('Affiliate products')}</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : (
        <>
          <Text className="font-bold mb-2">{t('Products you can resell')}</Text>
          {resellable.length === 0 ? (
            <Text className="text-gray-500 mb-6">{t('No resellable products yet')}</Text>
          ) : (
            resellable.map((item) => renderCard(item))
          )}
          <Text className="font-bold mb-2 mt-4">{t('Products you can apply for')}</Text>
          {available.length === 0 ? (
            <Text className="text-gray-500">{t('No products available for affiliation')}</Text>
          ) : (
            available.map((item) =>
              renderCard(
                item,
                item.application?.status === 'pending' ? t('Under review') : undefined,
              ),
            )
          )}
        </>
      )}
    </ScrollView>
  );
}
