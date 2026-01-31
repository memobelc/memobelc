import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AuthLanguagePicker } from '@/components/AuthLanguagePicker';
import { colors } from '@/styles/colors';
import api from '@/services/api';
import { useToast } from '@/components/Toast';

export default function ForgotPassword() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');

  const handleResetPassword = async () => {
    try {
      await api.post('/auth/forgot_password', {
        email,
      });
      toast({
        message: t('Recovery code sent to your email!'),
        variant: 'success',
        showProgress: true,
      });
      router.push({
        pathname: './reset_password',
        params: { email },
      });
    } catch (error: any) {
      toast({
        message: error?.response?.data?.error || t('Error sending recovery code.'),
        variant: 'destructive',
        showProgress: true,
      });
    }
  };

  return (
    <View className="flex-1 items-center justify-center p-5">
      <TouchableOpacity onPress={() => router.back()}>
        <Text
          className="font-[ComicSans] font-medium text-base"
          style={{ color: colors.gray[100] }}
        >
          {' '}
          ← {t('Back')}
        </Text>
      </TouchableOpacity>

      <Image
        source={require('@/assets/logo_memobelc.jpg')}
        style={{ width: 200, height: 200 }}
      />

      <AuthLanguagePicker />

      <Text
        className="font-[ComicSans] font-bold text-xl mb-4"
        style={{ color: colors.gray[100] }}
      >
        {t('Password reset!')}
      </Text>

      <Text
        className="font-[ComicSans] font-medium text-base mb-4"
        style={{ color: colors.gray[100] }}
      >
        {t('Enter your email and we\'ll send a recovery code.')}
      </Text>

      <View
        className="w-full md:w-80 rounded-[25px] flex-row items-center mb-5 px-4"
        style={{ backgroundColor: colors.gray[100] }}
      >
        <TextInput
          className="flex-1 h-14"
          placeholder={t('E-mail')}
          placeholderTextColor={colors.placeholder}
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <TouchableOpacity
        className="w-full md:w-80 py-4 rounded-[25px] flex-row justify-center items-center mb-5"
        style={{ backgroundColor: colors.info[500] }}
        onPress={() => handleResetPassword()}
      >
        <Text
          className="text-lg font-bold mr-3"
          style={{ color: colors.gray[100] }}
        >
          {t('Send recovery code')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
