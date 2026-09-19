import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { useToast } from '@/components/Toast';
import StatusBadge from '@/components/admin/StatusBadge';
import BrainAvatarView from '@/components/atoms/BrainAvatar';
import { BRAIN_EVENTS } from '@/constants/brain';
import { adminTutorialsApi, type BrainAvatar } from '@/services/tutorials';
import { uploadImageToFirebase } from '@/utils/uploadImage';

const emptyAvatarForm = {
  key: '',
  name: '',
  image: '',
  events: ['tutorial'] as string[],
  is_active: true,
};

type AdminBrainAvatarsProps = {
  token: string;
  avatars: BrainAvatar[];
  onChanged: (avatars: BrainAvatar[]) => void;
};

export default function AdminBrainAvatars({
  token,
  avatars,
  onChanged,
}: AdminBrainAvatarsProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<BrainAvatar | null>(null);
  const [form, setForm] = useState(emptyAvatarForm);

  const refresh = async () => {
    const response = await adminTutorialsApi.listAvatars(token);
    onChanged(response.data.avatars || []);
  };

  const resetForm = () => {
    setEditing(null);
    setForm(emptyAvatarForm);
  };

  const startEdit = (avatar: BrainAvatar) => {
    setEditing(avatar);
    setForm({
      key: avatar.key,
      name: avatar.name || avatar.key,
      image: avatar.image || '',
      events: avatar.events?.length ? [...avatar.events] : ['tutorial'],
      is_active: avatar.is_active !== false,
    });
  };

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
      allowsEditing: false,
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    try {
      setUploading(true);
      const url = await uploadImageToFirebase(
        result.assets[0].uri,
        `brain-avatars/${Date.now()}`,
      );
      setForm((prev) => ({ ...prev, image: url }));
    } catch {
      toast({ message: t('Error saving avatar'), variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const toggleEvent = (event: string) => {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((item) => item !== event)
        : [...prev.events, event],
    }));
  };

  const save = async () => {
    if (!editing && !form.key.trim()) {
      toast({ message: t('Key is required'), variant: 'destructive' });
      return;
    }
    if (!form.name.trim()) {
      toast({ message: t('Name is required'), variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        image: form.image.trim() || null,
        events: form.events,
        is_active: form.is_active,
      };
      if (editing) {
        await adminTutorialsApi.updateAvatar(token, editing._id, payload);
      } else {
        await adminTutorialsApi.createAvatar(token, {
          ...payload,
          key: form.key.trim(),
        });
      }
      toast({ message: t('Avatar saved'), variant: 'success' });
      resetForm();
      await refresh();
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error saving avatar'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (avatar: BrainAvatar) => {
    try {
      await adminTutorialsApi.updateAvatar(token, avatar._id, {
        is_active: avatar.is_active === false,
      });
      await refresh();
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error saving avatar'),
        variant: 'destructive',
      });
    }
  };

  return (
    <View className="mb-8">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-lg font-bold">{t('Brain avatars')}</Text>
        {editing ? (
          <TouchableOpacity onPress={resetForm}>
            <Text style={{ color: colors.primary[500] }}>{t('Create avatar')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View className="bg-white rounded-xl p-4 mb-4">
        <Text className="font-bold mb-3" style={{ color: colors.primary[600] }}>
          {editing ? t('Edit avatar') : t('Create avatar')}
        </Text>
        <TextInput
          className="border border-gray-200 rounded-xl px-3 py-2 mb-2"
          placeholder={t('Key')}
          value={form.key}
          editable={!editing}
          onChangeText={(key) => setForm((prev) => ({ ...prev, key }))}
        />
        <TextInput
          className="border border-gray-200 rounded-xl px-3 py-2 mb-2"
          placeholder={t('Name')}
          value={form.name}
          onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
        />
        <TouchableOpacity
          onPress={pickImage}
          disabled={uploading}
          className="flex-row items-center border border-gray-200 rounded-xl px-3 py-2 mb-2"
        >
          <BrainAvatarView
            expression={form.key || 'happy'}
            uri={form.image || undefined}
            catalog={avatars}
            size={48}
          />
          {uploading ? (
            <ActivityIndicator color={colors.primary[500]} style={{ marginLeft: 12 }} />
          ) : (
            <Text className="ml-3" style={{ color: colors.primary[500] }}>
              {form.image ? t('Change image') : t('Add image')}
            </Text>
          )}
        </TouchableOpacity>
        {form.image ? (
          <TouchableOpacity onPress={() => setForm((prev) => ({ ...prev, image: '' }))} className="mb-2">
            <Text style={{ color: colors.error[600] }}>{t('Remove image')}</Text>
          </TouchableOpacity>
        ) : null}
        <View className="flex-row flex-wrap mb-3" style={{ gap: 8 }}>
          {BRAIN_EVENTS.map((event) => {
            const selected = form.events.includes(event);
            return (
              <TouchableOpacity
                key={event}
                onPress={() => toggleEvent(event)}
                className="px-3 py-1 rounded-full border"
                style={{
                  borderColor: selected ? colors.primary[500] : colors.gray[200],
                  backgroundColor: selected ? colors.primary[50] : '#fff',
                }}
              >
                <Text style={{ color: selected ? colors.primary[600] : colors.gray[600] }}>
                  {event}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View className="flex-row items-center justify-between mb-3">
          <Text>{t('Active')}</Text>
          <Switch
            value={form.is_active}
            onValueChange={(is_active) => setForm((prev) => ({ ...prev, is_active }))}
          />
        </View>
        <TouchableOpacity
          onPress={save}
          disabled={saving || uploading}
          className="py-3 rounded-xl items-center"
          style={{ backgroundColor: colors.primary[500] }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold">{t('Save')}</Text>
          )}
        </TouchableOpacity>
        {editing ? (
          <TouchableOpacity onPress={resetForm} className="mt-2 items-center">
            <Text style={{ color: colors.gray[600] }}>{t('Cancel')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {avatars.map((avatar) => (
        <View key={avatar._id} className="bg-white rounded-xl p-4 mb-3 flex-row items-center">
          <BrainAvatarView
            expression={avatar.key}
            uri={avatar.image}
            catalog={avatars}
            size={56}
          />
          <View className="flex-1 ml-3">
            <Text className="font-semibold">{avatar.name || avatar.key}</Text>
            <Text className="text-xs text-gray-500 mb-1">{avatar.key}</Text>
            <StatusBadge status={avatar.is_active === false ? 'inactive' : 'active'} />
          </View>
          <View>
            <TouchableOpacity onPress={() => startEdit(avatar)} className="mb-2">
              <Text style={{ color: colors.primary[500] }}>{t('Edit')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleActive(avatar)}>
              <Text style={{ color: avatar.is_active === false ? colors.primary[500] : colors.error[600] }}>
                {avatar.is_active === false ? t('Activate') : t('Deactivate')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}
