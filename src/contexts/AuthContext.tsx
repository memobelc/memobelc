import { useContext, createContext, type PropsWithChildren } from 'react';
import {
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStorageState } from '@/storage/useStorageState';
import api from '@/services/api';

const AuthContext = createContext<{
    signIn: (email: string, password: string) => void;
    signOut: () => void;
    refresh_token: (token: string) => void;
    session?: string | null;
    isLoading: boolean;
}>({
    signIn: () => false,
    signOut: () => null,
    refresh_token: () => false,
    session: null,
    isLoading: false,
});

export function useSession() {
    
    const value = useContext(AuthContext);
    if (process.env.NODE_ENV !== 'production') {
        if (!value) {
            throw new Error('useSession must be wrapped in a <SessionProvider />');
        }
    }

    return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
    const [[isLoading, session], setSession] = useStorageState('session');
    const router = useRouter();

    return (
        <AuthContext.Provider
            value={{
                signIn: async (email: string, password: string) => {
                    try {
                        const response = await api.post('/auth/login', { email, password });

                        if (response.data.pending){
                            router.push({ pathname: '/verify-code', params: { token: response.data.pending[1] } });
                            Alert.alert('Sucesso!', 'Você precisa validar seu email, por favor verifique o codigo que foi enviado pelo seu email!');
                        }
                        else{
                            await setSession(response.data.token);
                            Alert.alert('Sucesso!', 'Login realizado com sucesso.');
                            router.replace('/');
                        }
                        


                    } catch (error) {
                        setSession(null);

                    }
                },

                refresh_token: async (token) => {
                    try {
                        const response = await api.post('/auth/refresh_token', { token });
                        setSession(response.data.token);


                    } catch (error) {
                        setSession(null);


                    }

                },


                signOut: () => {
                    setSession(null);
                },
                session,
                isLoading,
            }}>
            {children}
        </AuthContext.Provider>
    );
}
