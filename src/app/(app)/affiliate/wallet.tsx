import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import {
  affiliateApi,
  formatMoney,
  type AffiliateProfile,
  type AffiliateSettings,
  type AffiliateWithdrawal,
} from '@/services/affiliate';
import { formatCpfCnpj } from '@/services/checkout';

export default function AffiliateWalletScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { toast } = useToast();
  const [profile, setProfile] = useState<AffiliateProfile | null>(null);
  const [settings, setSettings] = useState<AffiliateSettings | null>(null);
  const [withdrawals, setWithdrawals] = useState<AffiliateWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    pix_key: '',
    full_name: userInfo?.name || '',
    cpf: '',
    bank: '',
  });

  const load = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const response = await affiliateApi.wallet(userInfo.token);
      setProfile(response.data);
      setSettings(response.data.settings);
      setWithdrawals(response.data.withdrawals || []);
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
    load();
  }, [load]);

  const submit = async () => {
    const amount = Number(String(form.amount).replace(',', '.'));
    try {
      setSaving(true);
      await affiliateApi.requestWithdrawal(userInfo?.token, {
        amount,
        pix_key: form.pix_key,
        full_name: form.full_name,
        cpf: form.cpf,
        bank: form.bank,
      });
      toast({ message: t('Withdrawal requested'), variant: 'success' });
      setForm((prev) => ({ ...prev, amount: '', pix_key: '', bank: '' }));
      load();
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error requesting withdrawal'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const wallet = profile?.wallet;
  const canWithdraw = !!settings?.withdrawals_enabled && Number(wallet?.available || 0) >= Number(settings?.min_withdrawal_amount || 0);

  return (
    <ScrollView className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8" contentContainerStyle={{ paddingBottom: 80 }}>
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
        <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
      </TouchableOpacity>
      <Text className="text-2xl font-bold mb-4">{t('Wallet')}</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : (
        <>
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="text-gray-500">{t('Pending balance')}</Text>
            <Text className="text-xl font-bold mb-3">{formatMoney(wallet?.pending)}</Text>
            <Text className="text-gray-500">{t('Available balance')}</Text>
            <Text className="text-xl font-bold mb-3">{formatMoney(wallet?.available)}</Text>
            <Text className="text-gray-500">{t('Withdrawn')}</Text>
            <Text className="text-xl font-bold">{formatMoney(wallet?.withdrawn)}</Text>
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-bold mb-2">{t('Request withdrawal')}</Text>
            <Text className="text-xs text-gray-500 mb-3">
              {t('Minimum withdrawal')}: {formatMoney(settings?.min_withdrawal_amount)}
            </Text>
            <TextInput
              value={form.amount}
              onChangeText={(value) => setForm((prev) => ({ ...prev, amount: value }))}
              placeholder={t('Amount')}
              keyboardType="decimal-pad"
              className="border border-gray-200 rounded-lg px-3 py-2 mb-2"
            />
            <TextInput
              value={form.pix_key}
              onChangeText={(value) => setForm((prev) => ({ ...prev, pix_key: value }))}
              placeholder={t('PIX key')}
              className="border border-gray-200 rounded-lg px-3 py-2 mb-2"
            />
            <TextInput
              value={form.full_name}
              onChangeText={(value) => setForm((prev) => ({ ...prev, full_name: value }))}
              placeholder={t('Full name')}
              className="border border-gray-200 rounded-lg px-3 py-2 mb-2"
            />
            <TextInput
              value={form.cpf}
              onChangeText={(value) => setForm((prev) => ({ ...prev, cpf: formatCpfCnpj(value) }))}
              placeholder={t('CPF')}
              keyboardType="number-pad"
              className="border border-gray-200 rounded-lg px-3 py-2 mb-2"
            />
            <TextInput
              value={form.bank}
              onChangeText={(value) => setForm((prev) => ({ ...prev, bank: value }))}
              placeholder={t('Bank (optional)')}
              className="border border-gray-200 rounded-lg px-3 py-2 mb-3"
            />
            <TouchableOpacity
              onPress={submit}
              disabled={saving || !canWithdraw}
              className="py-3 rounded-lg items-center"
              style={{ backgroundColor: canWithdraw ? colors.primary[500] : colors.gray[300] }}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold">{t('Request withdrawal')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text className="font-bold mb-2">{t('Withdrawals')}</Text>
          {withdrawals.length === 0 ? (
            <Text className="text-gray-500">{t('No withdrawals yet')}</Text>
          ) : (
            withdrawals.map((item) => (
              <View key={item._id} className="bg-white rounded-xl p-4 mb-3">
                <Text className="font-bold">{formatMoney(item.amount)}</Text>
                <Text className="text-xs text-gray-500 mt-1">
                  {item.status === 'processing'
                    ? t('Processing')
                    : item.status === 'paid'
                      ? t('Paid')
                      : t('Rejected')}
                </Text>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}
