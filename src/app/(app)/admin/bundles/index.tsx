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

export default function AdminBundlesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { roles } = useHasRole();
  const { toast } = useToast();
  const isAdmin = roles.includes('admin');
  const [bundles, setBundles] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '', price: '', book_ids: [] as string[], sale_mode: 'both', is_published: true, google_play_product_id: '' });

  const load = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const [bundleRes, bookRes] = await Promise.all([
        billingApi.adminBundles(userInfo.token),
        billingApi.adminBooks(userInfo.token),
      ]);
      setBundles(bundleRes.data.bundles || []);
      setBooks(bookRes.data.books || []);
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error loading bundles'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [userInfo?.token, t]);

  useEffect(() => { if (userInfo && !isAdmin) router.replace('/'); }, [userInfo, isAdmin, router]);
  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const toggleBook = (id: string) => {
    setForm((prev) => ({
      ...prev,
      book_ids: prev.book_ids.includes(id) ? prev.book_ids.filter((item) => item !== id) : [...prev.book_ids, id],
    }));
  };

  const save = async () => {
    try {
      await billingApi.createBundle(userInfo?.token, { ...form, price: parseFloat(form.price || '0') });
      toast({ message: t('Bundle saved'), variant: 'success' });
      setForm({ name: '', description: '', price: '', book_ids: [], sale_mode: 'both', is_published: true, google_play_product_id: '' });
      load();
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error saving bundle'), variant: 'destructive' });
    }
  };

  if (!isAdmin) return null;

  return (
    <ScrollView className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8" contentContainerStyle={{ paddingBottom: 80 }}>
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
        <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
      </TouchableOpacity>
      <Text className="text-2xl font-bold mb-4">{t('Book bundles')}</Text>
      <View className="bg-white rounded-xl p-4 mb-4">
        <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder={t('name')} value={form.name} onChangeText={(name) => setForm((prev) => ({ ...prev, name }))} />
        <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder={t('description')} value={form.description} onChangeText={(description) => setForm((prev) => ({ ...prev, description }))} />
        <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder={t('Price')} value={form.price} onChangeText={(price) => setForm((prev) => ({ ...prev, price }))} />
        <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder={t('Google Play SKU')} value={form.google_play_product_id} onChangeText={(google_play_product_id) => setForm((prev) => ({ ...prev, google_play_product_id }))} />
        <Text className="mb-1">{t('Books')}</Text>
        {books.map((book) => (
          <TouchableOpacity key={book._id} onPress={() => toggleBook(book._id)} className="mb-1">
            <Text>{form.book_ids.includes(book._id) ? '☑' : '☐'} {book.titulo}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={save} className="px-4 py-2 rounded-lg self-start mt-2" style={{ backgroundColor: colors.primary[500] }}>
          <Text className="text-white">{t('Create bundle')}</Text>
        </TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator color={colors.primary[500]} /> : bundles.map((bundle) => (
        <View key={bundle._id} className="bg-white rounded-xl p-4 mb-3">
          <Text className="font-semibold">{bundle.name} · R$ {bundle.price}</Text>
          <Text style={{ color: colors.gray[500] }}>{(bundle.book_ids || []).length} {t('Books')} · {bundle.is_published ? t('Published') : t('Unpublished')}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
