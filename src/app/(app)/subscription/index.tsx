import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Platform, Alert } from 'react-native';
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
import { formatPlanPrice } from '@/components/molecules/PlanCard';
import { formatDisplayDate } from '@/utils/formatFriendlyDate';

const STATUS_COPY: Record<string, string> = {
  active: 'Subscription active',
  trialing: 'Subscription active',
  pending_payment: 'Payment pending',
  payment_refused: 'Payment refused',
  canceled: 'Subscription canceled',
  expired: 'Subscription expired',
  manual_access: 'Access granted manually',
};

type PressableVisualState = {
  pressed: boolean;
  hovered?: boolean;
};

function statusTone(key: string) {
  if (key === 'active' || key === 'trialing') {
    return { bg: colors.success[100], fg: colors.success[700] };
  }
  if (key === 'pending_payment') {
    return { bg: colors.warning[100], fg: colors.gray[800] };
  }
  if (key === 'payment_refused') {
    return { bg: colors.error[100], fg: colors.error[700] };
  }
  if (key === 'canceled' || key === 'expired') {
    return { bg: colors.gray[200], fg: colors.gray[700] };
  }
  if (key === 'manual_access') {
    return { bg: colors.primary[50], fg: colors.primary[600] };
  }
  return { bg: colors.gray[200], fg: colors.gray[700] };
}

function paymentStatusTone(status: string) {
  const key = (status || '').toLowerCase();
  if (['confirmed', 'paid', 'received'].includes(key)) {
    return { bg: colors.success[100], fg: colors.success[700] };
  }
  if (['pending', 'overdue'].includes(key)) {
    return { bg: colors.warning[100], fg: colors.gray[800] };
  }
  if (['refused', 'failed', 'canceled', 'cancelled', 'refunded'].includes(key)) {
    return { bg: colors.error[100], fg: colors.error[700] };
  }
  return { bg: colors.gray[200], fg: colors.gray[700] };
}

