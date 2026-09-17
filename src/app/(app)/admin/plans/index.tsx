import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { useToast } from '@/components/Toast';
import { useNow } from '@/hooks/useNow';
import { billingApi } from '@/services/billing';
import { formatPlanPrice } from '@/components/molecules/PlanCard';
import { formatDisplayDate } from '@/utils/formatFriendlyDate';
import StatusBadge from '@/components/admin/StatusBadge';
import AdminDataTable, { type AdminColumn } from '@/components/admin/AdminDataTable';
import AdminUserCell from '@/components/admin/AdminUserCell';
import AdminConfirmModal from '@/components/admin/AdminConfirmModal';

const CYCLES = ['MONTHLY', 'YEARLY', 'QUARTERLY', 'SEMIANNUALLY', 'WEEKLY'];
const SERVICES = ['home', 'videos', 'books', 'collections', 'talk_to_me', 'classrooms', 'courses'];
const CYCLE_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly',
  YEARLY: 'Yearly',
  QUARTERLY: 'Quarterly',
  SEMIANNUALLY: 'Semiannually',
  WEEKLY: 'Weekly',
};

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
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { roles } = useHasRole();
  const { toast } = useToast();
  const isAdmin = roles.includes('admin');
  const now = useNow(30_000);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [insights, setInsights] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sort, setSort] = useState('name');

  const load = useCallback(async (silent = false) => {
    if (!userInfo?.token) return;
    try {
      if (!silent) setLoading(true);
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
    if (isAdmin) load(true);
  }, [isAdmin, load, now]);

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
      load(true);
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error saving plan'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const removePlan = async () => {
    if (!editing?._id) return;
    try {
      await billingApi.deletePlan(userInfo?.token, editing._id);
      toast({ message: t('Plan deleted'), variant: 'success' });
      setDeleteOpen(false);
      setEditing(null);
      load(true);
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error deleting plan'),
        variant: 'destructive',
      });
    }
  };

  const openInsights = async (plan: any) => {
    try {
      const res = await billingApi.planInsights(userInfo?.token, plan._id);
      setInsights(res.data);
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error loading plans'), variant: 'destructive' });
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

  const sortedPlans = [...plans].sort((a, b) => {
    const dir = sort.startsWith('-') ? -1 : 1;
    const key = sort.replace(/^-/, '');
    const av = key === 'name' ? (a.name || '') : Number(a[key] || 0);
    const bv = key === 'name' ? (b.name || '') : Number(b[key] || 0);
    if (typeof av === 'string') return av.localeCompare(bv as string) * dir;
    return ((av as number) - (bv as number)) * dir;
  });

  const columns: AdminColumn<any>[] = [
    { key: 'name', label: t('name'), sortable: true, render: (row) => <Text className="font-semibold">{row.name}</Text> },
    { key: 'price', label: t('price'), sortable: true, render: (row) => <Text>{formatPlanPrice(Number(row.price) || 0)}</Text> },
    { key: 'cycle', label: t('Cycle'), render: (row) => <Text>{t(CYCLE_LABELS[row.cycle] || row.cycle)}</Text> },
    { key: 'subscriber_count', label: t('Subscribers'), sortable: true, render: (row) => <Text>{row.subscriber_count ?? 0}</Text> },
    { key: 'mrr', label: t('Monthly recurring revenue (MRR)'), sortable: true, render: (row) => <Text>{formatPlanPrice(Number(row.mrr) || 0)}</Text> },
    { key: 'revenue_total', label: t('Total revenue'), sortable: true, render: (row) => <Text>{formatPlanPrice(Number(row.revenue_total) || 0)}</Text> },
    { key: 'status', label: t('Status'), render: (row) => <StatusBadge status={row.is_active === false ? 'inactive' : 'active'} /> },
    {
      key: 'benefits',
      label: t('Benefits'),
      render: (row) => (
        <Text numberOfLines={2} style={{ color: colors.gray[600] }}>
          {(row.benefits || []).slice(0, 3).join(' · ') || '—'}
        </Text>
      ),
    },
    {
      key: 'created_at',
      label: t('Created'),
      render: (row) => <Text>{formatDisplayDate(row.created_at, t, { locale: i18n.language })}</Text>,
    },
    {
      key: 'actions',
      label: t('Actions'),
      render: (row) => (
        <View className="flex-row">
          <Pressable onPress={() => openInsights(row)} accessibilityRole="button" accessibilityLabel={t('Plan insights')} style={{ minHeight: 44, justifyContent: 'center', marginRight: 12 }}>
            <Text style={{ color: colors.primary[600] }}>{t('Plan insights')}</Text>
          </Pressable>
          <Pressable onPress={() => startEdit(row)} accessibilityRole="button" accessibilityLabel={t('Edit plan')} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: colors.gray[800] }}>{t('Edit plan')}</Text>
          </Pressable>
        </View>
      ),
    },
  ];

  if (!isAdmin) return null;

  return (
    <ScrollView className="flex-1 w-full px-4 md:w-4/5 max-w-[1440px] mx-auto mt-8" contentContainerStyle={{ paddingBottom: 96 }}>
      <View className="flex-row items-center justify-between mb-4">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('Back')} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
          <Text style={{ color: colors.primary[500], marginLeft: 6 }}>{t('Back')}</Text>
        </Pressable>
        <Pressable onPress={startCreate} accessibilityRole="button" accessibilityLabel={t('New plan')} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.primary[500], justifyContent: 'center' }}>
          <Text className="text-white font-semibold">{t('New plan')}</Text>
        </Pressable>
      </View>
      <Text className="text-2xl font-bold mb-4" style={{ color: colors.gray[900] }}>{t('Plans')}</Text>
      <AdminDataTable
        columns={columns}
        rows={sortedPlans}
        loading={loading}
        emptyLabel={t('No plans found')}
        sort={sort}
        onSort={(key) => setSort((prev) => (prev === key ? `-${key}` : prev === `-${key}` ? key : `-${key}`))}
      />

      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <Pressable className="flex-1 bg-black/50 items-center justify-center px-4" onPress={() => setEditing(null)}>
          <Pressable className="w-full max-w-2xl bg-white rounded-2xl p-5" style={{ maxHeight: '88%' }} onPress={(event) => event.stopPropagation?.()}>
            <ScrollView>
              <Text className="font-semibold text-lg mb-3">{editing?._id ? t('Edit plan') : t('New plan')}</Text>
              <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder={t('name')} value={form.name} onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))} style={{ minHeight: 44 }} />
              <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder={t('description')} value={form.description} onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))} style={{ minHeight: 44 }} />
              <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder={t('price')} keyboardType="decimal-pad" value={form.price} onChangeText={(value) => setForm((prev) => ({ ...prev, price: value }))} style={{ minHeight: 44 }} />
              <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder={t('Original price')} keyboardType="decimal-pad" value={form.original_price} onChangeText={(value) => setForm((prev) => ({ ...prev, original_price: value }))} style={{ minHeight: 44 }} />
              <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder={t('Installments')} keyboardType="number-pad" value={form.installment_count} onChangeText={(value) => setForm((prev) => ({ ...prev, installment_count: value }))} style={{ minHeight: 44 }} />
              <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder={t('Badge')} value={form.badge} onChangeText={(value) => setForm((prev) => ({ ...prev, badge: value }))} style={{ minHeight: 44 }} />
              <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder={t('trial days')} keyboardType="number-pad" value={form.trial_days} onChangeText={(value) => setForm((prev) => ({ ...prev, trial_days: value }))} style={{ minHeight: 44 }} />
              <View className="flex-row flex-wrap mb-2">
                {CYCLES.map((cycle) => (
                  <Pressable key={cycle} onPress={() => setForm((prev) => ({ ...prev, cycle }))} accessibilityRole="button" accessibilityLabel={t(CYCLE_LABELS[cycle])} style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 999, marginRight: 8, marginBottom: 8, justifyContent: 'center', backgroundColor: form.cycle === cycle ? colors.primary[500] : colors.gray[200] }}>
                    <Text style={{ color: form.cycle === cycle ? '#fff' : colors.gray[700] }}>{t(CYCLE_LABELS[cycle])}</Text>
                  </Pressable>
                ))}
              </View>
              <Text className="mb-1">{t('Benefits')}</Text>
              {form.benefits.map((benefit, index) => (
                <View key={`benefit-${index}`} className="flex-row items-center mb-2">
                  <TextInput className="flex-1 border border-gray-200 rounded-lg px-3 py-2" placeholder={t('Benefit')} value={benefit} onChangeText={(value) => setForm((prev) => { const benefits = [...prev.benefits]; benefits[index] = value; return { ...prev, benefits }; })} style={{ minHeight: 44 }} />
                  <Pressable onPress={() => setForm((prev) => ({ ...prev, benefits: prev.benefits.filter((_, itemIndex) => itemIndex !== index) }))} accessibilityRole="button" accessibilityLabel={t('Delete')} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="close-circle" size={22} color={colors.error[500]} />
                  </Pressable>
                </View>
              ))}
              <Pressable onPress={() => setForm((prev) => ({ ...prev, benefits: [...prev.benefits, ''] }))} accessibilityRole="button" accessibilityLabel={t('Add benefit')} style={{ minHeight: 44, justifyContent: 'center', marginBottom: 12 }}>
                <Text style={{ color: colors.primary[500] }}>{t('Add benefit')}</Text>
              </Pressable>
              <Text className="mb-1">{t('Included services')}</Text>
              {SERVICES.map((key) => (
                <Pressable key={key} onPress={() => toggleService(key)} accessibilityRole="button" accessibilityLabel={t(key)} style={{ minHeight: 44, justifyContent: 'center' }}>
                  <Text>{form.included_service_keys.includes(key) ? '☑' : '☐'} {t(key)}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setForm((prev) => ({ ...prev, is_active: !prev.is_active }))} accessibilityRole="button" accessibilityLabel={t('Active')} style={{ minHeight: 44, justifyContent: 'center', marginTop: 8 }}>
                <Text>{form.is_active ? '☑' : '☐'} {t('Active')}</Text>
              </Pressable>
              <Pressable onPress={() => setForm((prev) => ({ ...prev, is_public: !prev.is_public }))} accessibilityRole="button" accessibilityLabel={t('Public')} style={{ minHeight: 44, justifyContent: 'center', marginBottom: 8 }}>
                <Text>{form.is_public ? '☑' : '☐'} {t('Public')}</Text>
              </Pressable>
              <View className="flex-row flex-wrap mt-3">
                <Pressable disabled={saving} onPress={save} accessibilityRole="button" accessibilityLabel={t('Save')} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.primary[500], justifyContent: 'center', marginRight: 8, marginBottom: 8 }}>
                  <Text className="text-white">{t('Save')}</Text>
                </Pressable>
                <Pressable onPress={() => setEditing(null)} accessibilityRole="button" accessibilityLabel={t('Cancel')} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.gray[200], justifyContent: 'center', marginRight: 8, marginBottom: 8 }}>
                  <Text>{t('Cancel')}</Text>
                </Pressable>
                {editing?._id ? (
                  <Pressable onPress={() => setDeleteOpen(true)} accessibilityRole="button" accessibilityLabel={t('Delete')} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.error[500], justifyContent: 'center', marginBottom: 8 }}>
                    <Text className="text-white">{t('Delete')}</Text>
                  </Pressable>
                ) : null}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!insights} transparent animationType="fade" onRequestClose={() => setInsights(null)}>
        <Pressable className="flex-1 bg-black/50 items-center justify-center px-4" onPress={() => setInsights(null)}>
          <Pressable className="w-full max-w-3xl bg-white rounded-2xl p-5" style={{ maxHeight: '88%' }}>
            <ScrollView>
              <Text className="text-lg font-bold mb-2">{insights?.plan?.name} · {t('Plan insights')}</Text>
              <View className="flex-row flex-wrap mb-3">
                {[
                  [t('Subscribers'), insights?.subscriber_count],
                  [t('Monthly recurring revenue (MRR)'), formatPlanPrice(Number(insights?.mrr) || 0)],
                  [t('Annual recurring revenue (ARR)'), formatPlanPrice(Number(insights?.mrr || 0) * 12)],
                  [t('Revenue this month'), formatPlanPrice(Number(insights?.revenue_month) || 0)],
                  [t('Revenue this year'), formatPlanPrice(Number(insights?.revenue_year) || 0)],
                  [t('Total revenue'), formatPlanPrice(Number(insights?.revenue_total) || 0)],
                  [t('Conversion rate'), `${insights?.conversion_rate ?? 0}%`],
                ].map(([label, value]) => (
                  <View key={String(label)} className="mr-3 mb-3 p-3 rounded-xl" style={{ backgroundColor: colors.gray[100], minWidth: 140 }}>
                    <Text className="text-xs" style={{ color: colors.gray[500] }}>{label}</Text>
                    <Text className="font-bold">{value}</Text>
                  </View>
                ))}
              </View>
              <Text className="font-semibold mb-2">{t('Subscribers')}</Text>
              {(insights?.subscribers || []).map((item: any) => (
                <View key={item._id} className="mb-2">
                  <AdminUserCell user={item.user} userId={item.user_id} />
                  <StatusBadge status={item.status} />
                </View>
              ))}
              <Text className="font-semibold mt-4 mb-2">{t('Audit history')}</Text>
              {(insights?.audit || []).length === 0 ? (
                <Text style={{ color: colors.gray[500] }}>{t('No audit logs')}</Text>
              ) : (insights?.audit || []).map((log: any) => (
                <Text key={log._id} className="mb-1" style={{ color: colors.gray[700] }}>
                  {log.action} · {formatDisplayDate(log.created_at, t, { locale: i18n.language })}
                </Text>
              ))}
            </ScrollView>
            <Pressable onPress={() => setInsights(null)} accessibilityRole="button" accessibilityLabel={t('Close')} style={{ minHeight: 44, justifyContent: 'center', marginTop: 8 }}>
              <Text style={{ color: colors.primary[600] }}>{t('Close')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <AdminConfirmModal
        open={deleteOpen}
        title={t('Delete plan')}
        message={t('Are you sure you want to delete this plan? This action cannot be undone.')}
        confirmLabel={t('Delete')}
        destructive
        onCancel={() => setDeleteOpen(false)}
        onConfirm={removePlan}
      />
    </ScrollView>
  );
}
