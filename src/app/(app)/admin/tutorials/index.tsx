import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { useToast } from '@/components/Toast';
import StatusBadge from '@/components/admin/StatusBadge';
import {
  adminTutorialsApi,
  type Tutorial,
  type TutorialAnalytics,
  type TutorialStep,
  type TutorialAudienceType,
  type TutorialSection,
  type BrainAvatar,
} from '@/services/tutorials';
import BrainAvatarSelect from '@/components/atoms/BrainAvatarSelect';
import AdminBrainAvatars from '@/components/admin/AdminBrainAvatars';
import AdminUserMultiSelect from '@/components/admin/AdminUserMultiSelect';
import HighlightAreaPicker from '@/components/admin/HighlightAreaPicker';
import { PickerSelect } from '@/components/atoms/PickerSelect';
import { TUTORIAL_SECTIONS } from '@/constants/brain';

const AUDIENCE_TYPES: TutorialAudienceType[] = [
  'all',
  'new_users',
  'premium',
  'free',
  'specific_users',
  'roles',
];
const AUDIENCE_ROLES = ['user', 'teacher', 'admin', 'affiliate'];

const emptyStep = (order: number): TutorialStep => ({
  id: `step-${order}`,
  order,
  title: '',
  body: '',
  tip: '',
  icon: 'school',
  brain_expression: 'explaining',
  target_key: '',
  highlight_rect: null,
  tooltip_placement: 'bottom',
  required_highlight: true,
  interaction: 'next',
  tap_label: '',
});

function i18nText(value: any) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.en || value.pt_br || Object.values(value)[0] || '';
}

function audienceLabel(type: TutorialAudienceType, t: (key: string) => string) {
  if (type === 'new_users') return t('New users');
  if (type === 'premium') return t('Premium users');
  if (type === 'free') return t('Free users');
  if (type === 'specific_users') return t('Selected users');
  if (type === 'roles') return t('By role');
  return t('All users');
}

function sectionLabel(section: TutorialSection, t: (key: string) => string) {
  if (section === 'books') return t('Books');
  if (section === 'videos') return t('Videos');
  if (section === 'collections') return t('Collections');
  if (section === 'talk_to_me') return t('Talk to me');
  if (section === 'classrooms') return t('Classrooms');
  if (section === 'courses') return t('Courses');
  if (section === 'plans') return t('Plans');
  return t('Home');
}

function roleLabel(role: string, t: (key: string) => string) {
  if (role === 'admin') return t('Admin');
  if (role === 'teacher') return t('Teacher');
  if (role === 'affiliate') return t('Affiliate');
  return t('User');
}

