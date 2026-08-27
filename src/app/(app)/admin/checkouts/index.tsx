import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { useToast } from '@/components/Toast';
import { billingApi } from '@/services/billing';
import { copyText } from '@/services/checkout';

type AdminClassroom = {
  _id: string;
  name?: string;
  teacher_name?: string;
  teacher_email?: string;
  checkout_allowed?: boolean;
  checkout_enabled?: boolean;
  price?: number | null;
  checkout_url?: string;
};

type CheckoutPayment = {
  _id: string;
  status?: string;
  amount?: number;
  buyer_name?: string;
  buyer_email?: string;
  classroom_name?: string;
  receipt_url?: string;
  invoice_url?: string;
  transaction_id?: string;
  created_at?: string;
};

export default function AdminClassroomCheckoutsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { roles } = useHasRole();
  const { toast } = useToast();
  const isAdmin = roles.includes('admin');
  const [tab, setTab] = useState<'classrooms' | 'history'>('classrooms');
  const [classrooms, setClassrooms] = useState<AdminClassroom[]>([]);
  const [payments, setPayments] = useState<CheckoutPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadClassrooms = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const res = await billingApi.adminClassrooms(userInfo.token);
      setClassrooms(res.data.classrooms || []);
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Failed to load classrooms'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [userInfo?.token, t]);

  const loadHistory = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const res = await billingApi.classroomCheckouts(userInfo.token, { limit: 100 });
      setPayments(res.data.payments || []);
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Failed to load checkout history'),
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
    if (!isAdmin) return;
    if (tab === 'classrooms') loadClassrooms();
    else loadHistory();
  }, [isAdmin, tab, loadClassrooms, loadHistory]);

  const toggleAllowed = async (classroom: AdminClassroom, allowed: boolean) => {
    try {
      setSavingId(classroom._id);
      const res = await billingApi.updateClassroomCheckout(userInfo?.token, classroom._id, {
        checkout_allowed: allowed,
      });
      setClassrooms((prev) =>
        prev.map((item) => (item._id === classroom._id ? { ...item, ...res.data } : item)),
      );
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Failed to save checkout settings'),
        variant: 'destructive',
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleCopy = async (url?: string) => {
    if (!url) return;
    const copied = await copyText(url);
    toast({
      message: copied ? t('Checkout link copied') : url,
      variant: copied ? 'success' : 'destructive',
    });
  };

  const openReceipt = async (url?: string) => {
    if (!url) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
      return;
    }
    await Linking.openURL(url);
  };

  if (!isAdmin) return null;

  return (
    <ScrollView className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8" contentContainerStyle={{ paddingBottom: 80 }}>
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
        <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
      </TouchableOpacity>
      <Text className="text-2xl font-bold mb-4">{t('Classroom checkouts')}</Text>

      <View className="flex-row mb-4 border-b border-gray-300">
        <TouchableOpacity
          onPress={() => setTab('classrooms')}
          className={`px-4 py-2 ${tab === 'classrooms' ? 'border-b-2 border-primary-500' : ''}`}
        >
          <Text className={`font-bold ${tab === 'classrooms' ? 'text-primary-500' : 'text-gray-500'}`}>
            {t('Classrooms with checkout')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('history')}
          className={`px-4 py-2 ${tab === 'history' ? 'border-b-2 border-primary-500' : ''}`}
        >
          <Text className={`font-bold ${tab === 'history' ? 'text-primary-500' : 'text-gray-500'}`}>
            {t('Checkout history')}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : tab === 'classrooms' ? (
        classrooms.map((classroom) => (
          <View key={classroom._id} className="bg-white rounded-xl p-4 mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-1 pr-3">
                <Text className="font-semibold">{classroom.name}</Text>
                <Text style={{ color: colors.gray[500] }}>
                  {classroom.teacher_name || classroom.teacher_email || ''}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-xs text-gray-500 mb-1">{t('Allow checkout')}</Text>
                <Switch
                  value={!!classroom.checkout_allowed}
                  onValueChange={(value) => toggleAllowed(classroom, value)}
                  disabled={savingId === classroom._id}
                  trackColor={{ false: colors.gray[300], true: colors.primary[200] }}
                  thumbColor={classroom.checkout_allowed ? colors.primary[500] : colors.gray[400]}
                />
              </View>
            </View>
            <Text style={{ color: colors.gray[500] }}>
              {t('Price')}: {classroom.price != null ? `R$ ${Number(classroom.price).toFixed(2)}` : '—'}
              {classroom.checkout_enabled ? ` · ${t('External checkout')}` : ''}
            </Text>
            {classroom.checkout_url ? (
              <View className="flex-row items-center gap-2 mt-3">
                <Text className="flex-1 text-xs text-gray-600" numberOfLines={2} selectable>
                  {classroom.checkout_url}
                </Text>
                <TouchableOpacity
                  onPress={() => handleCopy(classroom.checkout_url)}
                  className="px-3 py-2 rounded-xl"
                  style={{ backgroundColor: colors.primary[50] }}
                >
                  <Text className="text-xs font-semibold" style={{ color: colors.primary[500] }}>
                    {t('Copy link')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ))
      ) : (
        payments.map((payment) => (
          <View key={payment._id} className="bg-white rounded-xl p-4 mb-3">
            <Text className="font-semibold">{payment.classroom_name || '—'}</Text>
            <Text style={{ color: colors.gray[500] }}>
              {t('Buyer')}: {payment.buyer_name || payment.buyer_email || '—'}
            </Text>
            <Text style={{ color: colors.gray[500] }}>
              {t('Transaction')}: {payment.transaction_id || payment._id}
            </Text>
            <Text style={{ color: colors.gray[500] }}>
              {payment.status} · {payment.amount != null ? `R$ ${Number(payment.amount).toFixed(2)}` : ''}
            </Text>
            {payment.receipt_url || payment.invoice_url ? (
              <TouchableOpacity
                onPress={() => openReceipt(payment.receipt_url || payment.invoice_url)}
                className="mt-2 self-start"
              >
                <Text style={{ color: colors.primary[500] }}>{t('Receipt')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}
