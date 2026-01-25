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

const codeValidationSchema = yup.object().shape({
  code: yup
    .string()
    .length(6, 'Code must be 6 digits')
    .matches(/^\d+$/, 'Code must contain only numbers')
    .required('Code is required'),
});

const passwordValidationSchema = yup.object().shape({
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
        message: 'Email não encontrado. Por favor, solicite um novo código.',
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
          message: 'Código verificado com sucesso!',
          variant: 'success',
          showProgress: true,
        });
        setStep('password');
      } else {
        toast({
          message: 'Código inválido ou expirado',
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
        const errorMessage = error?.response?.data?.error || 'Código inválido ou expirado';
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
        message: 'Email não encontrado. Por favor, solicite um novo código.',
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
          message: 'Senha atualizada com sucesso!',
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
        const errorMessage = error?.response?.data?.error || 'An unexpected error has occurred';
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
        message: 'Email não encontrado. Por favor, solicite um novo código.',
        variant: 'destructive',
        showProgress: true,
      });
      router.push('./forgot-password');
    }
  }, [navigationState?.key, email]);

  return isLoading ? (
    <Loading classname="flex-1 items-center justify-center" />
  ) : (
    <View className="flex-1 items-center justify-center p-5">
      <Image
        source={require('@/assets/logo_memobelc.jpg')}
        style={{ width: 200, height: 200 }}
      />
      
      {step === 'code' ? (
        <>
          <Text
            className="font-[ComicSans] font-bold text-xl mb-2"
            style={{ color: colors.gray[100] }}
          >
            Verificação de Código
          </Text>
          <Text
            className="font-[ComicSans] font-medium text-base mb-4 text-center"
            style={{ color: colors.gray[100] }}
          >
            Digite o código de 6 dígitos recebido por e-mail.
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
                placeholder="000000"
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
              Verificar Código
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text
            className="font-[ComicSans] font-bold text-xl mb-2"
            style={{ color: colors.gray[100] }}
          >
            Nova Senha
          </Text>
          <Text
            className="font-[ComicSans] font-medium text-base mb-4 text-center"
            style={{ color: colors.gray[100] }}
          >
            Digite sua nova senha.
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
                      ? 'Nova senha'
                      : 'Confirmar nova senha'
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
              Redefinir Senha
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
