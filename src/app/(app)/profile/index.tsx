import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { formatCpfCnpj } from '@/services/checkout';
import {
  emptyAddress,
  profileApi,
  type ProfileMission,
  type UserAddress,
  type UserProfile,
} from '@/services/profile';
import { uploadImageToFirebase } from '@/utils/uploadImage';

function formatCep(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo, updateUserInfo } = useSession();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [address, setAddress] = useState<UserAddress>(emptyAddress());

  const applyProfile = useCallback(
    (data: UserProfile) => {
      setProfile(data);
      setName(data.name || '');
      setCpf(data.cpf_cnpj ? formatCpfCnpj(data.cpf_cnpj) : '');
      setAddress({ ...emptyAddress(), ...(data.address || {}) });
      updateUserInfo({
        name: data.name,
        image: data.image || undefined,
        cpf_cnpj: data.cpf_cnpj || undefined,
        coins: data.coins ?? 0,
        address: data.address,
      });
    },
    [updateUserInfo],
  );

  const load = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const response = await profileApi.me(userInfo.token);
      applyProfile(response.data);
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error loading profile'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [userInfo?.token, applyProfile, t]);

  useEffect(() => {
    load();
  }, [load]);

  const pickPhoto = async () => {
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
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]?.uri || !userInfo?.user_id) return;
    try {
      setUploading(true);
      const url = await uploadImageToFirebase(
        result.assets[0].uri,
        `avatars/${userInfo.user_id}/${Date.now()}`,
      );
      const response = await profileApi.updateMe(userInfo.token, { image: url });
      applyProfile(response.data);
      toast({ message: t('Profile photo updated'), variant: 'success' });
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error updating profile'),
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ message: t('Name is required'), variant: 'destructive' });
      return;
    }
    const digits = cpf.replace(/\D/g, '');
    if (digits && !digits.match(/^(\d{11}|\d{14})$/)) {
      toast({ message: t('Enter a valid CPF or CNPJ'), variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      const response = await profileApi.updateMe(userInfo?.token, {
        name: trimmed,
        cpf_cnpj: digits || null,
        address: {
          ...address,
          postal_code: address.postal_code.replace(/\D/g, ''),
          state: address.state.toUpperCase().slice(0, 2),
        },
      });
      applyProfile(response.data);
      toast({ message: t('Profile saved'), variant: 'success' });
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error updating profile'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const completeMission = async (mission: ProfileMission) => {
    try {
      setCompletingId(mission._id);
      await profileApi.completeMission(userInfo?.token, mission._id);
      const response = await profileApi.me(userInfo?.token);
      applyProfile(response.data);
      toast({
        message: t('Mission completed'),
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error completing mission'),
        variant: 'destructive',
      });
    } finally {
      setCompletingId(null);
    }
  };

  const setAddressField = (field: keyof UserAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
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
      <Text className="text-2xl font-bold mb-4">{t('My profile')}</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : (
        <>
          <View className="bg-white rounded-2xl p-4 mb-4 items-center">
            <TouchableOpacity onPress={pickPhoto} disabled={uploading} className="relative">
              <Image
                source={
                  profile?.image
                    ? { uri: profile.image }
                    : require('@/assets/fallback.png')
                }
                style={{ width: 96, height: 96, borderRadius: 48 }}
              />
              <View
                className="absolute bottom-0 right-0 rounded-full p-1.5"
                style={{ backgroundColor: colors.primary[500] }}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <MaterialCommunityIcons name="camera" size={16} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
            <Text className="text-xs text-gray-500 mt-2">{t('Tap to change photo')}</Text>
          </View>

          <View
            className="rounded-2xl p-4 mb-4"
            style={{ backgroundColor: colors.primary[50] }}
          >
            <Text className="text-xs text-gray-500">{t('Coins')}</Text>
            <View className="flex-row items-center mt-1">
              <MaterialCommunityIcons name="circle-multiple" size={28} color={colors.warning[500]} />
              <Text className="text-3xl font-extrabold ml-2" style={{ color: colors.primary[700] }}>
                {profile?.coins ?? 0}
              </Text>
            </View>
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-bold text-gray-700 mb-3">{t('Personal info')}</Text>
            <Text className="text-xs text-gray-500 mb-1">{t('Name')}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              className="border border-gray-200 rounded-lg px-3 py-2 mb-3"
            />
            <Text className="text-xs text-gray-500 mb-1">{t('Email')}</Text>
            <TextInput
              value={profile?.email || ''}
              editable={false}
              className="border border-gray-200 rounded-lg px-3 py-2 mb-3 bg-gray-50 text-gray-500"
            />
            <Text className="text-xs text-gray-500 mb-1">{t('CPF or CNPJ')}</Text>
            <TextInput
              value={cpf}
              onChangeText={(value) => setCpf(formatCpfCnpj(value))}
              keyboardType="numeric"
              placeholder={t('Type your CPF or CNPJ')}
              placeholderTextColor={colors.gray[400]}
              className="border border-gray-200 rounded-lg px-3 py-2"
            />

          </View>

          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-bold text-gray-700 mb-3">{t('Address')}</Text>
            {(
              [
                ['postal_code', t('Postal code'), formatCep],
                ['street', t('Street')],
                ['number', t('Number')],
                ['complement', t('Complement')],
                ['neighborhood', t('Neighborhood')],
                ['city', t('City')],
                ['state', t('State')],
              ] as [keyof UserAddress, string, ((v: string) => string)?][]
            ).map(([field, label, formatter]) => (
              <View key={field} className="mb-2">
                <Text className="text-xs text-gray-500 mb-1">{label}</Text>
                <TextInput
                  value={address[field]}
                  onChangeText={(value) =>
                    setAddressField(
                      field,
                      field === 'state'
                        ? value.toUpperCase().slice(0, 2)
                        : formatter
                          ? formatter(value)
                          : value,
                    )
                  }
                  autoCapitalize={field === 'state' ? 'characters' : 'sentences'}
                  className="border border-gray-200 rounded-lg px-3 py-2"
                />
              </View>
            ))}
            <TouchableOpacity
              onPress={saveProfile}
              disabled={saving}
              className="mt-2 py-3 rounded-lg items-center"
              style={{ backgroundColor: colors.primary[500] }}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold">{t('Save profile')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-bold text-gray-700 mb-3">{t('Missions')}</Text>
            {!profile?.missions?.length ? (
              <Text className="text-gray-400">{t('No missions yet')}</Text>
            ) : (
              profile.missions.map((mission) => {
                const done = mission.status === 'completed';
                return (
                  <View
                    key={mission._id}
                    className="border border-gray-100 rounded-xl p-3 mb-3 flex-row"
                  >
                    {mission.image ? (
                      <Image source={{ uri: mission.image }} className="w-12 h-12 rounded-lg mr-3" />
                    ) : (
                      <View
                        className="w-12 h-12 rounded-lg mr-3 items-center justify-center"
                        style={{ backgroundColor: colors.primary[100] }}
                      >
                        <MaterialCommunityIcons
                          name="flag-checkered"
                          size={22}
                          color={colors.primary[600]}
                        />
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className="font-bold text-gray-800">{mission.title}</Text>
                      {!!mission.description && (
                        <Text className="text-xs text-gray-500 mt-1">{mission.description}</Text>
                      )}
                      <Text className="text-xs mt-1" style={{ color: colors.warning[700] }}>
                        +{mission.coins} {t('coins')}
                      </Text>
                      {done ? (
                        <Text className="text-xs mt-2" style={{ color: colors.success[600] }}>
                          {t('Completed')}
                        </Text>
                      ) : (
                        <TouchableOpacity
                          onPress={() => completeMission(mission)}
                          disabled={completingId === mission._id}
                          className="mt-2 py-2 px-3 rounded-lg self-start"
                          style={{ backgroundColor: colors.primary[500] }}
                        >
                          {completingId === mission._id ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <Text className="text-white text-xs font-bold">{t('Complete mission')}</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-bold text-gray-700 mb-3">{t('Badges')}</Text>
            {!profile?.badges?.length ? (
              <Text className="text-gray-400">{t('No badges yet')}</Text>
            ) : (
              <View className="flex-row flex-wrap">
                {profile.badges.map((badge) => (
                  <View key={badge._id} className="w-1/3 items-center mb-4 px-1">
                    {badge.image ? (
                      <Image source={{ uri: badge.image }} className="w-16 h-16 rounded-full" />
                    ) : (
                      <View
                        className="w-16 h-16 rounded-full items-center justify-center"
                        style={{ backgroundColor: colors.primary[100] }}
                      >
                        <MaterialCommunityIcons
                          name="medal"
                          size={28}
                          color={colors.primary[600]}
                        />
                      </View>
                    )}
                    <Text className="text-xs text-center mt-1 font-bold text-gray-700">
                      {badge.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}
