import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { useToast } from '@/components/Toast';
import {
  adminAffiliateApi,
  formatMoney,
  type AffiliateCommission,
  type AffiliateProduct,
  type AffiliateProfile,
} from '@/services/affiliate';

export default function AdminAffiliateCommissionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { roles } = useHasRole();
  const { toast } = useToast();
  const isAdmin = roles.includes('admin');
  const [items, setItems] = useState<AffiliateCommission[]>([]);
  const [affiliates, setAffiliates] = useState<AffiliateProfile[]>([]);
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saleForm, setSaleForm] = useState({ affiliate_id: '', product_id: '', amount: '' });

  const load = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const [commissionsRes, affiliatesRes, productsRes] = await Promise.all([
        adminAffiliateApi.commissions(userInfo.token, 'pending'),
        adminAffiliateApi.list(userInfo.token),
        adminAffiliateApi.products(userInfo.token),
      ]);
      setItems(commissionsRes.data.commissions || []);
      setAffiliates(affiliatesRes.data.affiliates || []);
      setProducts(productsRes.data.products || []);
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
    if (userInfo && !isAdmin) router.replace('/');
  }, [userInfo, isAdmin, router]);
  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const review = async (id: string, status: string) => {
    await adminAffiliateApi.reviewCommission(userInfo?.token, id, status);
    load();
  };

  const registerSale = async () => {
    try {
      await adminAffiliateApi.registerSale(userInfo?.token, {
        affiliate_id: saleForm.affiliate_id,
        product_id: saleForm.product_id,
        amount: Number(saleForm.amount.replace(',', '.')),
      });
      toast({ message: t('Sale registered'), variant: 'success' });
      setSaleForm({ affiliate_id: '', product_id: '', amount: '' });
      load();
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error saving product'),
        variant: 'destructive',
      });
    }
  };

  return (
    <ScrollView className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8" contentContainerStyle={{ paddingBottom: 80 }}>
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
        <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
      </TouchableOpacity>
      <Text className="text-2xl font-bold mb-4">{t('Commissions')}</Text>
      <View className="bg-white rounded-xl p-4 mb-4">
        <Text className="font-bold mb-2">{t('Register external affiliate sale')}</Text>
        <Text className="text-xs text-gray-500 mb-1">{t('Affiliate')}</Text>
        <ScrollView horizontal className="mb-3" showsHorizontalScrollIndicator={false}>
          {affiliates.map((item) => {
            const selected = saleForm.affiliate_id === item._id;
            return (
              <TouchableOpacity
                key={item._id}
                onPress={() => setSaleForm((prev) => ({ ...prev, affiliate_id: item._id }))}
                className="mr-2 px-3 py-2 rounded-lg"
                style={{ backgroundColor: selected ? colors.primary[500] : colors.gray[200] }}
              >
                <Text className={selected ? 'text-white' : 'text-gray-700'}>
                  {item.user_name || item.user_email}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <Text className="text-xs text-gray-500 mb-1">{t('Products')}</Text>
        <ScrollView horizontal className="mb-3" showsHorizontalScrollIndicator={false}>
          {products.map((item) => {
            const selected = saleForm.product_id === item._id;
            return (
              <TouchableOpacity
                key={item._id}
                onPress={() => setSaleForm((prev) => ({ ...prev, product_id: item._id }))}
                className="mr-2 px-3 py-2 rounded-lg"
                style={{ backgroundColor: selected ? colors.primary[500] : colors.gray[200] }}
              >
                <Text className={selected ? 'text-white' : 'text-gray-700'}>{item.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TextInput
          value={saleForm.amount}
          onChangeText={(amount) => setSaleForm((p) => ({ ...p, amount }))}
          placeholder={t('Sale amount')}
          className="border border-gray-200 rounded-lg px-3 py-2 mb-2"
        />
        <TouchableOpacity onPress={registerSale} className="py-2.5 rounded-lg items-center" style={{ backgroundColor: colors.primary[500] }}>
          <Text className="text-white font-bold">{t('Save')}</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : items.length === 0 ? (
        <Text className="text-gray-500">{t('No commissions')}</Text>
      ) : (
        items.map((item) => (
          <View key={item._id} className="bg-white rounded-xl p-4 mb-3">
            <Text className="font-bold">{item.user_name || item.user_email}</Text>
            <Text className="text-sm">{item.product_name}</Text>
            <Text className="text-sm mt-1">
              {formatMoney(item.sale_amount)} · {item.percent}% = {formatMoney(item.amount)}
            </Text>
            <View className="flex-row mt-3">
              <TouchableOpacity onPress={() => review(item._id, 'available')} className="mr-2 px-3 py-2 rounded-lg" style={{ backgroundColor: colors.primary[500] }}>
                <Text className="text-white">{t('Approve')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => review(item._id, 'cancelled')} className="px-3 py-2 rounded-lg" style={{ backgroundColor: colors.gray[200] }}>
                <Text>{t('Cancel commission')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
