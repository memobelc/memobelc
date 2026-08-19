import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { billingApi } from '@/services/billing';
import { startCheckout } from '@/services/checkout';
import { useEntitlements } from '@/contexts/EntitlementContext';

export default function PlansCatalogScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { toast } = useToast();
  const { entitlements, refresh } = useEntitlements();
  const [plans, setPlans] = useState<any[]>([]);
  const [bundles, setBundles] = useState<any[]>([]);
  const [coupon, setCoupon] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [planRes, bundleRes] = await Promise.all([
        billingApi.publicPlans(),
        billingApi.publicBundles(userInfo?.token),
      ]);
      setPlans(planRes.data.plans || []);
      setBundles(bundleRes.data.bundles || []);
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error loading plans'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [userInfo?.token, t]);

  useEffect(() => { load(); }, [load]);

  const buy = async (productType: 'plan' | 'bundle', productId: string) => {
    if (Platform.OS === 'ios') {
      toast({ message: t('Please subscribe on the website'), variant: 'destructive' });
      return;
    }
    if (!cpfCnpj.replace(/\D/g, '').match(/^(\d{11}|\d{14})$/)) {
      toast({ message: t('Enter a valid CPF or CNPJ'), variant: 'destructive' });
      return;
    }
    try {
      setBuying(productId);
      await startCheckout({
        token: userInfo?.token,
        productType,
        productId,
        couponCode: coupon || undefined,
        cpfCnpj,
      });
      toast({ message: t('Checkout started'), variant: 'success' });
      await refresh();
    } catch (error: any) {
      toast({ message: error.response?.data?.error || error.message || t('Error starting checkout'), variant: 'destructive' });
    } finally {
      setBuying(null);
    }
  };

  const changePlan = async (planId: string) => {
    try {
      setBuying(planId);
      await billingApi.changePlan(userInfo?.token, planId);
      toast({ message: t('Plan updated'), variant: 'success' });
      await refresh();
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error changing plan'), variant: 'destructive' });
    } finally {
      setBuying(null);
    }
  };

  return (
    <ScrollView className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8" contentContainerStyle={{ paddingBottom: 80 }}>
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
        <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
      </TouchableOpacity>
      <Text className="text-2xl font-bold mb-2">{t('Plans')}</Text>
      {Platform.OS === 'ios' && (
        <Text className="mb-3" style={{ color: colors.gray[600] }}>{t('Please subscribe on the website')}</Text>
      )}
      <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2 bg-white" placeholder={t('Coupon code')} value={coupon} onChangeText={setCoupon} />
      <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-4 bg-white" placeholder={t('CPF or CNPJ')} value={cpfCnpj} onChangeText={setCpfCnpj} keyboardType="numeric" />
      {loading ? <ActivityIndicator color={colors.primary[500]} /> : plans.map((plan) => {
        const current = entitlements?.plan?._id === plan._id;
        return (
          <View key={plan._id} className="bg-white rounded-xl p-4 mb-3">
            <Text className="font-semibold text-lg">{plan.name}</Text>
            <Text>{plan.description}</Text>
            <Text className="mt-1">R$ {plan.price} / {plan.cycle}</Text>
            {plan.trial_days > 0 && <Text>{plan.trial_days} {t('trial days')}</Text>}
            {current ? (
              <Text className="mt-2" style={{ color: colors.primary[600] }}>{t('Current plan')}</Text>
            ) : entitlements?.is_subscriber && entitlements?.subscription?.provider === 'asaas' ? (
              <TouchableOpacity disabled={buying === plan._id} onPress={() => changePlan(plan._id)} className="mt-2 px-3 py-2 rounded-lg self-start" style={{ backgroundColor: colors.primary[500] }}>
                <Text className="text-white">{t('Switch to this plan')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity disabled={buying === plan._id} onPress={() => buy('plan', plan._id)} className="mt-2 px-3 py-2 rounded-lg self-start" style={{ backgroundColor: colors.primary[500] }}>
                <Text className="text-white">{t('Subscribe')}</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
      {bundles.length > 0 && <Text className="text-xl font-semibold mt-4 mb-2">{t('Book bundles')}</Text>}
      {bundles.map((bundle) => (
        <View key={bundle._id} className="bg-white rounded-xl p-4 mb-3">
          <Text className="font-semibold">{bundle.name}</Text>
          <Text>R$ {bundle.price}</Text>
          <TouchableOpacity disabled={buying === bundle._id} onPress={() => buy('bundle', bundle._id)} className="mt-2 px-3 py-2 rounded-lg self-start" style={{ backgroundColor: colors.primary[500] }}>
            <Text className="text-white">{t('Buy')}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}
