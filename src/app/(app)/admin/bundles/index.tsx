import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { billingApi } from '@/services/billing';
import { copyText } from '@/services/checkout';
import { formatPlanPrice } from '@/components/molecules/PlanCard';
import StatusBadge from '@/components/admin/StatusBadge';
import AdminDataTable, { type AdminColumn } from '@/components/admin/AdminDataTable';
import AdminConfirmModal from '@/components/admin/AdminConfirmModal';

const emptyForm = {
  name: '',
  description: '',
  price: '',
  book_ids: [] as string[],
  is_published: false,
  checkout_enabled: false,
  affiliate_enabled: false,
};

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
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sort, setSort] = useState('name');

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

  useEffect(() => {
    if (userInfo && !isAdmin) router.replace('/');
  }, [userInfo, isAdmin, router]);
  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const startCreate = () => {
    setEditing({});
    setForm({ ...emptyForm });
  };

  const startEdit = (bundle: any) => {
    setEditing(bundle);
    setForm({
      name: bundle.name || '',
      description: bundle.description || '',
      price: bundle.price != null ? String(bundle.price) : '',
      book_ids: Array.isArray(bundle.book_ids) ? [...bundle.book_ids] : [],
      is_published: !!bundle.is_published,
      checkout_enabled: !!bundle.checkout_enabled,
      affiliate_enabled: !!bundle.affiliate_enabled,
    });
  };

  const toggleBook = (id: string) => {
    setForm((prev) => ({
      ...prev,
      book_ids: prev.book_ids.includes(id)
        ? prev.book_ids.filter((item) => item !== id)
        : [...prev.book_ids, id],
    }));
  };

  const selectAllBooks = () => {
    setForm((prev) => ({ ...prev, book_ids: books.map((book) => book._id) }));
  };

  const clearBookSelection = () => {
    setForm((prev) => ({ ...prev, book_ids: [] }));
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast({ message: t('Name and price are required'), variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        description: form.description,
        price: parseFloat(form.price || '0'),
        book_ids: form.book_ids,
        is_published: form.is_published,
        checkout_enabled: form.affiliate_enabled || form.checkout_enabled,
        affiliate_enabled: form.affiliate_enabled,
      };
      if (editing?._id) {
        await billingApi.updateBundle(userInfo?.token, editing._id, payload);
      } else {
        await billingApi.createBundle(userInfo?.token, payload);
      }
      toast({ message: t('Bundle saved'), variant: 'success' });
      setEditing(null);
      load();
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error saving bundle'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const removeBundle = async () => {
    if (!editing?._id) return;
    try {
      await billingApi.deleteBundle(userInfo?.token, editing._id);
      toast({ message: t('Bundle deleted'), variant: 'success' });
      setDeleteOpen(false);
      setEditing(null);
      load();
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error deleting bundle'),
        variant: 'destructive',
      });
    }
  };

  const bundleCheckoutUrl = (bundle?: any) => {
    if (bundle?.checkout_url) return String(bundle.checkout_url);
    if (!bundle?._id) return '';
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/checkout/${bundle._id}`;
    }
    return `/checkout/${bundle._id}`;
  };

  const handleCopy = async (bundle?: any) => {
    const url = bundleCheckoutUrl(bundle);
    if (!url) return;
    if (bundle?._id && !bundle.checkout_enabled) {
      try {
        const res = await billingApi.updateBundle(userInfo?.token, bundle._id, { checkout_enabled: true });
        const next = { ...bundle, ...res.data, checkout_enabled: true };
        setBundles((prev) => prev.map((item) => (item._id === bundle._id ? { ...item, ...next } : item)));
        if (editing?._id === bundle._id) {
          setEditing(next);
          setForm((prev) => ({ ...prev, checkout_enabled: true }));
        }
      } catch (error: any) {
        toast({
          message: error.response?.data?.error || t('Error saving bundle'),
          variant: 'destructive',
        });
        return;
      }
    }
    try {
      const copied = await copyText(url);
      toast({
        message: copied ? t('Checkout link copied') : url,
        variant: copied ? 'success' : 'destructive',
      });
    } catch {
      toast({ message: url, variant: 'destructive' });
    }
  };

  const sortedBundles = [...bundles].sort((a, b) => {
    const dir = sort.startsWith('-') ? -1 : 1;
    const key = sort.replace(/^-/, '');
    const valueOf = (row: any) => {
      if (key === 'name') return row.name || '';
      if (key === 'book_ids') return (row.book_ids || []).length;
      if (key === 'is_published' || key === 'checkout_enabled' || key === 'affiliate_enabled') {
        return row[key] ? 1 : 0;
      }
      return Number(row[key] || 0);
    };
    const av = valueOf(a);
    const bv = valueOf(b);
    if (typeof av === 'string') return av.localeCompare(bv as string) * dir;
    return ((av as number) - (bv as number)) * dir;
  });

  const allSelected = books.length > 0 && books.every((book) => form.book_ids.includes(book._id));

  const columns: AdminColumn<any>[] = [
    { key: 'name', label: t('name'), sortable: true, render: (row) => <Text className="font-semibold">{row.name}</Text> },
    { key: 'price', label: t('Price'), sortable: true, render: (row) => <Text>{formatPlanPrice(Number(row.price) || 0)}</Text> },
    {
      key: 'book_ids',
      label: t('Books'),
      sortable: true,
      render: (row) => <Text>{(row.book_ids || []).length}</Text>,
    },
    {
      key: 'is_published',
      label: t('Show in Go Premium'),
      render: (row) => <StatusBadge status={row.is_published ? 'active' : 'inactive'} />,
    },
    {
      key: 'checkout_enabled',
      label: t('External checkout'),
      render: (row) => <Text>{row.checkout_enabled ? t('Active') : t('Inactive')}</Text>,
    },
    {
      key: 'affiliate_enabled',
      label: t('Enable affiliation'),
      render: (row) => <Text>{row.affiliate_enabled ? t('Active') : t('Inactive')}</Text>,
    },
    {
      key: 'actions',
      label: t('Actions'),
      render: (row) => (
        <View className="flex-row flex-wrap">
          {row._id ? (
            <Pressable
              onPress={() => handleCopy(row)}
              accessibilityRole="button"
              accessibilityLabel={t('Copy link')}
              style={{ minHeight: 44, justifyContent: 'center', marginRight: 12 }}
            >
              <Text style={{ color: colors.primary[600] }}>{t('Copy checkout link')}</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => startEdit(row)}
            accessibilityRole="button"
            accessibilityLabel={t('Edit bundle')}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={{ color: colors.gray[800] }}>{t('Edit bundle')}</Text>
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
        <Pressable onPress={startCreate} accessibilityRole="button" accessibilityLabel={t('New bundle')} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.primary[500], justifyContent: 'center' }}>
          <Text className="text-white font-semibold">{t('New bundle')}</Text>
        </Pressable>
      </View>
      <Text className="text-2xl font-bold mb-4" style={{ color: colors.gray[900] }}>{t('Book bundles')}</Text>
      {loading && bundles.length === 0 ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : (
        <AdminDataTable
          columns={columns}
          rows={sortedBundles}
          loading={loading}
          emptyLabel={t('No bundles found')}
          sort={sort}
          onSort={(key) => setSort((prev) => (prev === key ? `-${key}` : prev === `-${key}` ? key : `-${key}`))}
        />
      )}

      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <Pressable className="flex-1 bg-black/50 items-center justify-center px-4" onPress={() => setEditing(null)}>
          <Pressable className="w-full max-w-2xl bg-white rounded-2xl p-5" style={{ maxHeight: '88%' }} onPress={(event) => event.stopPropagation?.()}>
            <ScrollView>
              <Text className="font-semibold text-lg mb-3">{editing?._id ? t('Edit bundle') : t('New bundle')}</Text>
              <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder={t('name')} value={form.name} onChangeText={(name) => setForm((prev) => ({ ...prev, name }))} style={{ minHeight: 44 }} />
              <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder={t('description')} value={form.description} onChangeText={(description) => setForm((prev) => ({ ...prev, description }))} style={{ minHeight: 44 }} />
              <TextInput className="border border-gray-200 rounded-lg px-3 py-2 mb-2" placeholder={t('Price')} keyboardType="decimal-pad" value={form.price} onChangeText={(price) => setForm((prev) => ({ ...prev, price }))} style={{ minHeight: 44 }} />
              <View className="flex-row items-center justify-between mb-2">
                <Text>{t('Books')}</Text>
                <Pressable
                  onPress={allSelected ? clearBookSelection : selectAllBooks}
                  accessibilityRole="button"
                  accessibilityLabel={allSelected ? t('Clear selection') : t('Select all')}
                  style={{ minHeight: 44, justifyContent: 'center' }}
                >
                  <Text style={{ color: colors.primary[500] }}>{allSelected ? t('Clear selection') : t('Select all')}</Text>
                </Pressable>
              </View>
              {books.map((book) => (
                <Pressable
                  key={book._id}
                  onPress={() => toggleBook(book._id)}
                  accessibilityRole="button"
                  accessibilityLabel={book.titulo}
                  style={{ minHeight: 44, justifyContent: 'center' }}
                >
                  <Text>{form.book_ids.includes(book._id) ? '☑' : '☐'} {book.titulo}</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setForm((prev) => ({ ...prev, is_published: !prev.is_published }))}
                accessibilityRole="button"
                accessibilityLabel={t('Show in Go Premium')}
                style={{ minHeight: 44, justifyContent: 'center', marginTop: 8 }}
              >
                <Text>{form.is_published ? '☑' : '☐'} {t('Show in Go Premium')}</Text>
              </Pressable>
              <Pressable
                onPress={() => setForm((prev) => ({
                  ...prev,
                  checkout_enabled: prev.affiliate_enabled ? true : !prev.checkout_enabled,
                }))}
                accessibilityRole="button"
                accessibilityLabel={t('External checkout')}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text>{(form.affiliate_enabled || form.checkout_enabled) ? '☑' : '☐'} {t('External checkout')}</Text>
              </Pressable>
              <Pressable
                onPress={() => setForm((prev) => {
                  const affiliate_enabled = !prev.affiliate_enabled;
                  return {
                    ...prev,
                    affiliate_enabled,
                    checkout_enabled: affiliate_enabled ? true : prev.checkout_enabled,
                  };
                })}
                accessibilityRole="button"
                accessibilityLabel={t('Enable affiliation')}
                style={{ minHeight: 44, justifyContent: 'center', marginBottom: 8 }}
              >
                <Text>{form.affiliate_enabled ? '☑' : '☐'} {t('Enable affiliation')}</Text>
              </Pressable>
              {editing?._id ? (
                <View className="mb-3 p-3 rounded-xl" style={{ backgroundColor: colors.gray[50] }}>
                  <Text className="text-xs mb-1" style={{ color: colors.gray[500] }}>{t('Checkout link')}</Text>
                  <Text className="text-xs mb-2" selectable style={{ color: colors.gray[700] }}>
                    {bundleCheckoutUrl({ ...editing, checkout_enabled: form.checkout_enabled })}
                  </Text>
                  <Pressable
                    onPress={() => handleCopy({ ...editing, checkout_enabled: form.checkout_enabled })}
                    accessibilityRole="button"
                    accessibilityLabel={t('Copy checkout link')}
                    style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignSelf: 'flex-start' }}
                  >
                    <Text style={{ color: colors.primary[500], fontWeight: '600' }}>{t('Copy checkout link')}</Text>
                  </Pressable>
                </View>
              ) : null}
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

      <AdminConfirmModal
        open={deleteOpen}
        title={t('Delete bundle')}
        message={t('Are you sure you want to delete this bundle? This action cannot be undone.')}
        confirmLabel={t('Delete')}
        destructive
        onCancel={() => setDeleteOpen(false)}
        onConfirm={removeBundle}
      />
    </ScrollView>
  );
}
