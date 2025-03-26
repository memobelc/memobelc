import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Image,
} from 'react-native';

import { useSession } from '@/contexts/AuthContext';
import { Loading } from '@/components/Loading';
import { FontAwesome } from '@expo/vector-icons';
import { colors } from '@/styles/colors';
import { useTranslation } from 'react-i18next';

export default function SignIn() {
  const { t } = useTranslation();
  const router = useRouter();

  const { signIn, isLoading } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setPasswordVisible] = useState(false);

  const handleLogin = () => {
    signIn(email, password);
  };

  return isLoading ? (
    <Loading />
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
          placeholder="E-mail"
          placeholderTextColor={colors.placeholder}
          value={email}
          onChangeText={setEmail}
        />
      </View>
      <View
        className="w-full md:w-80 rounded-[25px] flex-row items-center mb-5 px-4"
        style={{ backgroundColor: colors.gray[100] }}
      >
        <TextInput
          className="flex-1 h-14"
          placeholder="Password"
          placeholderTextColor={colors.placeholder}
          secureTextEntry={!isPasswordVisible}
          value={password}
          onChangeText={setPassword}
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
      <TouchableOpacity
        className="w-full md:w-80 py-4 rounded-[25px] flex-row justify-center items-center mb-5"
        style={{ backgroundColor: colors.info[500] }}
        onPress={() => handleLogin()}
      >
        <Text
          className="text-lg font-bold mr-3"
          style={{ color: colors.gray[100] }}
        >
          Login
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
