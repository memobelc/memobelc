

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
import { styles } from './styles'
export default function Register() {
    const router = useRouter();

    const [email, setEmail] = useState('');


    return (
        <View style={styles.container}>

            <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.backButtonText}> ← Voltar</Text>
            </TouchableOpacity>

            <Image
                source={require("@/assets/logo_memobelc.jpg")}
                style={styles.logo}
            />

            <Text style={styles.title}>Redefinição de senha!</Text>

            <Text style={styles.text} >Informe um email e enviaremos um link para recuperação da sua senha.</Text>


            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="E-mail"
                    placeholderTextColor="#7A4F7F"
                    value={email}
                    onChangeText={setEmail}
                />
            </View>

            <TouchableOpacity style={styles.loginButton}>
                <Text style={styles.loginButtonText}>Enviar link de recuperação</Text>
            </TouchableOpacity>


        </View>
    )
}