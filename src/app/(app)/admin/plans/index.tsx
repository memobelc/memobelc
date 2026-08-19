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

const CYCLES = ['MONTHLY', 'YEARLY', 'QUARTERLY', 'SEMIANNUALLY', 'WEEKLY'];
const SERVICES = ['home', 'videos', 'books', 'collections', 'talk_to_me', 'classrooms', 'courses'];

export default function AdminPlansScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { roles } = useHasRole();
  const { toast } = useToast();
  const isAdmin = roles.includes('admin');
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    cycle: 'MONTHLY',
    trial_days: '0',
    google_play_product_id: '',
    included_service_keys: [] as string[],
    is_active: true,
    is_public: true,
  });

  const load = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const res = await billingApi.adminPlans(userInfo.token);
      setPlans(res.data.plans || []);
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error loading plans'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [userInfo?.token, t]);

  useEffect(() => {
    if (userInfo && !isAdmin) router.replace('/');
  }, [userInfo, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const startCreate = () => {
    setEditing({});
    setForm({
      name: '',
      description: '',
      price: '',
      cycle: 'MONTHLY',
      trial_days: '0',
      google_play_product_id: '',
      included_service_keys: [],
      is_active: true,
      is_public: true,
    });
  };

  const startEdit = (plan: any) => {
    setEditing(plan);
    setForm({
      name: plan.name || '',
      description: plan.description || '',
      price: String(plan.price ?? ''),
      cycle: plan.cycle || 'MONTHLY',
      trial_days: String(plan.trial_days ?? 0),
      google_play_product_id: plan.google_play_product_id || '',
      included_service_keys: plan.included_service_keys || [],
      is_active: plan.is_active !== false,
      is_public: plan.is_public !== false,
    });
  };

  const save = async () => {
    if (!form.name.trim() || !form.price) {
      toast({ message: t('Name and price are required'), variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...form,
        price: parseFloat(form.price),
        trial_days: parseInt(form.trial_days || '0', 10),
      };
      if (editing?._id) {
        await billingApi.updatePlan(userInfo?.token, editing._id, payload);
      } else {
        await billingApi.createPlan(userInfo?.token, payload);
      }
      toast({ message: t('Plan saved'), variant: 'success' });
      setEditing(null);
      load();
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error saving plan'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleService = (key: string) => {
    setForm((prev) => ({
      ...prev,
      included_service_keys: prev.included_service_keys.includes(key)
        ? prev.included_service_keys.filter((item) => item !== key)
        : [...prev.included_service_keys, key],
    }));
  };

  if (!isAdmin) return null;

  return (
    <ScrollView className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8" contentContainerStyle={{ paddingBottom: 80 }}>
      <View className="flex-row items-center justify-between mb-4">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
          <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
          <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={startCreate} className="px-3 py-2 rounded-lg" style={{ backgroundColor: colors.primary[500] }}>
          <Text className="text-white font-semibold">{t('New plan')}</Text>
        </TouchableOpacity>
      </View>
      <Text className="text-2xl font-bold mb-4" style={{ color: colors.gray[900] }}>{t('Plans')}</Text>
      {loading ? <ActivityIndicator color={colors.primary[500]} /> : plans.map((plan) => (
        <TouchableOpacity key={plan._id} onPress={() => startEdit(plan)} className="bg-white rounded-xl p-4 mb-3">
          <Text className="font-semibold">{plan.name}</Text>
          <Text style={{ color: colors.gray[500] }}>{plan.cycle} · R$ {plan.price} · {plan.is_active ? t('Active') : t('Inactive')}</Text>
        </TouchableOpacity>
      ))}
      {editing && (
        <View className="bg-white rounded-xl p-4 mt-2">
          <Text className="font-semibold mb-2">{editing._id ? t('Edit plan') : t('New plan')}</Text>
          {['name', 'description', 'price', 'trial_days', 'google_play_product_id'].map((field) => (
            <TextInput
              key={field}
              className="border border-gray-200 rounded-lg px-3 py-2 mb-2"
              placeholder={t(field === 'google_play_product_id' ? 'Google Play SKU' : field)}
              value={(form as any)[field]}
              onChangeText={(value) => setForm((prev) => ({ ...prev, [field]: value }))}
            />
          ))}
          <View className="flex-row flex-wrap mb-2">
            {CYCLES.map((cycle) => (
              <TouchableOpacity key={cycle} onPress={() => setForm((prev) => ({ ...prev, cycle }))} className="px-3 py-1 rounded-full mr-2 mb-2" style={{ backgroundColor: form.cycle === cycle ? colors.primary[500] : colors.gray[200] }}>
                <Text style={{ color: form.cycle === cycle ? '#fff' : colors.gray[700] }}>{cycle}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text className="mb-1">{t('Included services')}</Text>
          {SERVICES.map((key) => (
            <TouchableOpacity key={key} onPress={() => toggleService(key)} className="mb-1">
              <Text>{form.included_service_keys.includes(key) ? '☑' : '☐'} {t(key)}</Text>
            </TouchableOpacity>
          ))}
          <View className="flex-row mt-3">
            <TouchableOpacity disabled={saving} onPress={save} className="px-4 py-2 rounded-lg mr-2" style={{ backgroundColor: colors.primary[500] }}>
              <Text className="text-white">{t('Save')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditing(null)} className="px-4 py-2 rounded-lg" style={{ backgroundColor: colors.gray[200] }}>
              <Text>{t('Cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
