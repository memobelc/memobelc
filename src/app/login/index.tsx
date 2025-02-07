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
import { styles } from './styles';

import { useSession } from '@/contexts/AuthContext';
import { Loading } from '@/components/Loading';

export default function SignIn() {
  const router = useRouter();

  const { signIn, isLoading } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = () => {
    signIn(email, password);
  };

  return isLoading ? (
    <Loading />
  ) : (
    <View style={styles.container}>
      <Image
        source={require('@/assets/logo_memobelc.jpg')}
        style={styles.logo}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor="#7A4F7F"
          value={email}
          onChangeText={setEmail}
        />
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#7A4F7F"
          secureTextEntry={!isPasswordVisible}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          onPress={() => setPasswordVisible(!isPasswordVisible)}
          style={styles.eyeIcon}
        >
          <Text>{isPasswordVisible ? '👁️' : '👁️‍🗨️'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.rememberMeContainer}>
        <Switch
          value={rememberMe}
          onValueChange={setRememberMe}
          thumbColor={rememberMe ? '#4285F4' : '#f4f3f4'}
          trackColor={{ false: '#767577', true: '#4285F4' }}
        />
        <Text style={styles.rememberMeText}>Lembrar de mim</Text>
      </View>
      <TouchableOpacity
        style={styles.loginButton}
        onPress={() => handleLogin()}
      >
        <Text style={styles.loginButtonText}>Login</Text>
      </TouchableOpacity>
      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>Não tem uma conta ainda?</Text>
        <TouchableOpacity onPress={() => router.push('./register')}>
          <Text style={styles.footerLink}> Crie agora!</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => router.push('./forgot-password')}>
        <Text style={styles.forgotPasswordLink}>Esqueceu a senha?</Text>
      </TouchableOpacity>
    </View>
  );
}
