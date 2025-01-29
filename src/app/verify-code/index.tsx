import React, { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image, View, Text, TouchableOpacity, Alert } from 'react-native';
import OTPInputView from '@twotalltotems/react-native-otp-input';
import api from '@/services/api';
import { useStorageState } from '@/storage/useStorageState';

import styles from './styles';

const ConfirmAccountScreen = () => {

  const router = useRouter();
  const [code, setCode] = useState('');
  const [[isLoading, session], setSession] = useStorageState('session');

  const { token } = useLocalSearchParams();

  const handleConfirm = async () => {
    if (code.length === 6) {
      const response = await api.post('/auth/verify_code', { code },{
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      await setSession(response.data.token);
      Alert.alert('Sucesso', 'Código confirmado com sucesso!');
      router.replace('/');
    } else {
      Alert.alert('Erro', 'Por favor, insira um código válido de 6 dígitos.');
    }
  };

  return (
    <View style={styles.container}>
      <Image
          source={require('@/assets/logo_memobelc.jpg')}
          style={styles.logo}
      />
      <Text style={styles.title}>Confirme sua Conta</Text>
      <Text style={styles.subtitle}>Insira o código de 6 dígitos enviado para seu e-mail.</Text>

      <OTPInputView
        style={styles.otpContainer}
        pinCount={6}
        autoFocusOnLoad
        codeInputFieldStyle={styles.otpBox}
        codeInputHighlightStyle={styles.otpBoxFocused}
        onCodeFilled={setCode}
      />

      <TouchableOpacity style={styles.button} onPress={handleConfirm}>
        <Text style={styles.buttonText}>Confirmar</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ConfirmAccountScreen;