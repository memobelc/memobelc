import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { useToast } from '@/components/Toast';
import { billingApi } from '@/services/billing';
import { useEntitlements } from '@/contexts/EntitlementContext';

const ACTIONS = ['allow', 'disabled', 'disabled_upgrade', 'hide'] as const;

function normalizeAction(action?: string) {
  if (action === 'redirect_plans') return 'disabled_upgrade';
  if (ACTIONS.includes(action as (typeof ACTIONS)[number])) return action as (typeof ACTIONS)[number];
  return 'allow';
}

export default function AdminAccessScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { roles } = useHasRole();
  const { toast } = useToast();
  const { refresh } = useEntitlements();
  const isAdmin = roles.includes('admin');
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const res = await billingApi.accessRules(userInfo.token);
      setRules(res.data.rules || []);
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error loading access rules'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [userInfo?.token, t]);

  useEffect(() => { if (userInfo && !isAdmin) router.replace('/'); }, [userInfo, isAdmin, router]);
  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const updateAction = async (serviceKey: string, action: string) => {
    try {
      await billingApi.updateAccess(userInfo?.token, serviceKey, {
        rules: [{ audience: 'everyone', action, plan_ids: [] }],
      });
      await Promise.all([load(), refresh()]);
    } catch (error: any) {
      toast({ message: error.response?.data?.error || t('Error saving access rules'), variant: 'destructive' });
    }
  };

  if (!isAdmin) return null;

  return (
    <ScrollView className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8" contentContainerStyle={{ paddingBottom: 80 }}>
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
        <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
      </TouchableOpacity>
      <Text className="text-2xl font-bold mb-2">{t('Service access')}</Text>
      <Text className="mb-4" style={{ color: colors.gray[600] }}>{t('Service access description')}</Text>
      {loading ? <ActivityIndicator color={colors.primary[500]} /> : rules.map((rule) => {
        const everyone = (rule.rules || []).find((item: any) => (item.audience || 'everyone') === 'everyone');
        const first = everyone || (rule.rules || [{}])[0] || {};
        const current = normalizeAction(first.action);
        return (
          <View key={rule.service_key} className="bg-white rounded-xl p-4 mb-3">
            <Text className="font-semibold mb-2">{t(rule.service_key)}</Text>
            <Text className="mb-1">{t('Visibility')}</Text>
            <View className="flex-row flex-wrap">
              {ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action}
                  onPress={() => updateAction(rule.service_key, action)}
                  className="px-2 py-1 rounded-full mr-2 mb-2"
                  style={{ backgroundColor: current === action ? colors.primary[500] : colors.gray[200] }}
                >
                  <Text style={{ color: current === action ? '#fff' : colors.gray[800], fontSize: 12 }}>{t(action)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text className="mt-1" style={{ color: colors.gray[500], fontSize: 12 }}>
              {t(`access_mode_help_${current}`)}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
