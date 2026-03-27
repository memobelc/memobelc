import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, TextInput, TouchableOpacity, Image, Platform } from 'react-native';

import { useSession } from '@/contexts/AuthContext';
import { Loading } from '@/components/Loading';
import { AuthLanguagePicker } from '@/components/AuthLanguagePicker';
import { FontAwesome } from '@expo/vector-icons';
import { colors } from '@/styles/colors';
import { useTranslation } from 'react-i18next';
import * as yup from 'yup';

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { registerForPushNotificationsAsync } from '@/utils/notifications';
import api from '@/services/api';

// Só configura notificações se não estiver no web
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowList: true,
    }),
  });
}

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
      const result = await signIn(formData.email, formData.password);

      if (result.success && result.user) {
        let tokenToSend = expoPushToken;
        if (Platform.OS !== 'web' && !tokenToSend) {
          tokenToSend = (await registerForPushNotificationsAsync()) ?? undefined;
        }
        const info = {
          user_id: result.user.user_id,
          expoPushToken: tokenToSend,
          ...getDeviceInfo(),
        };
        try {
          await api.post('/auth/access_log', info);
        } catch (logError) {
          // Silenciosamente ignora erros no log de acesso
          console.warn('Failed to log access:', logError);
        }
        
        // Só agenda notificação se não estiver no web e se as notificações estiverem disponíveis
        if (Platform.OS !== 'web' && Notifications.scheduleNotificationAsync) {
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: t('Login successful 🎉'),
                body: t('Let\'s start another amazing journey!'),
              },
              trigger: {
                seconds: 1,
                repeats: false,
              } as Notifications.NotificationTriggerInput,
            });
          } catch (notificationError) {
            // Silenciosamente ignora erros de notificação, não deve bloquear o login
            console.warn('Failed to schedule notification:', notificationError);
          }
        }
        
        router.replace('/');
      } else if (result.pending) {
        router.push({
          pathname: '/verify-code',
          params: { token: result.pending.token },
        });
      } else if (result.error) {
        // Erro já foi tratado no AuthContext com toast
        setErrors({ 
          general: result.error 
        });
      }
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        const newErrors: Record<string, string> = {};

        error.inner.forEach((err) => {
          if (err.path) newErrors[err.path] = err.message;
        });
        setErrors(newErrors);
      } else {
        // Tratamento de outros erros inesperados
        setErrors({ 
          general: error instanceof Error ? error.message : t('An unexpected error occurred') 
        });
      }
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'web') {
      registerForPushNotificationsAsync()
        .then((token) => setExpoPushToken(token))
        .catch((err) => console.warn('Push registration failed:', err));
    }
  }, []);

  return isLoading ? (
    <Loading classname="flex-1 items-center justify-center" />
  ) : (
    <View className="flex-1 items-center justify-center p-5">
      <Image
        source={require('@/assets/logo_memobelc.jpg')}
        style={{ width: 200, height: 200 }}
      />

      <AuthLanguagePicker />

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
      {errors['general'] && (
        <Text className="mb-3 text-center" style={{ color: colors.error[500] }}>
          {errors['general']}
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
  // Se estiver no web ou Device não estiver disponível, retorna valores padrão
  if (Platform.OS === 'web' || !Device) {
    return {
      manufacturer: null,
      deviceName: 'Web Browser',
      deviceType: 'DESKTOP',
      osName: Platform.OS,
      osVersion: null,
      platformApiLevel: null,
      isPhysicalDevice: false,
    };
  }
  
  return {
    manufacturer: Device.manufacturer || null,
    deviceName: Device.deviceName || null,
    deviceType: Device.deviceType || null,
    osName: Device.osName || Platform.OS,
    osVersion: Device.osVersion || null,
    platformApiLevel: Device.platformApiLevel || null,
    isPhysicalDevice: Device.isDevice || false,
  };
}
