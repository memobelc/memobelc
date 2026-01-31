import {
  useLocalSearchParams,
  useRootNavigationState,
  useRouter,
} from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AuthLanguagePicker } from '@/components/AuthLanguagePicker';
import { useStorageStateLoading } from '@/storage/useStorageState';
import api from '@/services/api';
import { Loading } from '@/components/Loading';
import { colors } from '@/styles/colors';
import { FontAwesome } from '@expo/vector-icons';
import { useToast } from '@/components/Toast';
import * as yup from 'yup';

export default function ResetPassword() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const { toast } = useToast();
  const { t } = useTranslation();

  const codeValidationSchema = useMemo(
    () =>
      yup.object().shape({
        code: yup
          .string()
          .length(6, t('Code must be 6 digits'))
          .matches(/^\d+$/, t('Code must contain only numbers'))
          .required(t('Code is required')),
      }),
    [t],
  );

  const passwordValidationSchema = useMemo(
    () =>
      yup.object().shape({
        password: yup
          .string()
          .min(6, t('Password must be at least 6 characters'))
          .required(t('Password is required')),
        confirmPassword: yup
          .string()
          .oneOf([yup.ref('password'), undefined], t('Passwords do not match'))
          .required(t('Confirm password is required')),
      }),
    [t],
  );

  const { email: emailParam } = useLocalSearchParams();
  const email = Array.isArray(emailParam) ? emailParam[0] : emailParam;

  const [step, setStep] = useState<'code' | 'password'>('code');
  const [code, setCode] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useStorageStateLoading();

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleVerifyCode = async () => {
    if (!email) {
      toast({
        message: t('Email not found. Please request a new code.'),
        variant: 'destructive',
        showProgress: true,
      });
      router.push('./forgot-password');
      return;
    }

    try {
      setErrors({});
      await codeValidationSchema.validate({ code }, { abortEarly: false });

      setIsLoading(true);
      const response = await api.post('/auth/verify_reset_code', {
        email: String(email),
        code: String(code),
      });

      if (response.status === 200 && response.data.valid) {
        toast({
          message: t('Code verified successfully!'),
          variant: 'success',
          showProgress: true,
        });
        setStep('password');
      } else {
        toast({
          message: t('Invalid or expired code.'),
          variant: 'destructive',
          showProgress: true,
        });
      }
    } catch (error: any) {
      if (error instanceof yup.ValidationError) {
        const newErrors: Record<string, string> = {};

        error.inner.forEach((err) => {
          if (err.path) newErrors[err.path] = err.message;
        });
        setErrors(newErrors);
        toast({
          message: error.errors[0],
          variant: 'destructive',
          showProgress: true,
        });
      } else {
        const errorMessage = error?.response?.data?.error || t('Invalid or expired code.');
        toast({
          message: errorMessage,
          variant: 'destructive',
          showProgress: true,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast({
        message: t('Email not found. Please request a new code.'),
        variant: 'destructive',
        showProgress: true,
      });
      router.push('./forgot-password');
      return;
    }

    try {
      setErrors({});
      await passwordValidationSchema.validate(formData, { abortEarly: false });

      setIsLoading(true);
      const response = await api.put('/auth/reset_password', {
        email,
        code,
        password: formData.password,
      });

      if (response.status === 200) {
        toast({
          message: t('Password updated successfully!'),
          variant: 'success',
          showProgress: true,
        });
        router.push({
          pathname: '/login',
        });
      }
    } catch (error: any) {
      if (error instanceof yup.ValidationError) {
        const newErrors: Record<string, string> = {};

        error.inner.forEach((err) => {
          if (err.path) newErrors[err.path] = err.message;
        });
        setErrors(newErrors);
        toast({
          message: error.errors[0],
          variant: 'destructive',
          showProgress: true,
        });
      } else {
        const errorMessage = error?.response?.data?.error || t('An unexpected error has occurred.');
        toast({
          message: errorMessage,
          variant: 'destructive',
          showProgress: true,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!navigationState?.key) return;
    if (!email) {
      toast({
        message: t('Email not found. Please request a new code.'),
        variant: 'destructive',
        showProgress: true,
      });
      router.push('./forgot-password');
    }
  }, [navigationState?.key, email, t]);

  return isLoading ? (
    <Loading classname="flex-1 items-center justify-center" />
  ) : (
    <View className="flex-1 items-center justify-center p-5">
      <Image
        source={require('@/assets/logo_memobelc.jpg')}
        style={{ width: 200, height: 200 }}
      />
      <AuthLanguagePicker />
      {step === 'code' ? (
        <>
          <Text
            className="font-[ComicSans] font-bold text-xl mb-2"
            style={{ color: colors.gray[100] }}
          >
            {t('Code verification')}
          </Text>
          <Text
            className="font-[ComicSans] font-medium text-base mb-4 text-center"
            style={{ color: colors.gray[100] }}
          >
            {t('Enter the 6-digit code received by email.')}
          </Text>
          <View className="w-full items-center">
            <View
              className="w-full md:w-80 rounded-[25] flex-row items-center mb-3 px-4"
              style={{
                backgroundColor: colors.gray[100],
                borderWidth: 1,
                borderColor: errors['code'] ? colors.error[500] : colors.gray[300],
              }}
            >
              <TextInput
                className="flex-1 h-14 text-center text-2xl font-bold"
                placeholder={t('Code placeholder')}
                placeholderTextColor={colors.placeholder}
                value={code}
                onChangeText={(value) => {
                  setCode(value);
                  setErrors((prev) => ({ ...prev, code: '' }));
                }}
                keyboardType="numeric"
                maxLength={6}
              />
            </View>
            {errors['code'] && (
              <Text className="-mt-3 mb-3" style={{ color: colors.error[500] }}>
                {errors['code']}
              </Text>
            )}
          </View>
          <TouchableOpacity
            className="w-full md:w-80 py-4 rounded-[25] items-center mb-5"
            style={{ backgroundColor: colors.info[500] }}
            onPress={handleVerifyCode}
          >
            <Text style={{ color: colors.gray[100] }} className="font-bold text-lg">
              {t('Verify Code')}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text
            className="font-[ComicSans] font-bold text-xl mb-2"
            style={{ color: colors.gray[100] }}
          >
            {t('New Password')}
          </Text>
          <Text
            className="font-[ComicSans] font-medium text-base mb-4 text-center"
            style={{ color: colors.gray[100] }}
          >
            {t('Enter your new password.')}
          </Text>
          {['password', 'confirmPassword'].map((field) => (
            <View key={field} className="w-full items-center">
              <View
                className="w-full md:w-80 rounded-[25] flex-row items-center mb-3 px-4"
                style={{
                  backgroundColor: colors.gray[100],
                  borderWidth: 1,
                  borderColor: errors[field] ? colors.error[500] : colors.gray[300],
                }}
              >
                <TextInput
                  className="flex-1 h-14"
                  placeholder={
                    field === 'password'
                      ? t('New password')
                      : t('Confirm new password')
                  }
                  placeholderTextColor={colors.placeholder}
                  secureTextEntry={
                    ['password', 'confirmPassword'].includes(field) &&
                    !isPasswordVisible
                  }
                  value={formData[field]}
                  onChangeText={(value) => handleInputChange(field, value)}
                />
                {['password', 'confirmPassword'].includes(field) && (
                  <TouchableOpacity
                    onPress={() => setPasswordVisible(!isPasswordVisible)}
                    className="p-3"
                  >
                    <FontAwesome
                      name={isPasswordVisible ? 'eye' : 'eye-slash'}
                      size={24}
                      color="black"
                    />
                  </TouchableOpacity>
                )}
              </View>
              {errors[field] && (
                <Text className="-mt-3 mb-3" style={{ color: colors.error[500] }}>
                  {errors[field]}
                </Text>
              )}
            </View>
          ))}
          <TouchableOpacity
            className="w-full md:w-80 py-4 rounded-[25] items-center mb-5"
            style={{ backgroundColor: colors.info[500] }}
            onPress={handleResetPassword}
          >
            <Text style={{ color: colors.gray[100] }} className="font-bold text-lg">
              {t('Reset Password')}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
