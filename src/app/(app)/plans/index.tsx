import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { billingApi } from '@/services/billing';
import { useEntitlements } from '@/contexts/EntitlementContext';
import AsaasPaySheet from '@/components/molecules/AsaasPaySheet';
import PlanCard, { formatPlanPrice } from '@/components/molecules/PlanCard';

type PressableVisualState = {
  pressed: boolean;
  hovered?: boolean;
};

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
      let nextPlans: any[] = [];
      let nextBundles: any[] = [];
      try {
        const planRes = await billingApi.publicPlans();
        nextPlans = planRes.data.plans || [];
      } catch (error: any) {
        toast({ message: error.response?.data?.error || t('Error loading plans'), variant: 'destructive' });
      }
      try {
        const bundleRes = await billingApi.publicBundles(userInfo?.token);
        nextBundles = (bundleRes.data.bundles || []).filter((item: any) => item.is_published);
      } catch {
        // Bundles are optional; the plans catalog still renders if this fails.
      }
      setPlans(nextPlans);
      setBundles(nextBundles);
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
    <ScrollView
      className="flex-1 w-full px-4 md:w-4/5 max-w-[1440px] mx-auto mt-8"
      contentContainerStyle={{ paddingBottom: 80 }}
    >
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={t('Back')}
        hitSlop={4}
        style={({ pressed, hovered }: PressableVisualState) => ({
          minHeight: 44,
          minWidth: 44,
          paddingRight: 12,
          marginBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          borderRadius: 8,
          backgroundColor: pressed || hovered ? colors.primary[50] : 'transparent',
          ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
        })}
      >
        <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
        <Text style={{ color: colors.primary[500], marginLeft: 6, fontWeight: '600' }}>
          {t('Back')}
        </Text>
      </Pressable>
      <Text className="text-2xl font-bold mb-5" style={{ color: colors.gray[900] }}>
        {t('Plans')}
      </Text>
      {loading ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : plans.length === 0 ? (
        <View className="items-center justify-center py-16 px-4">
          <Ionicons name="pricetag-outline" size={40} color={colors.gray[400]} />
          <Text
            className="mt-3 text-center"
            style={{ color: colors.gray[500], fontSize: 16, lineHeight: 24 }}
          >
            {t('No plans available')}
          </Text>
        </View>
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
                  ctaVariant={canSwitch ? 'switch' : 'subscribe'}
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
      {bundles.length > 0 && (
        <Text className="text-xl font-semibold mt-6 mb-3" style={{ color: colors.gray[900] }}>
          {t('Book bundles')}
        </Text>
      )}
      <View className="flex-row flex-wrap" style={{ marginHorizontal: -8 }}>
        {bundles.map((bundle) => (
          <View
            key={bundle._id}
            style={{ flexGrow: 1, flexBasis: 300, maxWidth: 420, padding: 8 }}
          >
            <View
              style={{
                backgroundColor: colors.white,
                borderRadius: 20,
                paddingHorizontal: 20,
                paddingVertical: 22,
                borderWidth: 1,
                borderColor: colors.primary[200],
                minHeight: 160,
              }}
            >
              <Text
                style={{
                  color: colors.gray[900],
                  fontSize: 18,
                  fontWeight: '700',
                  marginBottom: 8,
                }}
              >
                {bundle.name}
              </Text>
              {!!bundle.description && (
                <Text style={{ color: colors.gray[600], fontSize: 14, lineHeight: 20, marginBottom: 10 }}>
                  {bundle.description}
                </Text>
              )}
              <Text style={{ color: colors.gray[900], fontSize: 28, fontWeight: '800', marginBottom: 16 }}>
                {formatPlanPrice(Number(bundle.price))}
              </Text>
              <Pressable
                onPress={() =>
                  setCheckout({ productType: 'bundle', productId: bundle._id, title: bundle.name })
                }
                accessibilityRole="button"
                accessibilityLabel={t('Buy')}
                style={({ pressed, hovered }: PressableVisualState) => ({
                  minHeight: 44,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor:
                    pressed || hovered ? colors.primary[600] : colors.primary[500],
                  opacity: pressed ? 0.94 : 1,
                  ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
                })}
              >
                <Text style={{ color: colors.white, fontWeight: '800', fontSize: 15 }}>
                  {t('Buy')}
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
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
