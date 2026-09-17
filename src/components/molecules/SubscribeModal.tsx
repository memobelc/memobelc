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
import PlanCard from '@/components/molecules/PlanCard';

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

  const canSwitch = entitlements?.is_subscriber && entitlements?.subscription?.provider === 'asaas';

  return (
    <>
      <Modal transparent animationType="fade" visible={visible && !checkoutPlan} onRequestClose={onClose}>
        <View className="flex-1 justify-center items-center bg-black/75 px-4">
          <View className="rounded-2xl w-full max-w-[560px] max-h-[85%] p-5" style={{ backgroundColor: '#0B1C2E' }}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xl font-bold text-white">
                {t('Become a subscriber')}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#E2E8F0" />
              </TouchableOpacity>
            </View>
            {loading ? (
              <ActivityIndicator color={colors.primary[500]} />
            ) : (
              <ScrollView>
                {plans.map((plan) => {
                  const current = entitlements?.plan?._id === plan._id;
                  return (
                    <View key={plan._id} className="mb-3">
                      <PlanCard
                        compact
                        plan={plan}
                        isCurrent={current}
                        actionDisabled={changing === plan._id}
                        actionLabel={canSwitch ? t('Switch to this plan') : t('Subscribe')}
                        onAction={() => {
                          if (canSwitch) changePlan(plan._id);
                          else setCheckoutPlan({ productId: plan._id, title: plan.name });
                        }}
                      />
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
