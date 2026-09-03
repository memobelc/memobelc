import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { affiliateApi, type AffiliateProduct } from '@/services/affiliate';
import { copyText } from '@/services/checkout';

export default function AffiliateProductDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userInfo } = useSession();
  const { toast } = useToast();
  const [product, setProduct] = useState<AffiliateProduct | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    if (!userInfo?.token || !id) return;
    try {
      setLoading(true);
      const response = await affiliateApi.product(userInfo.token, String(id));
      setProduct(response.data);
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error loading affiliate data'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [userInfo?.token, id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const apply = async () => {
    if (!accepted) {
      toast({ message: t('You must accept the affiliate terms'), variant: 'destructive' });
      return;
    }
    try {
      setApplying(true);
      await affiliateApi.apply(userInfo?.token, String(id));
      toast({ message: t('Affiliation requested'), variant: 'success' });
      load();
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error requesting affiliation'),
        variant: 'destructive',
      });
    } finally {
      setApplying(false);
    }
  };

  const copy = async (value?: string | null) => {
    if (!value) return;
    const ok = await copyText(value);
    toast({ message: ok ? t('Copied') : t('Could not copy'), variant: ok ? 'success' : 'destructive' });
  };

  const status = product?.application?.status;
  const approved = status === 'approved';

  return (
    <ScrollView className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8" contentContainerStyle={{ paddingBottom: 80 }}>
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
        <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
      </TouchableOpacity>
      {loading || !product ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : (
        <>
          {product.image ? (
            <Image source={{ uri: product.image }} className="w-full h-48 rounded-2xl mb-4" />
          ) : null}
          <Text className="text-2xl font-bold mb-2">{product.name}</Text>
          <Text className="mb-4" style={{ color: colors.primary[700] }}>
            {t('Commission')}: {product.current_percent ?? 0}%
          </Text>
          {!!product.description && (
            <View className="bg-white rounded-xl p-4 mb-3">
              <Text className="font-bold mb-2">{t('Description')}</Text>
              <Text>{product.description}</Text>
            </View>
          )}
          {!!product.rules && (
            <View className="bg-white rounded-xl p-4 mb-3">
              <Text className="font-bold mb-2">{t('Rules')}</Text>
              <Text>{product.rules}</Text>
            </View>
          )}
          {!!product.terms && (
            <View className="bg-white rounded-xl p-4 mb-3">
              <Text className="font-bold mb-2">{t('Affiliate terms')}</Text>
              <Text>{product.terms}</Text>
            </View>
          )}
          {(product.commission_tiers || []).length > 0 && (
            <View className="bg-white rounded-xl p-4 mb-3">
              <Text className="font-bold mb-2">{t('Commission rules')}</Text>
              {(product.commission_tiers || []).map((tier, index) => (
                <Text key={index} className="text-sm mb-1">
                  {tier.min_sales}
                  {tier.max_sales != null ? `–${tier.max_sales}` : '+'} {t('sales')}: {tier.percent}%
                </Text>
              ))}
            </View>
          )}
          {approved ? (
            <View className="bg-white rounded-xl p-4">
              <Text className="font-bold mb-2">{t('Your affiliate links')}</Text>
              {product.referral_code ? (
                <TouchableOpacity onPress={() => copy(product.referral_code)} className="mb-2">
                  <Text className="text-gray-500 text-xs">{t('Referral code')}</Text>
                  <Text style={{ color: colors.primary[700] }}>{product.referral_code}</Text>
                </TouchableOpacity>
              ) : null}
              {product.share_url ? (
                <TouchableOpacity onPress={() => copy(product.share_url)} className="mb-2">
                  <Text className="text-gray-500 text-xs">{t('Share link')}</Text>
                  <Text style={{ color: colors.primary[700] }}>{product.share_url}</Text>
                </TouchableOpacity>
              ) : null}
              {product.coupon_code ? (
                <TouchableOpacity onPress={() => copy(product.coupon_code)}>
                  <Text className="text-gray-500 text-xs">{t('Coupon')}</Text>
                  <Text style={{ color: colors.primary[700] }}>{product.coupon_code}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : status === 'pending' ? (
            <Text style={{ color: colors.warning[700] }}>{t('Your request is under review')}</Text>
          ) : (
            <>
              <TouchableOpacity onPress={() => setAccepted((prev) => !prev)} className="flex-row items-center mb-3">
                <Ionicons
                  name={accepted ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={colors.primary[500]}
                />
                <Text className="ml-2 flex-1">{t('I agree with the affiliate terms of this product')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={apply}
                disabled={applying}
                className="py-3 rounded-lg items-center"
                style={{ backgroundColor: colors.primary[500] }}
              >
                {applying ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold">{t('Request affiliation')}</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}
