import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { billingApi } from '@/services/billing';
import { useEntitlements } from '@/contexts/EntitlementContext';
import AsaasPaySheet from '@/components/molecules/AsaasPaySheet';
import PlanCard from '@/components/molecules/PlanCard';

export default function PlansCatalogScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { toast } = useToast();
  const { entitlements, refresh } = useEntitlements();
  const [plans, setPlans] = useState<any[]>([]);
  const [bundles, setBundles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<{
    productType: 'plan' | 'bundle';
    productId: string;
    title: string;
  } | null>(null);

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

  const changePlan = async (planId: string) => {
    try {
      setChanging(planId);
      await billingApi.changePlan(userInfo?.token, planId);
      toast({ message: t('Plan updated'), variant: 'success' });
      await refresh();
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error changing plan'), variant: 'destructive' });
    } finally {
      setChanging(null);
    }
  };

  const canSwitch = entitlements?.is_subscriber && entitlements?.subscription?.provider === 'asaas';

  return (
    <ScrollView className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8" contentContainerStyle={{ paddingBottom: 80 }}>
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
        <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
      </TouchableOpacity>
      <Text className="text-2xl font-bold mb-4">{t('Plans')}</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : (
        <View className="flex-row flex-wrap" style={{ marginHorizontal: -8 }}>
          {plans.map((plan) => {
            const current = entitlements?.plan?._id === plan._id;
            return (
              <View key={plan._id} style={{ flexGrow: 1, flexBasis: 300, maxWidth: 420, padding: 8 }}>
                <PlanCard
                  plan={plan}
                  isCurrent={current}
                  actionDisabled={changing === plan._id}
                  actionLabel={canSwitch ? t('Switch to this plan') : t('Subscribe')}
                  onAction={() => {
                    if (canSwitch) changePlan(plan._id);
                    else setCheckout({ productType: 'plan', productId: plan._id, title: plan.name });
                  }}
                />
              </View>
            );
          })}
        </View>
      )}
      {bundles.length > 0 && <Text className="text-xl font-semibold mt-4 mb-2">{t('Book bundles')}</Text>}
      {bundles.map((bundle) => (
        <View key={bundle._id} className="bg-white rounded-xl p-4 mb-3">
          <Text className="font-semibold">{bundle.name}</Text>
          <Text>R$ {bundle.price}</Text>
          <TouchableOpacity
            onPress={() => setCheckout({ productType: 'bundle', productId: bundle._id, title: bundle.name })}
            className="mt-2 px-3 py-2 rounded-lg self-start"
            style={{ backgroundColor: colors.primary[500] }}
          >
            <Text className="text-white">{t('Buy')}</Text>
          </TouchableOpacity>
        </View>
      ))}
      <AsaasPaySheet
        visible={!!checkout}
        onClose={() => setCheckout(null)}
        token={userInfo?.token}
        productType={checkout?.productType}
        productId={checkout?.productId}
        title={checkout?.title}
        onSuccess={async () => {
          toast({ message: t('Payment confirmed'), variant: 'success' });
          await refresh();
        }}
      />
    </ScrollView>
  );
}
