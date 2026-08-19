import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { billingApi } from '@/services/billing';
import { startCheckout } from '@/services/checkout';
import { useEntitlements } from '@/contexts/EntitlementContext';

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
  const [coupon, setCoupon] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);

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

  const buy = async (planId: string) => {
    if (Platform.OS === 'ios') {
      toast({ message: t('Please subscribe on the website'), variant: 'destructive' });
      return;
    }
    if (!cpfCnpj.replace(/\D/g, '').match(/^(\d{11}|\d{14})$/)) {
      toast({ message: t('Enter a valid CPF or CNPJ'), variant: 'destructive' });
      return;
    }
    try {
      setBuying(planId);
      await startCheckout({
        token: userInfo?.token,
        productType: 'plan',
        productId: planId,
        couponCode: coupon || undefined,
        cpfCnpj,
      });
      toast({ message: t('Checkout started'), variant: 'success' });
      await refresh();
      onClose();
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || error.message || t('Error starting checkout'),
        variant: 'destructive',
      });
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
      onClose();
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error changing plan'), variant: 'destructive' });
    } finally {
      setBuying(null);
    }
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
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
          {Platform.OS === 'ios' && (
            <Text className="mb-3" style={{ color: colors.gray[600] }}>
              {t('Please subscribe on the website')}
            </Text>
          )}
          <TextInput
            className="border border-gray-200 rounded-lg px-3 py-2 mb-2 bg-white"
            placeholder={t('Coupon code')}
            value={coupon}
            onChangeText={setCoupon}
          />
          <TextInput
            className="border border-gray-200 rounded-lg px-3 py-2 mb-4 bg-white"
            placeholder={t('CPF or CNPJ')}
            value={cpfCnpj}
            onChangeText={setCpfCnpj}
            keyboardType="numeric"
          />
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
                        disabled={buying === plan._id}
                        onPress={() => changePlan(plan._id)}
                        className="mt-2 px-3 py-2 rounded-lg self-start"
                        style={{ backgroundColor: colors.primary[500] }}
                      >
                        <Text className="text-white">{t('Switch to this plan')}</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        disabled={buying === plan._id}
                        onPress={() => buy(plan._id)}
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
  );
}
