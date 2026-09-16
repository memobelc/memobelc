import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as yup from 'yup';

import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { useToast } from '@/components/Toast';
import SettingsForm from '@/components/admin/SettingsForm';
import { systemSettingsApi, type SystemSetting } from '@/services/systemSettings';

function canManageSettings(roles: string[]) {
  return roles.includes('admin') || roles.includes('super_admin');
}

export default function AdminSystemSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { roles } = useHasRole();
  const { toast } = useToast();
  const isAdmin = canManageSettings(roles);

  const [items, setItems] = useState<SystemSetting[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const validationSchema = useMemo(
    () =>
      yup.object({
        GENAI_API_KEY: yup.string().trim(),
        GENAI_MODEL: yup.string().trim().required(t('This field is required')),
        ASAAS_API_KEY: yup.string().trim(),
        ASAAS_API_URL: yup
          .string()
          .trim()
          .test('url', t('Invalid URL'), (value) => {
            if (!value) return true;
            try {
              const parsed = new URL(value);
              return parsed.protocol === 'http:' || parsed.protocol === 'https:';
            } catch {
              return false;
            }
          }),
        ASAAS_WEBHOOK_TOKEN: yup.string().trim(),
        MAIL_SERVER: yup.string().trim().required(t('This field is required')),
        MAIL_PORT: yup
          .string()
          .trim()
          .required(t('This field is required'))
          .test('port', t('Invalid port'), (value) => {
            const port = Number(value);
            return Number.isInteger(port) && port >= 1 && port <= 65535;
          }),
        MAIL_USERNAME: yup.string().trim().required(t('This field is required')),
        MAIL_PASSWORD: yup.string(),
        MAIL_DEFAULT_SENDER: yup
          .string()
          .trim()
          .required(t('This field is required'))
          .email(t('Invalid email address')),
      }),
    [t],
  );

  const load = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const response = await systemSettingsApi.list(userInfo.token);
      const settings = response.data.settings || [];
      setItems(settings);
      setValues(Object.fromEntries(settings.map((item) => [item.key, item.value ?? ''])));
      setErrors({});
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error loading settings'),
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
    try {
      setSaving(true);
      await validationSchema.validate(values, { abortEarly: false });
      setErrors({});
      const response = await systemSettingsApi.update(userInfo?.token, values);
      const settings = response.data.settings || [];
      setItems(settings);
      setValues(Object.fromEntries(settings.map((item) => [item.key, item.value ?? ''])));
      toast({ message: t('Settings saved'), variant: 'success' });
    } catch (error: any) {
      if (error instanceof yup.ValidationError) {
        const nextErrors: Record<string, string> = {};
        error.inner.forEach((item) => {
          if (item.path && !nextErrors[item.path]) {
            nextErrors[item.path] = item.message;
          }
        });
        setErrors(nextErrors);
      } else {
        toast({
          message: error.response?.data?.error || t('Error saving settings'),
          variant: 'destructive',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <ScrollView
      className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8"
      contentContainerStyle={{ paddingBottom: 80 }}
    >
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
        <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
      </TouchableOpacity>
      <Text className="text-2xl font-bold mb-4">{t('System settings')}</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : (
        <SettingsForm
          items={items}
          values={values}
          errors={errors}
          saving={saving}
          onChange={(key, value) => {
            setValues((prev) => ({ ...prev, [key]: value }));
            setErrors((prev) => {
              if (!prev[key]) return prev;
              const next = { ...prev };
              delete next[key];
              return next;
            });
          }}
          onSave={save}
        />
      )}
    </ScrollView>
  );
}
