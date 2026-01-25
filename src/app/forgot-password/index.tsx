import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { colors } from '@/styles/colors';
import api from '@/services/api';
import { useToast } from '@/components/Toast';
export default function Register() {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');

  const handleResetPassword = async () => {
    try {
      await api.post('/auth/forgot_password', {
        email,
      });
      toast({
        message: 'Código de recuperação enviado para seu e-mail!',
        variant: 'success',
        showProgress: true,
      });
      router.push({
        pathname: './reset_password',
        params: { email },
      });
    } catch (error: any) {
      toast({
        message: error?.response?.data?.error || 'Erro ao enviar código de recuperação',
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
          ← Voltar
        </Text>
      </TouchableOpacity>

      <Image
        source={require('@/assets/logo_memobelc.jpg')}
        style={{ width: 200, height: 200 }}
      />

      <Text
        className="font-[ComicSans] font-bold text-xl mb-4"
        style={{ color: colors.gray[100] }}
      >
        Redefinição de senha!
      </Text>

      <Text
        className="font-[ComicSans] font-medium text-base mb-4"
        style={{ color: colors.gray[100] }}
      >
        Informe um email e enviaremos um código para recuperação da sua senha.
      </Text>

      <View
        className="w-full md:w-80 rounded-[25px] flex-row items-center mb-5 px-4"
        style={{ backgroundColor: colors.gray[100] }}
      >
        <TextInput
          className="flex-1 h-14"
          placeholder="E-mail"
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
          Enviar código de recuperação
        </Text>
      </TouchableOpacity>
    </View>
  );
}
