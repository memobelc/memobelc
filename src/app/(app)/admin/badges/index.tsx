import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { useToast } from '@/components/Toast';
import { adminProfileApi, type ProfileBadge } from '@/services/profile';
import { uploadImageToFirebase } from '@/utils/uploadImage';

type Earner = {
  user_id: string;
  name: string;
  email: string;
  awarded_at?: string | null;
};

export default function AdminBadgesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { roles } = useHasRole();
  const { toast } = useToast();
  const isAdmin = roles.includes('admin');
  const [badges, setBadges] = useState<ProfileBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [earners, setEarners] = useState<Earner[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', image: '' });

  const load = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const response = await adminProfileApi.badges(userInfo.token);
      setBadges(response.data.badges || []);
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error loading badges'),
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
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast({
        message: t('Permission denied, You need to allow access to the gallery.'),
        variant: 'destructive',
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    try {
      const url = await uploadImageToFirebase(
        result.assets[0].uri,
        `badges/${Date.now()}`,
      );
      setForm((prev) => ({ ...prev, image: url }));
    } catch {
      toast({ message: t('Error updating profile'), variant: 'destructive' });
    }
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast({ message: t('Badge name is required'), variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      await adminProfileApi.createBadge(userInfo?.token, form);
      toast({ message: t('Badge saved'), variant: 'success' });
      setForm({ name: '', description: '', image: '' });
      load();
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error saving badge'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (badge: ProfileBadge) => {
    await adminProfileApi.updateBadge(userInfo?.token, badge._id, {
      is_active: !badge.is_active,
    });
    load();
  };

  const showEarners = async (id: string) => {
    const response = await adminProfileApi.badgeUsers(userInfo?.token, id);
    setSelectedId(id);
    setEarners(response.data.users || []);
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
      <Text className="text-2xl font-bold mb-4">{t('Badges')}</Text>
      <View className="bg-white rounded-xl p-4 mb-4">
        <TextInput
          className="border border-gray-200 rounded-lg px-3 py-2 mb-2"
          placeholder={t('Name')}
          value={form.name}
          onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
        />
        <TextInput
          className="border border-gray-200 rounded-lg px-3 py-2 mb-2"
          placeholder={t('Description')}
          value={form.description}
          onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
        />
        <TouchableOpacity onPress={pickImage} className="mb-3">
          {form.image ? (
            <Image source={{ uri: form.image }} className="w-16 h-16 rounded-full" />
          ) : (
            <Text style={{ color: colors.primary[500] }}>{t('Add image')}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={save}
          disabled={saving}
          className="px-4 py-2 rounded-lg self-start"
          style={{ backgroundColor: colors.primary[500] }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white">{t('Create badge')}</Text>
          )}
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : (
        badges.map((badge) => (
          <View key={badge._id} className="bg-white rounded-xl p-4 mb-3">
            <View className="flex-row items-center">
              {badge.image ? (
                <Image source={{ uri: badge.image }} className="w-10 h-10 rounded-full mr-3" />
              ) : null}
              <View className="flex-1">
                <Text className="font-semibold">{badge.name}</Text>
                {!!badge.description && (
                  <Text style={{ color: colors.gray[500] }}>{badge.description}</Text>
                )}
                <Text style={{ color: colors.gray[500] }}>
                  {badge.earners_count || 0} {t('users')} ·{' '}
                  {badge.is_active === false ? t('Inactive') : t('Active')}
                </Text>
              </View>
            </View>
            <View className="flex-row mt-2">
              <TouchableOpacity onPress={() => toggle(badge)} className="mr-4">
                <Text style={{ color: colors.primary[500] }}>
                  {badge.is_active === false ? t('Activate') : t('Deactivate')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => showEarners(badge._id)}>
                <Text>{t('Users who earned')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
      {selectedId && (
        <View className="bg-white rounded-xl p-4">
          <Text className="font-semibold mb-2">{t('Users who earned')}</Text>
          {earners.length === 0 ? (
            <Text className="text-gray-400">{t('No users found')}</Text>
          ) : (
            earners.map((user) => (
              <TouchableOpacity
                key={user.user_id}
                onPress={() =>
                  router.push({
                    pathname: '/admin/users/[userId]' as any,
                    params: { userId: user.user_id },
                  })
                }
                className="mb-2"
              >
                <Text className="font-bold">{user.name || t('(sem nome)')}</Text>
                <Text className="text-xs text-gray-500">{user.email}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}
