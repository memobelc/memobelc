import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Image,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { useToast } from '@/components/Toast';
import { adminAffiliateApi, type AffiliateProduct, type CommissionTier } from '@/services/affiliate';
import { uploadImageToFirebase } from '@/utils/uploadImage';

const emptyForm = {
  name: '',
  description: '',
  rules: '',
  terms: '',
  image: '',
  source: 'external' as 'platform' | 'external',
  product_type: 'plan',
  product_id: '',
  checkout_url: '',
  affiliate_enabled: true,
  show_in_catalog: true,
  commission_tiers: [{ min_sales: 0, max_sales: 10, percent: 10 }] as CommissionTier[],
};

export default function AdminAffiliateProductsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { roles } = useHasRole();
  const { toast } = useToast();
  const isAdmin = roles.includes('admin');
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const response = await adminAffiliateApi.products(userInfo.token);
      setProducts(response.data.products || []);
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error loading affiliate data'),
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
    if (isAdmin) load();
  }, [isAdmin, load]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const url = await uploadImageToFirebase(result.assets[0].uri, `affiliate/${Date.now()}`);
    setForm((prev) => ({ ...prev, image: url }));
  };

  const save = async () => {
    try {
      setSaving(true);
      const payload = {
        ...form,
        product_id: form.source === 'platform' ? form.product_id : undefined,
        product_type: form.source === 'platform' ? form.product_type : undefined,
      };
      if (editingId) {
        await adminAffiliateApi.updateProduct(userInfo?.token, editingId, payload);
      } else {
        await adminAffiliateApi.createProduct(userInfo?.token, payload);
      }
      toast({ message: t('Product saved'), variant: 'success' });
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error saving product'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8" contentContainerStyle={{ paddingBottom: 80 }}>
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
        <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
      </TouchableOpacity>
      <Text className="text-2xl font-bold mb-4">{t('Affiliate products')}</Text>
      <View className="bg-white rounded-xl p-4 mb-4">
        <TextInput value={form.name} onChangeText={(name) => setForm((p) => ({ ...p, name }))} placeholder={t('Affiliate product name')} className="border border-gray-200 rounded-lg px-3 py-2 mb-2" />
        <TextInput value={form.description} onChangeText={(description) => setForm((p) => ({ ...p, description }))} placeholder={t('Description')} multiline className="border border-gray-200 rounded-lg px-3 py-2 mb-2" />
        <TextInput value={form.rules} onChangeText={(rules) => setForm((p) => ({ ...p, rules }))} placeholder={t('Rules')} multiline className="border border-gray-200 rounded-lg px-3 py-2 mb-2" />
        <TextInput value={form.terms} onChangeText={(terms) => setForm((p) => ({ ...p, terms }))} placeholder={t('Affiliate terms')} multiline className="border border-gray-200 rounded-lg px-3 py-2 mb-2" />
        <TextInput value={form.checkout_url} onChangeText={(checkout_url) => setForm((p) => ({ ...p, checkout_url }))} placeholder={t('Landing / checkout URL')} className="border border-gray-200 rounded-lg px-3 py-2 mb-2" />
        <View className="flex-row mb-2">
          {(['external', 'platform'] as const).map((source) => (
            <TouchableOpacity key={source} onPress={() => setForm((p) => ({ ...p, source }))} className="mr-2 px-3 py-1 rounded-lg" style={{ backgroundColor: form.source === source ? colors.primary[500] : colors.gray[200] }}>
              <Text className={form.source === source ? 'text-white' : 'text-gray-700'}>{source === 'external' ? t('External') : t('Platform')}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {form.source === 'platform' && (
          <>
            <TextInput value={form.product_type} onChangeText={(product_type) => setForm((p) => ({ ...p, product_type }))} placeholder="plan | book | bundle | course | classroom" className="border border-gray-200 rounded-lg px-3 py-2 mb-2" />
            <TextInput value={form.product_id} onChangeText={(product_id) => setForm((p) => ({ ...p, product_id }))} placeholder={t('Product')} className="border border-gray-200 rounded-lg px-3 py-2 mb-2" />
          </>
        )}
        <TouchableOpacity onPress={pickImage} className="mb-2">
          <Text style={{ color: colors.primary[700] }}>{t('Add image')}</Text>
        </TouchableOpacity>
        {form.image ? <Image source={{ uri: form.image }} className="w-24 h-24 rounded-lg mb-2" /> : null}
        <View className="flex-row items-center justify-between mb-2">
          <Text>{t('Enable affiliation')}</Text>
          <Switch value={form.affiliate_enabled} onValueChange={(affiliate_enabled) => setForm((p) => ({ ...p, affiliate_enabled }))} />
        </View>
        <View className="flex-row items-center justify-between mb-3">
          <Text>{t('Show in catalog')}</Text>
          <Switch value={form.show_in_catalog} onValueChange={(show_in_catalog) => setForm((p) => ({ ...p, show_in_catalog }))} />
        </View>
        <Text className="font-bold mb-2">{t('Commission rules')}</Text>
        {form.commission_tiers.map((tier, index) => (
          <View key={index} className="flex-row mb-2">
            <TextInput value={String(tier.min_sales)} onChangeText={(value) => setForm((p) => { const next = [...p.commission_tiers]; next[index] = { ...next[index], min_sales: Number(value || 0) }; return { ...p, commission_tiers: next }; })} placeholder={t('Min sales')} className="flex-1 border border-gray-200 rounded-lg px-2 py-1 mr-1" />
            <TextInput value={tier.max_sales == null ? '' : String(tier.max_sales)} onChangeText={(value) => setForm((p) => { const next = [...p.commission_tiers]; next[index] = { ...next[index], max_sales: value === '' ? null : Number(value) }; return { ...p, commission_tiers: next }; })} placeholder={t('Max sales')} className="flex-1 border border-gray-200 rounded-lg px-2 py-1 mr-1" />
            <TextInput value={String(tier.percent)} onChangeText={(value) => setForm((p) => { const next = [...p.commission_tiers]; next[index] = { ...next[index], percent: Number(value || 0) }; return { ...p, commission_tiers: next }; })} placeholder={t('Percent')} className="w-20 border border-gray-200 rounded-lg px-2 py-1" />
          </View>
        ))}
        <TouchableOpacity onPress={() => setForm((p) => ({ ...p, commission_tiers: [...p.commission_tiers, { min_sales: 0, percent: 0 }] }))} className="mb-3">
          <Text style={{ color: colors.primary[700] }}>{t('Add commission tier')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={save} disabled={saving} className="py-2.5 rounded-lg items-center" style={{ backgroundColor: colors.primary[500] }}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">{t('Save product')}</Text>}
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : (
        products.map((product) => (
          <TouchableOpacity
            key={product._id}
            onPress={() => {
              setEditingId(product._id);
              setForm({
                name: product.name,
                description: product.description || '',
                rules: product.rules || '',
                terms: product.terms || '',
                image: product.image || '',
                source: product.source,
                product_type: product.product_type || 'plan',
                product_id: product.product_id || '',
                checkout_url: product.checkout_url || '',
                affiliate_enabled: !!product.affiliate_enabled,
                show_in_catalog: !!product.show_in_catalog,
                commission_tiers: product.commission_tiers?.length ? product.commission_tiers : emptyForm.commission_tiers,
              });
            }}
            className="bg-white rounded-xl p-4 mb-3"
          >
            <Text className="font-bold">{product.name}</Text>
            <Text className="text-xs text-gray-500">
              {product.source} · {product.affiliate_enabled ? t('Enable affiliation') : ''} · {product.show_in_catalog ? t('Show in catalog') : ''}
            </Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}
