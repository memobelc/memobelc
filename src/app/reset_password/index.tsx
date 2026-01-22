import {
  useLocalSearchParams,
  useRootNavigationState,
  useRouter,
} from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { useStorageStateLoading } from '@/storage/useStorageState';
import api from '@/services/api';
import { Loading } from '@/components/Loading';
import { colors } from '@/styles/colors';
import { FontAwesome } from '@expo/vector-icons';
import { useToast } from '@/components/Toast';
import * as yup from 'yup';
import { isTokenExpired } from '@/utils/isTokenExpired';

const validationSchema = yup.object().shape({
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password'), undefined], 'Passwords do not match')
    .required('Confirm password is required'),
});

export default function Register() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const { toast } = useToast();

  const { token } = useLocalSearchParams();

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

  const handleSubmit = async () => {
    if (!token || isTokenExpired(token as string)) {
      toast({
        message: 'Session expired. Please try again.',
        variant: 'destructive',
        showProgress: true,
      });
      router.push('./login');
    }
    try {
      setErrors({});
      await validationSchema.validate(formData, { abortEarly: false });

      setIsLoading(true);
      const response = await api.put('/auth/reset_password', {
        ...formData,
        token,
      });

      if (response.status === 200) {
        toast({
          message: 'Senha atualizada com sucesso!',
          variant: 'success',
          showProgress: true,
        });
        router.push({
          pathname: '/login',
        });
      }
    } catch (error) {
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
        toast({
          message: 'An unexpected error has occurred',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!navigationState?.key) return;
    if (!token || isTokenExpired(token as string)) {
      toast({
        message: 'Session expired. Please try again.',
        variant: 'destructive',
        showProgress: true,
      });
      router.push('./login');
    }
  }, [navigationState?.key, token]);

  return isLoading ? (
    <Loading classname="flex-1 items-center justify-center" />
  ) : (
    <View className="flex-1 items-center justify-center p-5">
      <Image
        source={require('@/assets/logo_memobelc.jpg')}
        style={{ width: 200, height: 200 }}
      />
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
              placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
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
        onPress={handleSubmit}
      >
        <Text style={{ color: colors.gray[100] }}>Reset Password</Text>
      </TouchableOpacity>
    </View>
  );
}
