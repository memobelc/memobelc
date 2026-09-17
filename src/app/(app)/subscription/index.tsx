import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { billingApi } from '@/services/billing';
import { useEntitlements } from '@/contexts/EntitlementContext';
import { openPlaySubscriptions } from '@/services/playBilling';
import AsaasPaySheet from '@/components/molecules/AsaasPaySheet';

const STATUS_COPY: Record<string, string> = {
  active: 'Subscription active',
  trialing: 'Subscription active',
  pending_payment: 'Payment pending',
  payment_refused: 'Payment refused',
  canceled: 'Subscription canceled',
  expired: 'Subscription expired',
  manual_access: 'Access granted manually',
};

export default function SubscriptionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { toast } = useToast();
  const { entitlements, refresh } = useEntitlements();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCardUpdate, setShowCardUpdate] = useState(false);

  const load = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const res = await billingApi.payments(userInfo.token);
      setPayments(res.data.payments || []);
      await refresh();
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error loading subscription'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [userInfo?.token, refresh, t]);

  useEffect(() => { load(); }, [load]);

  const sub = entitlements?.subscription;
  const plan = entitlements?.plan;
  const statusKey = entitlements?.status_code || entitlements?.status || '';

  const cancel = async () => {
    Alert.alert(
      t('Cancel subscription'),
      t('Are you sure you want to cancel your subscription?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await billingApi.cancel(userInfo?.token);
              toast({ message: t('Subscription canceled'), variant: 'success' });
              load();
            } catch (error: any) {
              toast({ message: error.response?.data?.error || t('Error canceling subscription'), variant: 'destructive' });
            }
          },
        },
      ],
    );
  };

  const updatePayment = async () => {
    if (sub?.provider === 'google_play') {
      try {
        if (Platform.OS === 'android') {
          await openPlaySubscriptions();
        } else if (typeof window !== 'undefined') {
          window.open('https://play.google.com/store/account/subscriptions', '_blank');
        }
      } catch (error: any) {
        toast({ message: error.message || t('Error updating payment'), variant: 'destructive' });
      }
      return;
    }
    setShowCardUpdate(true);
  };

  return (
    <ScrollView className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8" contentContainerStyle={{ paddingBottom: 80 }}>
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
        <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
      </TouchableOpacity>
      <Text className="text-2xl font-bold mb-4">{t('My subscription')}</Text>
      {loading ? <ActivityIndicator color={colors.primary[500]} /> : (
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="font-semibold text-lg">{plan?.name || t('No plan')}</Text>
          <Text className="mt-1" style={{ color: colors.primary[600] }}>{t(STATUS_COPY[statusKey] || 'No plan')}</Text>
          {sub && (
            <>
              <Text className="mt-2">{t('Start date')}: {sub.started_at}</Text>
              <Text>{t('Next billing')}: {sub.next_due_date}</Text>
              <Text>{t('Amount')}: R$ {sub.value} · {sub.billing_cycle}</Text>
              <Text>{t('Payment method')}: {sub.payment_method || sub.provider}</Text>
              <Text>{t('Renewal date')}: {sub.current_period_end}</Text>
              {sub.canceled_at && <Text>{t('Cancellation date')}: {sub.canceled_at}</Text>}
            </>
          )}
          {plan?.description ? <Text className="mt-2">{plan.description}</Text> : null}
          <View className="flex-row flex-wrap mt-3">
            <TouchableOpacity onPress={() => router.push('/plans')} className="px-3 py-2 rounded-lg mr-2 mb-2" style={{ backgroundColor: colors.primary[500] }}>
              <Text className="text-white">{t('Upgrade or change plan')}</Text>
            </TouchableOpacity>
            {sub?.status && ['active', 'trialing', 'pending', 'overdue'].includes(sub.status) && (
              <>
                <TouchableOpacity onPress={updatePayment} className="px-3 py-2 rounded-lg mr-2 mb-2" style={{ backgroundColor: colors.gray[200] }}>
                  <Text>{t('Update payment')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={cancel} className="px-3 py-2 rounded-lg mb-2">
                  <Text style={{ color: '#b91c1c' }}>{t('Cancel subscription')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
      <Text className="text-lg font-semibold mb-2">{t('Payment history')}</Text>
      {payments.map((payment) => (
        <View key={payment._id} className="bg-white rounded-xl p-3 mb-2">
          <Text>{payment.product_type} · {payment.status} · R$ {payment.amount}</Text>
          <Text style={{ color: colors.gray[500] }}>{payment.paid_at || payment.created_at}</Text>
        </View>
      ))}
      <AsaasPaySheet
        visible={showCardUpdate}
        onClose={() => setShowCardUpdate(false)}
        token={userInfo?.token}
        mode="update-card"
        title={t('Update payment')}
        onSuccess={async () => {
          await load();
        }}
      />
    </ScrollView>
  );
}
