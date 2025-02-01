

import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Switch,
    Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStorageStateLoading } from '@/storage/useStorageState';
import { styles } from './styles'
import api from '@/services/api';
import { Loading } from '@/components/Loading';
export default function Register() {
    const router = useRouter();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordVisible, setPasswordVisible] = useState(false);

    const [isLoading, setIsLoading] = useStorageStateLoading();



    const handleRegister = async () => {
        try {
        setIsLoading(true)
        const response = await api.post('/auth/register', {
            name,
            email,
            password,
        });

        if (response.status === 201) {
            router.push({ pathname: '/verify-code', params: { token: response.data.token } });
            setIsLoading(false)
            alert('Cadastro realizado com sucesso!');
        }

        } catch (error) {
            alert(error);

        }
    };


    return (

        isLoading ?
            (<Loading />) :
            (<View style={styles.container}>

                <Image
                    source={require("@/assets/logo_memobelc.jpg")}
                    style={styles.logo}
                />
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Name"
                        placeholderTextColor="#7A4F7F"
                        value={name}
                        onChangeText={setName}
                    />
                </View>

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
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="confirmar Senha"
                        placeholderTextColor="#7A4F7F"
                        secureTextEntry={!isPasswordVisible}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                    />
                    <TouchableOpacity
                        onPress={() => setPasswordVisible(!isPasswordVisible)}
                        style={styles.eyeIcon}
                    >
                        <Text>{isPasswordVisible ? '👁️' : '👁️‍🗨️'}</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() =>
                        handleRegister()
                    }
                >
                    <Text style={styles.buttonText}>Cadastrar</Text>
                </TouchableOpacity>
                <View style={styles.footerContainer}>
                    <Text style={styles.footerText}>Já tem uma conta?</Text>
                    <TouchableOpacity onPress={() => router.push('./login')}>
                        <Text style={styles.footerLink}> Faça login!</Text>
                    </TouchableOpacity>



                </View>



            </View>)


    )
}