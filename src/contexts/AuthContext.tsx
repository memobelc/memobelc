import { useContext, createContext, type PropsWithChildren, useState } from 'react';
import { useRouter } from 'expo-router';
import { useStorageStateSession, useStorageStateLoading } from '@/storage/useStorageState';
import api from '@/services/api';
import { useToast } from '@/components/Toast';

type User = {
    email: string;
    name: string;
    token: string;
};

const AuthContext = createContext<{
    signIn: (email: string, password: string) => void;
    signOut: () => void;
    refresh_token: () => void;
    verify_code: (token: any, code: string) => void;
    session?: string | null;
    isLoading: boolean;
    userInfo?: User | null;
}>({
    signIn: () => false,
    signOut: () => null,
    refresh_token: () => false,
    verify_code: () => false,
    session: null,
    isLoading: false,
    userInfo: null,
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
    const [session, setSession] = useStorageStateSession('session');
    const [isLoading, setIsLoading] = useStorageStateLoading();
    const [userInfo, setUserInfo] = useState<User | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    return (
        <AuthContext.Provider
            value={{
                signIn: async (email: string, password: string) => {
                    try {
                        setIsLoading(true);
                        const response = await api.post('/auth/login', { email, password });

                        if (response.data.pending) {
                            router.push({ pathname: '/verify-code', params: { token: response.data.pending[1] } });
                        }
                        else {
                            await setSession(response.data.token);

                            setUserInfo({
                                email: response.data.email,
                                name: response.data.name,
                                token: response.data.token
                            });

                            router.replace('/');
                            setIsLoading(false);
                        }



                    } catch (error) {
                        if (error instanceof Error) {
                            toast({
                                message:
                                    error.message == "Request failed with status code 401"
                                        ? "Invalid email or password, please enter again."
                                        : error.message,
                                variant: 'destructive',
                                showProgress: true
                            });


                        } else {
                            toast({ message: `An unexpected error has occurred`, variant: 'destructive' });

                        }


                        setUserInfo(null);
                        setSession(null);

                    } finally {
                        setIsLoading(false);
                    }
                },

                refresh_token: async () => {
                    if (!session) return;
                    try {
                        setIsLoading(true);
                        const response = await api.post('/auth/refresh_token', { token: session });
                        if (response.data) {
                            setSession(response.data.token);
                            setUserInfo({
                                email: response.data.email,
                                name: response.data.name,
                                token: response.data.token
                            });

                            setTimeout(() => {
                                router.replace('/');
                            }, 0);
                        }
                    } catch (error) {
                        setSession(null);
                        setUserInfo(null);
                        setTimeout(() => {
                            router.replace('/login');
                        }, 0);
                    } finally {
                        setIsLoading(false);
                    }
                },
                verify_code: async (token: string, code: string) => {
                    const response = await api.post('/auth/verify_code', { code }, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    if (response.status == 200) {
                        await setSession(response.data.token);

                        await new Promise(resolve => setTimeout(resolve, 100));

                        router.replace('/');
                    } else {
                        alert(response.data.message);
                        router.replace('/');
                    }
                },


                signOut: () => {
                    setSession(null);
                    setUserInfo(null);
                    router.replace('/login')
                },
                session,
                isLoading,
                userInfo,
            }}>
            {children}
        </AuthContext.Provider>
    );
}


