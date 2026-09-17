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
import { adminProfileApi, type ProfileMission } from '@/services/profile';
import { uploadImageToFirebase } from '@/utils/uploadImage';

type Completer = {
  user_id: string;
  name: string;
  email: string;
  coins_awarded?: number;
  completed_at?: string | null;
};

export default function AdminMissionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { roles } = useHasRole();
  const { toast } = useToast();
  const isAdmin = roles.includes('admin');
  const [missions, setMissions] = useState<ProfileMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completers, setCompleters] = useState<Completer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    coins: '',
    image: '',
    type: 'manual' as 'manual' | 'streak',
    required_streak: '',
  });

  const load = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const response = await adminProfileApi.missions(userInfo.token);
      setMissions(response.data.missions || []);
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error loading missions'),
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
        `missions/${Date.now()}`,
      );
      setForm((prev) => ({ ...prev, image: url }));
    } catch {
      toast({ message: t('Error updating profile'), variant: 'destructive' });
    }
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast({ message: t('Mission title is required'), variant: 'destructive' });
      return;
    }
    const coins = parseInt(form.coins, 10);
    if (Number.isNaN(coins) || coins < 0) {
      toast({ message: t('Enter a valid coin amount'), variant: 'destructive' });
      return;
    }
    let requiredStreak: number | undefined;
    if (form.type === 'streak') {
      requiredStreak = parseInt(form.required_streak, 10);
      if (Number.isNaN(requiredStreak) || requiredStreak < 1) {
        toast({ message: t('Enter streak days'), variant: 'destructive' });
        return;
      }
    }
    try {
      setSaving(true);
      await adminProfileApi.createMission(userInfo?.token, {
        title: form.title.trim(),
        description: form.description,
        coins,
        image: form.image || null,
        type: form.type,
        required_streak: requiredStreak,
      });
      toast({ message: t('Mission saved'), variant: 'success' });
      setForm({ title: '', description: '', coins: '', image: '', type: 'manual', required_streak: '' });
      load();
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error saving mission'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (mission: ProfileMission) => {
    await adminProfileApi.updateMission(userInfo?.token, mission._id, {
      is_active: !mission.is_active,
    });
    load();
  };

  const showCompleters = async (id: string) => {
    const response = await adminProfileApi.missionUsers(userInfo?.token, id);
    setSelectedId(id);
    setCompleters(response.data.users || []);
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
      <Text className="text-2xl font-bold mb-4">{t('Missions')}</Text>
      <View className="bg-white rounded-xl p-4 mb-4">
        <TextInput
          className="border border-gray-200 rounded-lg px-3 py-2 mb-2"
          placeholder={t('Title')}
          value={form.title}
          onChangeText={(value) => setForm((prev) => ({ ...prev, title: value }))}
        />
        <TextInput
          className="border border-gray-200 rounded-lg px-3 py-2 mb-2"
          placeholder={t('Description')}
          value={form.description}
          onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
        />
        <TextInput
          className="border border-gray-200 rounded-lg px-3 py-2 mb-2"
          placeholder={t('Coins')}
          keyboardType="numeric"
          value={form.coins}
          onChangeText={(value) => setForm((prev) => ({ ...prev, coins: value }))}
        />
        <View className="flex-row mb-2">
          {(['manual', 'streak'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => setForm((prev) => ({ ...prev, type }))}
              className="px-3 py-1 rounded-full mr-2"
              style={{
                backgroundColor: form.type === type ? colors.primary[500] : colors.gray[200],
              }}
            >
              <Text style={{ color: form.type === type ? '#fff' : colors.gray[800] }}>
                {type === 'streak' ? t('Streak mission') : t('Manual mission')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {form.type === 'streak' && (
          <TextInput
            className="border border-gray-200 rounded-lg px-3 py-2 mb-2"
            placeholder={t('Days in a row')}
            keyboardType="numeric"
            value={form.required_streak}
            onChangeText={(value) => setForm((prev) => ({ ...prev, required_streak: value }))}
          />
        )}
        <TouchableOpacity onPress={pickImage} className="mb-3">
          {form.image ? (
            <Image source={{ uri: form.image }} className="w-16 h-16 rounded-lg" />
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
            <Text className="text-white">{t('Create mission')}</Text>
          )}
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : (
        missions.map((mission) => (
          <View key={mission._id} className="bg-white rounded-xl p-4 mb-3">
            <View className="flex-row items-center">
              {mission.image ? (
                <Image source={{ uri: mission.image }} className="w-10 h-10 rounded-lg mr-3" />
              ) : null}
              <View className="flex-1">
                <Text className="font-semibold">{mission.title}</Text>
                {!!mission.description && (
                  <Text style={{ color: colors.gray[500] }}>{mission.description}</Text>
                )}
                <Text style={{ color: colors.gray[500] }}>
                  {mission.coins} {t('coins')} · {mission.completers_count || 0} {t('users')} ·{' '}
                  {(mission.type || 'manual') === 'streak'
                    ? `${t('Streak mission')} (${mission.required_streak || 0})`
                    : t('Manual mission')}
                  {' · '}
                  {mission.is_active === false ? t('Inactive') : t('Active')}
                </Text>
              </View>
            </View>
            <View className="flex-row mt-2">
              <TouchableOpacity onPress={() => toggle(mission)} className="mr-4">
                <Text style={{ color: colors.primary[500] }}>
                  {mission.is_active === false ? t('Activate') : t('Deactivate')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => showCompleters(mission._id)}>
                <Text>{t('Users who completed')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
      {selectedId && (
        <View className="bg-white rounded-xl p-4">
          <Text className="font-semibold mb-2">{t('Users who completed')}</Text>
          {completers.length === 0 ? (
            <Text className="text-gray-400">{t('No users found')}</Text>
          ) : (
            completers.map((user) => (
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
                <Text className="text-xs text-gray-500">
                  {user.email} · +{user.coins_awarded || 0} {t('coins')}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}
