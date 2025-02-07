import { useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  NativeSyntheticEvent,
  Pressable,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  TouchableWithoutFeedback,
  View,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSession } from '@/contexts/AuthContext';
import styles from './styles';

const ConfirmAccountScreen = () => {
  const { verify_code } = useSession();
  const { token } = useLocalSearchParams();

  const [codeOTP, setCodeOTP] = useState<string[]>(Array(6).fill(''));
  const inputRefs = Array(6)
    .fill(null)
    .map(() => useRef<TextInput>(null));

  const handleChangeCode = (text: string, index: number) => {
    if (!/^\d*$/.test(text)) return;

    const newCode = [...codeOTP];
    newCode[index] = text;
    setCodeOTP(newCode);

    if (text.length === 1 && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleBackspace = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (e.nativeEvent.key === 'Backspace') {
      const newCode = [...codeOTP];

      if (codeOTP[index] === '') {
        if (index > 0) {
          inputRefs[index - 1].current?.focus();
        }
      }

      newCode[index] = '';
      setCodeOTP(newCode);
    }
  };

  const handleValidateCode = () => {
    const code = codeOTP.join('');
    if (code.length < 6) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }
    verify_code(token, code);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Image
          source={require('@/assets/logo_memobelc.jpg')}
          style={styles.logo}
        />
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 22 }}>
          Confirme o Código
        </Text>
        <Text style={{ color: '#fff', fontSize: 13 }}>
          Enviamos um código de confirmação para seu E-mail
        </Text>

        <View
          style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center' }}
        >
          {codeOTP.map((digit, index) => (
            <TextInput
              key={index}
              ref={inputRefs[index]}
              style={{
                width: 40,
                height: 50,
                borderWidth: 1,
                borderColor: '#eee',
                textAlign: 'center',
                fontSize: 20,
                marginHorizontal: 5,
                borderRadius: 6,
              }}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(text) => handleChangeCode(text, index)}
              onKeyPress={(e) => handleBackspace(e, index)}
              autoFocus={index === 0}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleValidateCode}>
          <Text style={styles.buttonText}>Confirmar</Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default ConfirmAccountScreen;
