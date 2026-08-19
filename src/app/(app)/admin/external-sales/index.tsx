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

export default function AdminExternalSalesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { roles } = useHasRole();
  const { toast } = useToast();
  const isAdmin = roles.includes('admin');
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', name: '', product_type: 'book', product_id: '', amount: '', notes: '' });

  const load = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const res = await billingApi.externalSales(userInfo.token);
      setSales(res.data.sales || []);
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error loading external sales'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [userInfo?.token, t]);

  useEffect(() => { if (userInfo && !isAdmin) router.replace('/'); }, [userInfo, isAdmin, router]);
  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const save = async () => {
    try {
      await billingApi.createExternalSale(userInfo?.token, {
        email: form.email,
        name: form.name,
        product_type: form.product_type,
        product_ids: [form.product_id],
        amount: form.amount ? parseFloat(form.amount) : undefined,
        notes: form.notes,
      });
      toast({ message: t('External sale registered'), variant: 'success' });
      setForm({ email: '', name: '', product_type: 'book', product_id: '', amount: '', notes: '' });
      load();
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error registering sale'), variant: 'destructive' });
    }
  };

  if (!isAdmin) return null;

  return (
    <ScrollView className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8" contentContainerStyle={{ paddingBottom: 80 }}>
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
        <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
      </TouchableOpacity>
      <Text className="text-2xl font-bold mb-4">{t('External sales')}</Text>
      <View className="bg-white rounded-xl p-4 mb-4">
        <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder={t('email')} value={form.email} onChangeText={(email) => setForm((prev) => ({ ...prev, email }))} />
        <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder={t('name')} value={form.name} onChangeText={(name) => setForm((prev) => ({ ...prev, name }))} />
        <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder={t('Type (plan, book, bundle, service)')} value={form.product_type} onChangeText={(product_type) => setForm((prev) => ({ ...prev, product_type }))} />
        <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder="product_id" value={form.product_id} onChangeText={(product_id) => setForm((prev) => ({ ...prev, product_id }))} />
        <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder={t('Price')} value={form.amount} onChangeText={(amount) => setForm((prev) => ({ ...prev, amount }))} />
        <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder={t('Notes')} value={form.notes} onChangeText={(notes) => setForm((prev) => ({ ...prev, notes }))} />
        <TouchableOpacity onPress={save} className="px-4 py-2 rounded-lg self-start" style={{ backgroundColor: colors.primary[500] }}>
          <Text className="text-white">{t('Register sale')}</Text>
        </TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator color={colors.primary[500]} /> : sales.map((sale) => (
        <View key={sale._id} className="bg-white rounded-xl p-4 mb-3">
          <Text className="font-semibold">{sale.email}</Text>
          <Text style={{ color: colors.gray[500] }}>{sale.product_type} · {(sale.product_ids || []).join(', ')} · {sale.origin}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
