import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { useToast } from '@/components/Toast';
import { adminAffiliateApi, type AffiliateSettings } from '@/services/affiliate';

export default function AdminAffiliateSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { roles } = useHasRole();
  const { toast } = useToast();
  const isAdmin = roles.includes('admin');
  const [settings, setSettings] = useState<AffiliateSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const response = await adminAffiliateApi.settings(userInfo.token);
      setSettings(response.data);
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

  const save = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      await adminAffiliateApi.updateSettings(userInfo?.token, settings);
      toast({ message: t('Settings saved'), variant: 'success' });
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
      <Text className="text-2xl font-bold mb-4">{t('Withdrawal settings')}</Text>
      {loading || !settings ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : (
        <View className="bg-white rounded-xl p-4">
          <Text className="mb-1">{t('Minimum withdrawal amount')}</Text>
          <TextInput
            value={String(settings.min_withdrawal_amount)}
            onChangeText={(value) =>
              setSettings((prev) => prev && { ...prev, min_withdrawal_amount: Number(value.replace(',', '.') || 0) })
            }
            keyboardType="decimal-pad"
            className="border border-gray-200 rounded-lg px-3 py-2 mb-3"
          />
          <View className="flex-row items-center justify-between mb-4">
            <Text>{t('Withdrawals enabled')}</Text>
            <Switch
              value={settings.withdrawals_enabled}
              onValueChange={(withdrawals_enabled) =>
                setSettings((prev) => prev && { ...prev, withdrawals_enabled })
              }
            />
          </View>
          <TouchableOpacity onPress={save} disabled={saving} className="py-2.5 rounded-lg items-center" style={{ backgroundColor: colors.primary[500] }}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">{t('Save')}</Text>}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
