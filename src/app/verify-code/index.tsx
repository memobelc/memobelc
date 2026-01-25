import React, { useRef, useState } from 'react';
import {
  Alert,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSession } from '@/contexts/AuthContext';
import { colors } from '@/styles/colors';

const ConfirmAccountScreen = () => {
  const { verify_code } = useSession();
  const { token } = useLocalSearchParams();
  const router = useRouter();

  const [code, setCode] = useState<string>('');

  const handleValidateCode = async () => {
    if (code.length < 6) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }
    const result = await verify_code(token, code);
    if (result.success) {
      router.replace('/');
    }
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={require('@/assets/logo_memobelc.jpg')}
        style={{
          width: 150,
          height: 150,
        }}
      />
      <Text
        style={{
          color: colors.gray[100],
          fontWeight: 'bold',
          fontSize: 22,
        }}
      >
        Confirme o Código
      </Text>
      <Text
        style={{
          color: colors.gray[100],
          fontSize: 13,
          textAlign: 'center',
          marginHorizontal: 20,
        }}
      >
        Enviamos um código de confirmação para seu E-mail
      </Text>

      <View
        style={{
          marginTop: 20,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TextInput
          className="w-64 h-14 border border-white rounded-xl px-6 text-white text-center tracking-[0.6em] text-lg"
          onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ''))}
          keyboardType="numeric"
          maxLength={6}
          placeholderTextColor={colors.placeholder}
          value={code}
        />
      </View>

      <TouchableOpacity
        style={{
          marginTop: 20,
          backgroundColor: colors.info[500],
          paddingVertical: 12,
          paddingHorizontal: 32,
          borderRadius: 8,
        }}
        onPress={handleValidateCode}
      >
        <Text
          style={{
            color: colors.gray[100],
            fontSize: 16,
            fontWeight: 'bold',
          }}
        >
          Confirmar
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default ConfirmAccountScreen;