export default function AdminTutorialsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { roles } = useHasRole();
  const { toast } = useToast();
  const isAdmin = roles.includes('admin');
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [avatars, setAvatars] = useState<BrainAvatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Tutorial | null>(null);
  const [analytics, setAnalytics] = useState<TutorialAnalytics | null>(null);
  const [form, setForm] = useState({
    key: 'onboarding',
    name: '',
    description: '',
    audienceType: 'all' as TutorialAudienceType,
    userIds: [] as string[],
    roles: [] as string[],
    newUserDays: '14',
    section: 'home' as TutorialSection,
    steps: [emptyStep(1)] as TutorialStep[],
  });

  const load = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const [listRes, avatarRes] = await Promise.all([
        adminTutorialsApi.list(userInfo.token),
        adminTutorialsApi.listAvatars(userInfo.token),
      ]);
      setTutorials(listRes.data.tutorials || []);
      setAvatars(avatarRes.data.avatars || []);
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error loading tutorials'),
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

  const startCreate = () => {
    setEditing(null);
    setAnalytics(null);
    setForm({
      key: 'onboarding',
      name: '',
      description: '',
      audienceType: 'all',
      userIds: [],
      roles: [],
      newUserDays: '14',
      section: 'home',
      steps: [emptyStep(1)],
    });
  };

  const startEdit = (item: Tutorial) => {
    setEditing(item);
    setAnalytics(null);
    setForm({
      key: item.key,
      name: i18nText(item.name),
      description: i18nText(item.description),
      audienceType: item.audience?.type || 'all',
      userIds: item.audience?.user_ids || [],
      roles: item.audience?.roles || [],
      newUserDays: String(item.audience?.new_user_days || 14),
      section: (item.section || 'home') as TutorialSection,
      steps: (item.steps || []).map((step, index) => ({
        ...emptyStep(index + 1),
        ...step,
        title: i18nText(step.title_i18n || step.title),
        body: i18nText(step.body_i18n || step.body),
        tip: i18nText(step.tip_i18n || step.tip),
        tap_label: i18nText(step.tap_label_i18n || step.tap_label),
      })),
    });
  };

  const payload = () => ({
    key: form.key,
    name: form.name,
    description: form.description,
    section: form.section,
    audience: {
      type: form.audienceType,
      user_ids: form.userIds,
      roles: form.roles,
      new_user_days: Number(form.newUserDays) || 14,
    },
    steps: form.steps.map((step, index) => ({
      ...step,
      order: index + 1,
      title: step.title,
      body: step.body,
      tip: step.tip,
      interaction: step.interaction || 'next',
      tap_label: step.tap_label || '',
    })),
  });

  const save = async () => {
    if (!userInfo?.token) return;
    try {
      setSaving(true);
      if (editing) {
        await adminTutorialsApi.update(userInfo.token, editing._id, payload());
      } else {
        await adminTutorialsApi.create(userInfo.token, payload());
      }
      toast({ message: t('Settings saved'), variant: 'success' });
      startCreate();
      await load();
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error saving tutorial'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const publish = async (id: string) => {
    if (!userInfo?.token) return;
    try {
      await adminTutorialsApi.publish(userInfo.token, id);
      toast({ message: t('Tutorial published'), variant: 'success' });
      await load();
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error publishing tutorial'),
        variant: 'destructive',
      });
    }
  };

  const deactivate = async (id: string) => {
    if (!userInfo?.token) return;
    try {
      await adminTutorialsApi.deactivate(userInfo.token, id);
      toast({ message: t('Tutorial deactivated'), variant: 'success' });
      await load();
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error deactivating tutorial'),
        variant: 'destructive',
      });
    }
  };

  const duplicate = async (id: string, newVersion: boolean) => {
    if (!userInfo?.token) return;
    try {
      await adminTutorialsApi.duplicate(userInfo.token, id, newVersion);
      await load();
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error duplicating tutorial'),
        variant: 'destructive',
      });
    }
  };

  const loadAnalytics = async (id: string) => {
    if (!userInfo?.token) return;
    try {
      const response = await adminTutorialsApi.analytics(userInfo.token, id);
      setAnalytics(response.data);
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error loading tutorials'),
        variant: 'destructive',
      });
    }
  };

  const updateStep = (index: number, patch: Partial<TutorialStep>) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    }));
  };

  if (!isAdmin) return null;

  return (
    <ScrollView
      className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8"
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
        <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
      </TouchableOpacity>
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-2xl font-bold">{t('Tutorials')}</Text>
        <TouchableOpacity onPress={startCreate}>
          <Text style={{ color: colors.primary[500] }}>{t('Create tutorial')}</Text>
        </TouchableOpacity>
      </View>

      <View className="bg-white rounded-xl p-4 mb-4">
        <Text className="font-bold mb-3" style={{ color: colors.primary[600] }}>
          {editing ? t('Edit tutorial') : t('Create tutorial')}
        </Text>
        <TextInput
          className="border border-gray-200 rounded-xl px-3 py-2 mb-2"
          placeholder={t('Key')}
          value={form.key}
          onChangeText={(key) => setForm((prev) => ({ ...prev, key }))}
        />
        <TextInput
          className="border border-gray-200 rounded-xl px-3 py-2 mb-2"
          placeholder={t('Name')}
          value={form.name}
          onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
        />
        <TextInput
          className="border border-gray-200 rounded-xl px-3 py-2 mb-2"
          placeholder={t('Description')}
          value={form.description}
          onChangeText={(description) => setForm((prev) => ({ ...prev, description }))}
        />
        <PickerSelect
          label="Audience"
          border
          className="w-full mb-2"
          selectedValue={form.audienceType}
          onValueChange={(audienceType) =>
            setForm((prev) => ({ ...prev, audienceType: audienceType as TutorialAudienceType }))
          }
          options={AUDIENCE_TYPES.map((type) => ({
            value: type,
            label: audienceLabel(type, t),
          }))}
        />
        <PickerSelect
          label="Section"
          border
          className="w-full mb-2"
          selectedValue={form.section}
          onValueChange={(section) =>
            setForm((prev) => ({ ...prev, section: section as TutorialSection }))
          }
          options={TUTORIAL_SECTIONS.map((section) => ({
            value: section,
            label: sectionLabel(section, t),
          }))}
        />
        {form.audienceType === 'specific_users' && userInfo?.token ? (
          <AdminUserMultiSelect
            token={userInfo.token}
            selectedIds={form.userIds}
            onChange={(userIds) => setForm((prev) => ({ ...prev, userIds }))}
          />
        ) : null}
        {form.audienceType === 'roles' ? (
          <View className="mb-3">
            {AUDIENCE_ROLES.map((role) => {
              const checked = form.roles.includes(role);
              return (
                <TouchableOpacity
                  key={role}
                  onPress={() =>
                    setForm((prev) => ({
                      ...prev,
                      roles: checked
                        ? prev.roles.filter((item) => item !== role)
                        : [...prev.roles, role],
                    }))
                  }
                  className="flex-row items-center py-2"
                >
                  <Ionicons
                    name={checked ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={colors.primary[500]}
                  />
                  <Text className="ml-2">{roleLabel(role, t)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
        {form.audienceType === 'new_users' ? (
          <TextInput
            className="border border-gray-200 rounded-xl px-3 py-2 mb-3"
            placeholder={t('New user days')}
            keyboardType="numeric"
            value={form.newUserDays}
            onChangeText={(newUserDays) => setForm((prev) => ({ ...prev, newUserDays }))}
          />
        ) : null}
        {form.steps.map((step, index) => (
          <View key={step.id || index} className="border border-gray-100 rounded-xl p-3 mb-3">
            <Text className="font-semibold mb-2">
              {t('Step {{current}} of {{total}}', { current: index + 1, total: form.steps.length })}
            </Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-3 py-2 mb-2"
              placeholder={t('Title')}
              value={String(step.title || '')}
              onChangeText={(title) => updateStep(index, { title })}
            />
            <TextInput
              className="border border-gray-200 rounded-xl px-3 py-2 mb-2"
              placeholder={t('Description')}
              value={String(step.body || '')}
              onChangeText={(body) => updateStep(index, { body })}
              multiline
            />
            <HighlightAreaPicker
              section={form.section}
              targetKey={step.target_key}
              highlightRect={step.highlight_rect}
              onChange={({ target_key, highlight_rect }) =>
                updateStep(index, { target_key: target_key as any, highlight_rect })
              }
            />
            <BrainAvatarSelect
              value={String(step.brain_expression || 'explaining')}
              catalog={avatars}
              onValueChange={(brain_expression) => updateStep(index, { brain_expression })}
            />
            <View className="flex-row items-center justify-between">
              <Text>{t('Required highlight')}</Text>
              <Switch
                value={!!step.required_highlight}
                onValueChange={(required_highlight) => updateStep(index, { required_highlight })}
              />
            </View>
            <View className="flex-row items-center justify-between mt-2">
              <Text>{t('Require tap')}</Text>
              <Switch
                value={step.interaction === 'tap'}
                onValueChange={(requireTap) =>
                  updateStep(index, {
                    interaction: requireTap ? 'tap' : 'next',
                    tap_label: requireTap
                      ? step.tap_label || t('Tap here')
                      : step.tap_label,
                  })
                }
              />
            </View>
            {step.interaction === 'tap' ? (
              <TextInput
                className="border border-gray-200 rounded-xl px-3 py-2 mt-2"
                placeholder={t('Tap here')}
                value={String(step.tap_label || '')}
                onChangeText={(tap_label) => updateStep(index, { tap_label })}
              />
            ) : null}
          </View>
        ))}
        <TouchableOpacity
          onPress={() =>
            setForm((prev) => ({ ...prev, steps: [...prev.steps, emptyStep(prev.steps.length + 1)] }))
          }
          className="mb-3"
        >
          <Text style={{ color: colors.primary[500] }}>{t('Add step')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={save}
          disabled={saving}
          className="py-3 rounded-xl items-center"
          style={{ backgroundColor: colors.primary[500] }}
        >
          {saving ? <ActivityIndicator color="#fff" /> : (
            <Text className="text-white font-bold">{t('Save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : (
        tutorials.map((item) => (
          <View key={item._id} className="bg-white rounded-xl p-4 mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="font-bold flex-1">{i18nText(item.name)} · v{item.version}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text className="text-xs text-gray-500 mb-2">
              {sectionLabel((item.section || 'home') as TutorialSection, t)}
              {i18nText(item.description) ? ` · ${i18nText(item.description)}` : ''}
            </Text>
            <Text className="text-xs text-gray-600 mb-2">
              {t('Users impacted')}: {item.users_impacted || 0} · {t('Completion rate')}: {item.completion_rate || 0}% · {t('Skip rate')}: {item.skip_rate || 0}% · {t('Abandon rate')}: {item.abandon_rate || 0}%
            </Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              <TouchableOpacity onPress={() => startEdit(item)}>
                <Text style={{ color: colors.primary[500] }}>{t('Edit')}</Text>
              </TouchableOpacity>
              {item.status === 'active' ? (
                <TouchableOpacity onPress={() => deactivate(item._id)}>
                  <Text style={{ color: colors.error[600] }}>{t('Deactivate')}</Text>
                </TouchableOpacity>
              ) : item.status !== 'archived' ? (
                <TouchableOpacity onPress={() => publish(item._id)}>
                  <Text style={{ color: colors.primary[500] }}>{t('Publish')}</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={() => duplicate(item._id, true)}>
                <Text style={{ color: colors.primary[500] }}>{t('New version')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => duplicate(item._id, false)}>
                <Text style={{ color: colors.primary[500] }}>{t('Duplicate')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => loadAnalytics(item._id)}>
                <Text style={{ color: colors.primary[500] }}>{t('Analytics')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {analytics ? (
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="font-bold mb-3">{t('Analytics')}</Text>
          <Text className="text-sm mb-1">{t('Views')}: {analytics.views}</Text>
          <Text className="text-sm mb-1">{t('Completion rate')}: {analytics.completion_rate}%</Text>
          <Text className="text-sm mb-1">{t('Skip rate')}: {analytics.skip_rate}%</Text>
          <Text className="text-sm mb-1">{t('Abandon rate')}: {analytics.abandon_rate}%</Text>
          <Text className="text-sm mb-3">
            {t('Average time')}: {Math.round((analytics.avg_time_ms || 0) / 1000)}s
          </Text>
          {(analytics.step_dropoff || []).map((row) => {
            const max = Math.max(...analytics.step_dropoff.map((item) => item.reached || 0), 1);
            return (
              <View key={row.step_id} className="mb-2">
                <Text className="text-xs mb-1">{row.title}</Text>
                <View className="h-3 rounded-full bg-gray-200 overflow-hidden">
                  <View
                    className="h-3 rounded-full"
                    style={{
                      width: `${Math.round((row.reached / max) * 100)}%`,
                      backgroundColor: colors.primary[500],
                    }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {userInfo?.token ? (
        <AdminBrainAvatars
          token={userInfo.token}
          avatars={avatars}
          onChanged={setAvatars}
        />
      ) : null}
    </ScrollView>
  );
}
