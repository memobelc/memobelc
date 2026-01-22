import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { useStorageStateLoading } from '@/storage/useStorageState';
import api from '@/services/api';
import { Loading } from '@/components/Loading';
import { colors } from '@/styles/colors';
import { FontAwesome } from '@expo/vector-icons';
import { useToast } from '@/components/Toast';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';

export default function Register() {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();

  const validationSchema = yup.object().shape({
    name: yup.string().required(t('Name is required')),
    email: yup
      .string()
      .email(t('Invalid email address'))
      .required(t('Email is required')),
    password: yup
      .string()
      .min(6, t('Password must be at least 6 characters'))
      .required(t('Password is required')),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref('password'), undefined], t('Passwords do not match'))
      .required(t('Confirm password is required')),
  });

  const [formData, setFormData] = useState<Record<string, string>>({
    name: '',
    email: '',
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

  const isAxiosError = (
    error: unknown,
  ): error is { response: { status: number } } => {
    return (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof (error as any).response?.status === 'number'
    );
  };

  const handleRegister = async () => {
    try {
      setErrors({});
      await validationSchema.validate(formData, { abortEarly: false });

      setIsLoading(true);
      const response = await api.post('/auth/register', formData);

      if (response.status === 201) {
        router.push({
          pathname: '/verify-code',
          params: { token: response.data.token },
        });
        toast({
          message: t('User created successfully!'),
          variant: 'success',
          showProgress: true,
        });
      }
    } catch (error: unknown) {
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
      } else if (isAxiosError(error) && error.response.status === 409) {
        toast({
          message: t('This email is already in use. Please try another one.'),
          variant: 'destructive',
          showProgress: true,
        });
      } else {
        toast({
          message: t('An unexpected error has occurred.'),
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return isLoading ? (
    <Loading classname="flex-1 items-center justify-center" />
  ) : (
    <View className="flex-1 items-center justify-center p-5">
      <Image
        source={require('@/assets/logo_memobelc.jpg')}
        style={{ width: 200, height: 200 }}
      />
      {['name', 'email', 'password', 'confirmPassword'].map((field) => (
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
              placeholder={t(field)}
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
        onPress={handleRegister}
      >
        <Text style={{ color: colors.gray[100] }}>{t('Register')}</Text>
      </TouchableOpacity>
      <View className="items-center text-lg font-bold">
        <Text style={{ color: colors.gray[100] }}>
          {t('Already have an account?')}
        </Text>
        <TouchableOpacity onPress={() => router.push('./login')}>
          <Text className="font-bold" style={{ color: colors.primary[600] }}>
            {t('Login')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
