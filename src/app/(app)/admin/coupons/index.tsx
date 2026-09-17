import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { useToast } from '@/components/Toast';
import { billingApi } from '@/services/billing';

export default function AdminCouponsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { roles } = useHasRole();
  const { toast } = useToast();
  const isAdmin = roles.includes('admin');
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [form, setForm] = useState({
    code: '', description: '', discount_type: 'percent', value: '', duration: 'once',
    max_uses: '', starts_at: '', expires_at: '', is_active: true,
  });

  const load = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const res = await billingApi.adminCoupons(userInfo.token);
      setCoupons(res.data.coupons || []);
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error loading coupons'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [userInfo?.token, t]);

  useEffect(() => { if (userInfo && !isAdmin) router.replace('/'); }, [userInfo, isAdmin, router]);
  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const save = async () => {
    try {
      await billingApi.createCoupon(userInfo?.token, {
        ...form,
        value: parseFloat(form.value),
        max_uses: form.max_uses ? parseInt(form.max_uses, 10) : null,
      });
      toast({ message: t('Coupon saved'), variant: 'success' });
      setForm({ code: '', description: '', discount_type: 'percent', value: '', duration: 'once', max_uses: '', starts_at: '', expires_at: '', is_active: true });
      load();
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error saving coupon'), variant: 'destructive' });
    }
  };

  const toggle = async (coupon: any) => {
    await billingApi.updateCoupon(userInfo?.token, coupon._id, { is_active: !coupon.is_active });
    load();
  };

  const showHistory = async (id: string) => {
    const res = await billingApi.couponRedemptions(userInfo?.token, id);
    setHistory(res.data.redemptions || []);
  };

  if (!isAdmin) return null;

  return (
    <ScrollView className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8" contentContainerStyle={{ paddingBottom: 80 }}>
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
        <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
      </TouchableOpacity>
      <Text className="text-2xl font-bold mb-4">{t('Coupons')}</Text>
      <View className="bg-white rounded-xl p-4 mb-4">
        {['code', 'description', 'value', 'max_uses', 'starts_at', 'expires_at'].map((field) => (
          <TextInput key={field} className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder={t(field)} value={(form as any)[field]} onChangeText={(value) => setForm((prev) => ({ ...prev, [field]: value }))} />
        ))}
        <View className="flex-row mb-2">
          {(['percent', 'fixed'] as const).map((type) => (
            <TouchableOpacity key={type} onPress={() => setForm((prev) => ({ ...prev, discount_type: type }))} className="px-3 py-1 rounded-full mr-2" style={{ backgroundColor: form.discount_type === type ? colors.primary[500] : colors.gray[200] }}>
              <Text style={{ color: form.discount_type === type ? '#fff' : colors.gray[800] }}>{t(type)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View className="flex-row mb-2">
          {(['once', 'repeating'] as const).map((duration) => (
            <TouchableOpacity key={duration} onPress={() => setForm((prev) => ({ ...prev, duration }))} className="px-3 py-1 rounded-full mr-2" style={{ backgroundColor: form.duration === duration ? colors.primary[500] : colors.gray[200] }}>
              <Text style={{ color: form.duration === duration ? '#fff' : colors.gray[800] }}>{t(duration)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={save} className="px-4 py-2 rounded-lg self-start" style={{ backgroundColor: colors.primary[500] }}>
          <Text className="text-white">{t('Create coupon')}</Text>
        </TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator color={colors.primary[500]} /> : coupons.map((coupon) => (
        <View key={coupon._id} className="bg-white rounded-xl p-4 mb-3">
          <Text className="font-semibold">{coupon.code} · {coupon.discount_type} {coupon.value}</Text>
          <Text style={{ color: colors.gray[500] }}>{t('Uses')}: {coupon.used_count}/{coupon.max_uses ?? '∞'} · {coupon.is_active ? t('Active') : t('Inactive')}</Text>
          <View className="flex-row mt-2">
            <TouchableOpacity onPress={() => toggle(coupon)} className="mr-4"><Text style={{ color: colors.primary[500] }}>{coupon.is_active ? t('Deactivate') : t('Activate')}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => showHistory(coupon._id)}><Text>{t('Usage history')}</Text></TouchableOpacity>
          </View>
        </View>
      ))}
      {history.length > 0 && (
        <View className="bg-white rounded-xl p-4">
          <Text className="font-semibold mb-2">{t('Usage history')}</Text>
          {history.map((item) => (
            <Text key={item._id}>{item.user_id} · {item.redeemed_at}</Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
