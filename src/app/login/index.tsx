import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native';

import { useSession } from '@/contexts/AuthContext';
import { Loading } from '@/components/Loading';
import { FontAwesome } from '@expo/vector-icons';
import { colors } from '@/styles/colors';
import { useTranslation } from 'react-i18next';
import * as yup from 'yup';

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { registerForPushNotificationsAsync } from '@/utils/notifications';
import api from '@/services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowList: true,
  }),
});

export default function SignIn() {
  const { t } = useTranslation();
  const router = useRouter();

  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();

  const validationSchema = yup.object().shape({
    email: yup
      .string()
      .email(t('Invalid email address'))
      .required(t('Email is required')),
    password: yup
      .string()
      .min(6, t('Password must be at least 6 characters'))
      .required(t('Password is required')),
  });

  const [formData, setFormData] = useState<Record<string, string>>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const { signIn, isLoading, userInfo } = useSession();
  const [isPasswordVisible, setPasswordVisible] = useState(false);

  const handleLogin = async () => {
    try {
      setErrors({});
      await validationSchema.validate(formData, { abortEarly: false });
      const login = await signIn(formData.email, formData.password);

      if (login) {
        const info = {
          expoPushToken,
          user_id: login.user_id,
          ...getDeviceInfo(),
        };
        await api.post('/auth/access_log', info);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Login realizado com sucesso 🎉',
            body: `Vamos começar mais uma jornada incrível!`,
          },
          trigger: {
            seconds: 1,
            repeats: false,
          } as Notifications.NotificationTriggerInput,
        });
      }
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        const newErrors: Record<string, string> = {};

        error.inner.forEach((err) => {
          if (err.path) newErrors[err.path] = err.message;
        });
        setErrors(newErrors);
      }
    }
  };

  useEffect(() => {
    registerForPushNotificationsAsync().then(
      (token: React.SetStateAction<string | undefined>) =>
        setExpoPushToken(token),
    );
  }, []);

  return isLoading ? (
    <Loading classname="flex-1 items-center justify-center" />
  ) : (
    <View className="flex-1 items-center justify-center p-5">
      <Image
        source={require('@/assets/logo_memobelc.jpg')}
        style={{ width: 200, height: 200 }}
      />

      <View
        className="w-full md:w-80 rounded-[25px] flex-row items-center mb-5 px-4"
        style={{ backgroundColor: colors.gray[100] }}
      >
        <TextInput
          className="flex-1 h-14"
          placeholder={t('E-mail')}
          placeholderTextColor={colors.placeholder}
          value={formData.email}
          onChangeText={(value) => handleInputChange('email', value)}
        />
      </View>
      {errors['email'] && (
        <Text className="-mt-3 mb-3" style={{ color: colors.error[500] }}>
          {errors['email']}
        </Text>
      )}
      <View
        className="w-full md:w-80 rounded-[25px] flex-row items-center mb-5 px-4"
        style={{ backgroundColor: colors.gray[100] }}
      >
        <TextInput
          className="flex-1 h-14"
          placeholder={t('Password')}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={!isPasswordVisible}
          value={formData.password}
          onChangeText={(value) => handleInputChange('password', value)}
        />
        <TouchableOpacity
          onPress={() => setPasswordVisible(!isPasswordVisible)}
          className="p-3"
        >
          {isPasswordVisible ? (
            <FontAwesome name="eye" size={24} color="black" />
          ) : (
            <FontAwesome name="eye-slash" size={24} color="black" />
          )}
        </TouchableOpacity>
      </View>
      {errors['password'] && (
        <Text className="-mt-3 mb-3" style={{ color: colors.error[500] }}>
          {errors['password']}
        </Text>
      )}
      <TouchableOpacity
        className="w-full md:w-80 py-4 rounded-[25px] flex-row justify-center items-center mb-5"
        style={{ backgroundColor: colors.info[500] }}
        onPress={() => handleLogin()}
      >
        <Text
          className="text-lg font-bold mr-3"
          style={{ color: colors.gray[100] }}
        >
          {t('Login')}
        </Text>
        <FontAwesome name="rocket" size={18} color={colors.gray[100]} />
      </TouchableOpacity>
      <View className="flex-row items-center">
        <Text style={{ color: colors.gray[100] }}>
          {t("Don't have an account yet? ")}
        </Text>
        <TouchableOpacity onPress={() => router.push('./register')}>
          <Text className="font-bold" style={{ color: colors.primary[600] }}>
            {t('Create now!')}
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => router.push('./forgot-password')}>
        <Text
          className="mt-3 text-right"
          style={{ color: colors.primary[600] }}
        >
          {t('Forgot your password?')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
export function getDeviceInfo() {
  return {
    manufacturer: Device.manufacturer,
    deviceName: Device.deviceName,
    deviceType: Device.deviceType,
    osName: Device.osName,
    osVersion: Device.osVersion,
    platformApiLevel: Device.platformApiLevel,
    isPhysicalDevice: Device.isDevice,
  };
}
