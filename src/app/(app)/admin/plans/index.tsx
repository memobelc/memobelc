import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
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

const emptyForm = {
  name: '',
  description: '',
  price: '',
  original_price: '',
  installment_count: '0',
  badge: '',
  benefits: [] as string[],
  cycle: 'MONTHLY',
  trial_days: '0',
  google_play_product_id: '',
  included_service_keys: [] as string[],
  is_active: true,
  is_public: true,
};

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
  const [form, setForm] = useState(emptyForm);

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
    setForm({ ...emptyForm, benefits: [] });
  };

  const startEdit = (plan: any) => {
    setEditing(plan);
    setForm({
      name: plan.name || '',
      description: plan.description || '',
      price: String(plan.price ?? ''),
      original_price: plan.original_price != null && plan.original_price !== '' ? String(plan.original_price) : '',
      installment_count: String(plan.installment_count ?? 0),
      badge: plan.badge || '',
      benefits: Array.isArray(plan.benefits) ? [...plan.benefits] : [],
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
        name: form.name.trim(),
        description: form.description,
        price: parseFloat(form.price),
        original_price: form.original_price ? parseFloat(form.original_price) : null,
        installment_count: parseInt(form.installment_count || '0', 10) || 0,
        badge: form.badge.trim(),
        benefits: form.benefits.map((item) => item.trim()).filter(Boolean),
        cycle: form.cycle,
        trial_days: parseInt(form.trial_days || '0', 10),
        google_play_product_id: form.google_play_product_id || null,
        included_service_keys: form.included_service_keys,
        is_active: form.is_active,
        is_public: form.is_public,
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

  const removePlan = () => {
    if (!editing?._id) return;
    Alert.alert(
      t('Delete plan'),
      t('Are you sure you want to delete this plan? This action cannot be undone.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await billingApi.deletePlan(userInfo?.token, editing._id);
              toast({ message: t('Plan deleted'), variant: 'success' });
              setEditing(null);
              load();
            } catch (error: any) {
              toast({
                message: error.response?.data?.error || t('Error deleting plan'),
                variant: 'destructive',
              });
            }
          },
        },
      ]
    );
  };

  const toggleService = (key: string) => {
    setForm((prev) => ({
      ...prev,
      included_service_keys: prev.included_service_keys.includes(key)
        ? prev.included_service_keys.filter((item) => item !== key)
        : [...prev.included_service_keys, key],
    }));
  };

  const updateBenefit = (index: number, value: string) => {
    setForm((prev) => {
      const benefits = [...prev.benefits];
      benefits[index] = value;
      return { ...prev, benefits };
    });
  };

  const removeBenefit = (index: number) => {
    setForm((prev) => ({
      ...prev,
      benefits: prev.benefits.filter((_, itemIndex) => itemIndex !== index),
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
          <Text style={{ color: colors.gray[500] }}>
            {plan.cycle} · R$ {plan.price} · {plan.is_active ? t('Active') : t('Inactive')}
            {plan.is_public === false ? ` · ${t('Private')}` : ''}
          </Text>
        </TouchableOpacity>
      ))}
      {editing && (
        <View className="bg-white rounded-xl p-4 mt-2">
          <Text className="font-semibold mb-2">{editing._id ? t('Edit plan') : t('New plan')}</Text>
          <TextInput
            className="border border-gray-200 rounded-lg px-3 py-2 mb-2"
            placeholder={t('name')}
            value={form.name}
            onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
          />
          <TextInput
            className="border border-gray-200 rounded-lg px-3 py-2 mb-2"
            placeholder={t('description')}
            value={form.description}
            onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
          />
          <TextInput
            className="border border-gray-200 rounded-lg px-3 py-2 mb-2"
            placeholder={t('price')}
            keyboardType="decimal-pad"
            value={form.price}
            onChangeText={(value) => setForm((prev) => ({ ...prev, price: value }))}
          />
          <TextInput
            className="border border-gray-200 rounded-lg px-3 py-2 mb-2"
            placeholder={t('Original price')}
            keyboardType="decimal-pad"
            value={form.original_price}
            onChangeText={(value) => setForm((prev) => ({ ...prev, original_price: value }))}
          />
          <TextInput
            className="border border-gray-200 rounded-lg px-3 py-2 mb-2"
            placeholder={t('Installments')}
            keyboardType="number-pad"
            value={form.installment_count}
            onChangeText={(value) => setForm((prev) => ({ ...prev, installment_count: value }))}
          />
          <TextInput
            className="border border-gray-200 rounded-lg px-3 py-2 mb-2"
            placeholder={t('Badge')}
            value={form.badge}
            onChangeText={(value) => setForm((prev) => ({ ...prev, badge: value }))}
          />
          <TextInput
            className="border border-gray-200 rounded-lg px-3 py-2 mb-2"
            placeholder={t('trial days')}
            keyboardType="number-pad"
            value={form.trial_days}
            onChangeText={(value) => setForm((prev) => ({ ...prev, trial_days: value }))}
          />
          <View className="flex-row flex-wrap mb-2">
            {CYCLES.map((cycle) => (
              <TouchableOpacity key={cycle} onPress={() => setForm((prev) => ({ ...prev, cycle }))} className="px-3 py-1 rounded-full mr-2 mb-2" style={{ backgroundColor: form.cycle === cycle ? colors.primary[500] : colors.gray[200] }}>
                <Text style={{ color: form.cycle === cycle ? '#fff' : colors.gray[700] }}>{cycle}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text className="mb-1">{t('Benefits')}</Text>
          {form.benefits.map((benefit, index) => (
            <View key={`benefit-${index}`} className="flex-row items-center mb-2">
              <TextInput
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2"
                placeholder={t('Benefit')}
                value={benefit}
                onChangeText={(value) => updateBenefit(index, value)}
              />
              <TouchableOpacity onPress={() => removeBenefit(index)} className="ml-2">
                <Ionicons name="close-circle" size={22} color={colors.error[500]} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            onPress={() => setForm((prev) => ({ ...prev, benefits: [...prev.benefits, ''] }))}
            className="mb-3 self-start"
          >
            <Text style={{ color: colors.primary[500] }}>{t('Add benefit')}</Text>
          </TouchableOpacity>
          <Text className="mb-1">{t('Included services')}</Text>
          {SERVICES.map((key) => (
            <TouchableOpacity key={key} onPress={() => toggleService(key)} className="mb-1">
              <Text>{form.included_service_keys.includes(key) ? '☑' : '☐'} {t(key)}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setForm((prev) => ({ ...prev, is_active: !prev.is_active }))} className="mt-2">
            <Text>{form.is_active ? '☑' : '☐'} {t('Active')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setForm((prev) => ({ ...prev, is_public: !prev.is_public }))} className="mb-2">
            <Text>{form.is_public ? '☑' : '☐'} {t('Public')}</Text>
          </TouchableOpacity>
          <View className="flex-row mt-3 flex-wrap">
            <TouchableOpacity disabled={saving} onPress={save} className="px-4 py-2 rounded-lg mr-2 mb-2" style={{ backgroundColor: colors.primary[500] }}>
              <Text className="text-white">{t('Save')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditing(null)} className="px-4 py-2 rounded-lg mr-2 mb-2" style={{ backgroundColor: colors.gray[200] }}>
              <Text>{t('Cancel')}</Text>
            </TouchableOpacity>
            {editing._id ? (
              <TouchableOpacity onPress={removePlan} className="px-4 py-2 rounded-lg mb-2" style={{ backgroundColor: colors.error[500] }}>
                <Text className="text-white">{t('Delete')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
