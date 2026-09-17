import React, { useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as yup from 'yup';

import { useSession } from '@/contexts/AuthContext';
import { Loading } from '@/components/Loading';
import { AuthLanguagePicker } from '@/components/AuthLanguagePicker';
import { useToast } from '@/components/Toast';
import { colors } from '@/styles/colors';
import api from '@/services/api';

export default function ChangePassword() {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const { session, userInfo, acceptAuth, isLoading } = useSession();
  const [saving, setSaving] = useState(false);
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validationSchema = yup.object().shape({
    currentPassword: yup.string().required(t('Password is required')),
    newPassword: yup
      .string()
      .min(6, t('Password must be at least 6 characters'))
      .required(t('Password is required')),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref('newPassword'), undefined], t('Passwords do not match'))
      .required(t('Confirm password is required')),
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async () => {
    try {
      setErrors({});
      await validationSchema.validate(formData, { abortEarly: false });
      const token = userInfo?.token || session;
      if (!token) {
        router.replace('/login');
        return;
      }
      setSaving(true);
      const response = await api.put(
        '/auth/change_password',
        {
          current_password: formData.currentPassword,
          new_password: formData.newPassword,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.data?.token) {
        await acceptAuth(response.data);
      }
      toast({
        message: t('Password updated successfully'),
        variant: 'success',
      });
      router.replace('/');
    } catch (error: any) {
      if (error instanceof yup.ValidationError) {
        const next: Record<string, string> = {};
        error.inner.forEach((err) => {
          if (err.path) next[err.path] = err.message;
        });
        setErrors(next);
        toast({ message: error.errors[0], variant: 'destructive' });
        return;
      }
      const message =
        error?.response?.data?.error || t('An unexpected error occurred');
      setErrors({ general: message });
      toast({ message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <Loading classname="flex-1 items-center justify-center" />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <View className="flex-1 items-center justify-center p-5">
      <Image
        source={require('@/assets/logo_memobelc.jpg')}
        style={{ width: 200, height: 200 }}
      />
      <AuthLanguagePicker />
      <Text
        className="font-[ComicSans] font-bold text-xl mb-2 text-center"
        style={{ color: colors.gray[100] }}
      >
        {t('Change password')}
      </Text>
      <Text
        className="font-[ComicSans] font-medium text-base mb-4 text-center"
        style={{ color: colors.gray[100] }}
      >
        {t('You must create a new password before continuing')}
      </Text>

      <View
        className="w-full md:w-80 rounded-[25px] flex-row items-center mb-5 px-4"
        style={{ backgroundColor: colors.gray[100] }}
      >
        <TextInput
          className="flex-1 h-14"
          placeholder={t('Current password')}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={!isPasswordVisible}
          value={formData.currentPassword}
          onChangeText={(value) => handleInputChange('currentPassword', value)}
        />
        <TouchableOpacity
          onPress={() => setPasswordVisible((prev) => !prev)}
          className="p-3"
        >
          <FontAwesome
            name={isPasswordVisible ? 'eye' : 'eye-slash'}
            size={24}
            color="black"
          />
        </TouchableOpacity>
      </View>
      {errors.currentPassword ? (
        <Text className="-mt-3 mb-3" style={{ color: colors.error[500] }}>
          {errors.currentPassword}
        </Text>
      ) : null}

      <View
        className="w-full md:w-80 rounded-[25px] flex-row items-center mb-5 px-4"
        style={{ backgroundColor: colors.gray[100] }}
      >
        <TextInput
          className="flex-1 h-14"
          placeholder={t('New password')}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={!isPasswordVisible}
          value={formData.newPassword}
          onChangeText={(value) => handleInputChange('newPassword', value)}
        />
      </View>
      {errors.newPassword ? (
        <Text className="-mt-3 mb-3" style={{ color: colors.error[500] }}>
          {errors.newPassword}
        </Text>
      ) : null}

      <View
        className="w-full md:w-80 rounded-[25px] flex-row items-center mb-5 px-4"
        style={{ backgroundColor: colors.gray[100] }}
      >
        <TextInput
          className="flex-1 h-14"
          placeholder={t('confirmPassword')}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={!isPasswordVisible}
          value={formData.confirmPassword}
          onChangeText={(value) => handleInputChange('confirmPassword', value)}
        />
      </View>
      {errors.confirmPassword ? (
        <Text className="-mt-3 mb-3" style={{ color: colors.error[500] }}>
          {errors.confirmPassword}
        </Text>
      ) : null}
      {errors.general ? (
        <Text className="mb-3 text-center" style={{ color: colors.error[500] }}>
          {errors.general}
        </Text>
      ) : null}

      <TouchableOpacity
        className="w-full md:w-80 py-4 rounded-[25px] flex-row justify-center items-center mb-5"
        style={{ backgroundColor: colors.info[500], opacity: saving ? 0.7 : 1 }}
        onPress={handleSubmit}
        disabled={saving}
      >
        <Text
          className="text-lg font-bold mr-3"
          style={{ color: colors.gray[100] }}
        >
          {t('Change password')}
        </Text>
        <FontAwesome name="lock" size={18} color={colors.gray[100]} />
      </TouchableOpacity>
    </View>
  );
}
