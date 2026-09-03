import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { useToast } from '@/components/Toast';
import {
  notificationsApi,
  type NotificationServiceKey,
  type NotificationSettings,
  type ServicePreference,
} from '@/services/notifications';

const USER_SERVICES: { key: NotificationServiceKey; title: string; description: string }[] = [
  {
    key: 'daily_study',
    title: 'Daily study reminders',
    description: 'Receive a daily notification to help you stay on track with your studies.',
  },
  {
    key: 'classroom_added',
    title: 'Classroom updates',
    description: 'When you are added to a classroom.',
  },
  {
    key: 'new_cards',
    title: 'New cards',
    description: 'When new study cards are added to your decks.',
  },
  {
    key: 'teacher_custom',
    title: 'Teacher messages',
    description: 'Messages sent by your teacher.',
  },
  {
    key: 'admin_custom',
    title: 'Admin announcements',
    description: 'Announcements from Memobelc.',
  },
  {
    key: 'support',
    title: 'Support replies',
    description: 'When support replies to your messages.',
  },
];

const ADMIN_SERVICES: { key: NotificationServiceKey; title: string; description: string }[] = [
  {
    key: 'affiliate',
    title: 'Affiliate updates',
    description: 'Applications, withdrawals and affiliate events.',
  },
];

const AFFILIATE_SERVICES: { key: NotificationServiceKey; title: string; description: string }[] = [
  {
    key: 'affiliate_sales',
    title: 'Affiliate sales',
    description: 'When someone buys through your affiliate link. Commission starts as pending balance.',
  },
];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { roles } = useHasRole();
  const { toast } = useToast();
  const isAdmin = roles.includes('admin');
  const isAffiliate = roles.includes('affiliate');

  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const services = useMemo(() => {
    const list = [...USER_SERVICES];
    if (isAffiliate) list.push(...AFFILIATE_SERVICES);
    if (isAdmin) list.push(...ADMIN_SERVICES);
    return list;
  }, [isAdmin, isAffiliate]);

  const load = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const response = await notificationsApi.getSettings(userInfo.token);
      setSettings(response.data);
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error loading notification settings'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [userInfo?.token, t]);

  useEffect(() => {
    load();
  }, [load]);

  const updatePref = (key: NotificationServiceKey, patch: Partial<ServicePreference>) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const current = prev.services[key] || { enabled: true, email: false };
      const next = { ...current, ...patch };
      if (!next.enabled) next.email = false;
      return {
        ...prev,
        services: { ...prev.services, [key]: next },
      };
    });
  };

  const save = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      const response = await notificationsApi.updateSettings(userInfo?.token, {
        services: settings.services,
      });
      setSettings(response.data);
      toast({ message: t('Settings saved'), variant: 'success' });
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error saving notification settings'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8"
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
        <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
      </TouchableOpacity>
      <Text className="text-2xl font-bold mb-1">{t('Settings')}</Text>
      <Text className="text-sm text-gray-500 mb-5">
        {t('Choose which notifications to receive in the app and also by email.')}
      </Text>

      {loading || !settings ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : (
        <>
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="text-lg font-bold mb-1" style={{ color: colors.primary[600] }}>
              {t('Notification settings')}
            </Text>
            <Text className="text-xs text-gray-500 mb-4">
              {t('Email notifications are sent to')} {userInfo?.email}
            </Text>
            {services.map((service, index) => {
              const pref = settings.services[service.key] || { enabled: true, email: false };
              return (
                <View
                  key={service.key}
                  className="py-3"
                  style={
                    index < services.length - 1
                      ? { borderBottomWidth: 1, borderBottomColor: colors.gray[200] }
                      : undefined
                  }
                >
                  <Text className="font-bold" style={{ color: colors.primary[700] }}>
                    {t(service.title)}
                  </Text>
                  <Text className="text-xs text-gray-500 mb-3">{t(service.description)}</Text>
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-sm" style={{ color: colors.gray[700] }}>
                      {t('Receive in the app')}
                    </Text>
                    <Switch
                      value={pref.enabled}
                      onValueChange={(enabled) => updatePref(service.key, { enabled })}
                      trackColor={{ false: colors.gray[300], true: colors.primary[300] }}
                      thumbColor={pref.enabled ? colors.primary[500] : colors.gray[100]}
                    />
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="text-sm"
                      style={{ color: pref.enabled ? colors.gray[700] : colors.gray[400] }}
                    >
                      {t('Also receive by email')}
                    </Text>
                    <Switch
                      value={pref.email}
                      disabled={!pref.enabled}
                      onValueChange={(email) => updatePref(service.key, { email })}
                      trackColor={{ false: colors.gray[300], true: colors.primary[300] }}
                      thumbColor={pref.email ? colors.primary[500] : colors.gray[100]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
          <TouchableOpacity
            onPress={save}
            disabled={saving}
            className="py-3 rounded-xl items-center"
            style={{ backgroundColor: colors.primary[500] }}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold">{t('Save')}</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}
