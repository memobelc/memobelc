import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { billingApi } from '@/services/billing';
import { useEntitlements } from '@/contexts/EntitlementContext';
import AsaasPaySheet from '@/components/molecules/AsaasPaySheet';

type SubscribeModalProps = {
  visible: boolean;
  onClose: () => void;
};

export default function SubscribeModal({ visible, onClose }: SubscribeModalProps) {
  const { t } = useTranslation();
  const { userInfo } = useSession();
  const { toast } = useToast();
  const { entitlements, refresh } = useEntitlements();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [changing, setChanging] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<{ productId: string; title: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const planRes = await billingApi.publicPlans();
      setPlans(planRes.data.plans || []);
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error loading plans'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const changePlan = async (planId: string) => {
    try {
      setChanging(planId);
      await billingApi.changePlan(userInfo?.token, planId);
      toast({ message: t('Plan updated'), variant: 'success' });
      await refresh();
      onClose();
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error changing plan'), variant: 'destructive' });
    } finally {
      setChanging(null);
    }
  };

  return (
    <>
      <Modal transparent animationType="fade" visible={visible && !checkoutPlan} onRequestClose={onClose}>
        <View className="flex-1 justify-center items-center bg-black/75 px-4">
          <View className="bg-white rounded-2xl w-full max-w-[520px] max-h-[85%] p-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xl font-bold" style={{ color: colors.primary[600] }}>
                {t('Become a subscriber')}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.gray[600]} />
              </TouchableOpacity>
            </View>
            {loading ? (
              <ActivityIndicator color={colors.primary[500]} />
            ) : (
              <ScrollView>
                {plans.map((plan) => {
                  const current = entitlements?.plan?._id === plan._id;
                  return (
                    <View key={plan._id} className="border border-gray-200 rounded-xl p-3 mb-3">
                      <Text className="font-semibold text-lg">{plan.name}</Text>
                      {!!plan.description && <Text>{plan.description}</Text>}
                      <Text className="mt-1">
                        R$ {plan.price} / {plan.cycle}
                      </Text>
                      {plan.trial_days > 0 && (
                        <Text>
                          {plan.trial_days} {t('trial days')}
                        </Text>
                      )}
                      {current ? (
                        <Text className="mt-2" style={{ color: colors.primary[600] }}>
                          {t('Current plan')}
                        </Text>
                      ) : entitlements?.is_subscriber && entitlements?.subscription?.provider === 'asaas' ? (
                        <TouchableOpacity
                          disabled={changing === plan._id}
                          onPress={() => changePlan(plan._id)}
                          className="mt-2 px-3 py-2 rounded-lg self-start"
                          style={{ backgroundColor: colors.primary[500] }}
                        >
                          <Text className="text-white">{t('Switch to this plan')}</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={() => setCheckoutPlan({ productId: plan._id, title: plan.name })}
                          className="mt-2 px-3 py-2 rounded-lg self-start"
                          style={{ backgroundColor: colors.primary[500] }}
                        >
                          <Text className="text-white">{t('Subscribe')}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      <AsaasPaySheet
        visible={!!checkoutPlan}
        onClose={() => setCheckoutPlan(null)}
        token={userInfo?.token}
        productType="plan"
        productId={checkoutPlan?.productId}
        title={checkoutPlan?.title}
        onSuccess={async () => {
          toast({ message: t('Payment confirmed'), variant: 'success' });
          await refresh();
          onClose();
        }}
      />
    </>
  );
}