export default function SubscriptionScreen() {
  const { t, i18n } = useTranslation();
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
  const tone = statusTone(statusKey);
  const hasPlan = !!plan?.name;
  const canManage =
    !!sub?.status && ['active', 'trialing', 'pending', 'overdue'].includes(sub.status);

  const formatDate = (value?: string | null) =>
    formatDisplayDate(value, t, { locale: i18n.language });

  const cycleLabel = (value?: string) => {
    const map: Record<string, string> = {
      MONTHLY: t('Monthly'),
      YEARLY: t('Yearly'),
      QUARTERLY: t('Quarterly'),
      SEMIANNUALLY: t('Semiannually'),
      WEEKLY: t('Weekly'),
    };
    return map[(value || '').toUpperCase()] || value || '—';
  };

  const paymentMethodLabel = (value?: string) => {
    const key = (value || '').toUpperCase().replace(/[\s-]/g, '_');
    if (key === 'PIX') return t('PIX');
    if (key === 'CREDIT_CARD' || key === 'CREDITCARD') return t('Credit card');
    if (key === 'BOLETO') return t('Boleto');
    if (key.includes('GOOGLE')) return t('Google Play');
    return value || '—';
  };

  const productLabel = (value?: string) => {
    const key = (value || '').toLowerCase();
    if (key === 'plan') return t('Plan');
    if (key === 'bundle') return t('Bundle');
    if (key === 'book') return t('Book');
    return value || t('Plan');
  };

  const paymentStatusLabel = (status?: string) => {
    const key = (status || '').toLowerCase();
    if (['confirmed', 'paid', 'received'].includes(key)) return t('Paid');
    if (key === 'pending' || key === 'overdue') return t('Pending');
    if (key === 'refused' || key === 'failed') return t('Payment refused');
    if (key === 'refunded') return t('Refunded');
    if (key === 'canceled' || key === 'cancelled') return t('Canceled');
    return status || '—';
  };

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
        {t('My subscription')}
      </Text>
      {loading ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : (
        <View
          style={{
            backgroundColor: colors.white,
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: colors.gray[200],
          }}
        >
          <View className="flex-row flex-wrap items-start justify-between" style={{ gap: 8 }}>
            <Text
              className="font-semibold text-lg flex-1"
              style={{ color: colors.gray[900], marginRight: 8 }}
            >
              {plan?.name || t('No plan')}
            </Text>
            <View
              style={{
                backgroundColor: tone.bg,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text style={{ color: tone.fg, fontWeight: '700', fontSize: 12 }}>
                {t(STATUS_COPY[statusKey] || 'No plan')}
              </Text>
            </View>
          </View>

          {plan?.description ? (
            <Text style={{ color: colors.gray[600], marginTop: 8, lineHeight: 20 }}>
              {plan.description}
            </Text>
          ) : null}

          {!hasPlan && !sub ? (
            <Text style={{ color: colors.gray[500], marginTop: 12, lineHeight: 20 }}>
              {t('Choose a plan to get started')}
            </Text>
          ) : null}

          {sub ? (
            <View style={{ marginTop: 16, gap: 10 }}>
              <InfoRow label={t('Start date')} value={formatDate(sub.started_at)} />
              <InfoRow label={t('Next billing')} value={formatDate(sub.next_due_date)} />
              <InfoRow
                label={t('Amount')}
                value={`${formatPlanPrice(Number(sub.value) || 0)} · ${cycleLabel(sub.billing_cycle)}`}
              />
              <InfoRow
                label={t('Payment method')}
                value={paymentMethodLabel(sub.payment_method || sub.provider)}
              />
              <InfoRow label={t('Renewal date')} value={formatDate(sub.current_period_end)} />
              {sub.canceled_at ? (
                <InfoRow label={t('Cancellation date')} value={formatDate(sub.canceled_at)} />
              ) : null}
            </View>
          ) : null}

          <View className="flex-row flex-wrap" style={{ marginTop: 18, gap: 8 }}>
            <ActionButton
              label={t('Upgrade or change plan')}
              variant="primary"
              onPress={() => router.push('/plans')}
            />
            {canManage && (
              <>
                <ActionButton
                  label={t('Update payment')}
                  variant="secondary"
                  onPress={updatePayment}
                />
                <ActionButton
                  label={t('Cancel subscription')}
                  variant="destructive"
                  onPress={cancel}
                />
              </>
            )}
          </View>
        </View>
      )}

      <Text className="text-lg font-semibold mb-3" style={{ color: colors.gray[900] }}>
        {t('Payment history')}
      </Text>
      {!loading && payments.length === 0 ? (
        <View className="items-center justify-center py-10 px-4">
          <Ionicons name="receipt-outline" size={36} color={colors.gray[400]} />
          <Text
            className="mt-3 text-center"
            style={{ color: colors.gray[500], fontSize: 15, lineHeight: 22 }}
          >
            {t('No payment history yet')}
          </Text>
        </View>
      ) : (
        payments.map((payment) => {
          const payTone = paymentStatusTone(payment.status);
          return (
            <View
              key={payment._id}
              style={{
                backgroundColor: colors.white,
                borderRadius: 14,
                padding: 16,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: colors.gray[200],
              }}
            >
              <View className="flex-row items-start justify-between" style={{ gap: 8 }}>
                <Text
                  style={{
                    color: colors.gray[900],
                    fontWeight: '700',
                    fontSize: 15,
                    flex: 1,
                  }}
                >
                  {productLabel(payment.product_type)}
                </Text>
                <View
                  style={{
                    backgroundColor: payTone.bg,
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ color: payTone.fg, fontWeight: '700', fontSize: 12 }}>
                    {paymentStatusLabel(payment.status)}
                  </Text>
                </View>
              </View>
              <Text style={{ color: colors.gray[900], fontSize: 16, fontWeight: '600', marginTop: 8 }}>
                {formatPlanPrice(Number(payment.amount) || 0)}
              </Text>
              <Text style={{ color: colors.gray[500], fontSize: 12, marginTop: 6, lineHeight: 18 }}>
                {formatDate(payment.paid_at || payment.created_at)}
              </Text>
            </View>
          );
        })
      )}
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-start" style={{ gap: 12 }}>
      <Text style={{ color: colors.gray[500], fontSize: 14, flex: 1 }}>{label}</Text>
      <Text
        style={{
          color: colors.gray[900],
          fontSize: 14,
          fontWeight: '600',
          flex: 1,
          textAlign: 'right',
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  variant,
  onPress,
}: {
  label: string;
  variant: 'primary' | 'secondary' | 'destructive';
  onPress: () => void;
}) {
  const palette = {
    primary: {
      bg: colors.primary[500],
      bgActive: colors.primary[600],
      fg: colors.white,
    },
    secondary: {
      bg: colors.gray[200],
      bgActive: colors.gray[300],
      fg: colors.gray[800],
    },
    destructive: {
      bg: colors.error[100],
      bgActive: colors.error[500],
      fg: colors.error[700],
    },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed, hovered }: PressableVisualState) => ({
        minHeight: 44,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed || hovered ? palette.bgActive : palette.bg,
        opacity: pressed ? 0.94 : 1,
        ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
      })}
    >
      {({ pressed, hovered }: PressableVisualState) => (
        <Text
          style={{
            color:
              variant === 'destructive' && (pressed || hovered)
                ? colors.white
                : palette.fg,
            fontWeight: '700',
            fontSize: 14,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
