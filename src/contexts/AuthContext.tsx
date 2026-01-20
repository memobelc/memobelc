import {
  useEffect,
  useContext,
  createContext,
  type PropsWithChildren,
  useState,
} from 'react';
import { useRouter } from 'expo-router';
import {
  useStorageStateSession,
  useStorageStateLoading,
} from '@/storage/useStorageState';
import api from '@/services/api';
import { useToast } from '@/components/Toast';

type User = {
  email: string;
  name: string;
  token: string;
  user_id: string;
  premium: boolean;
  image?: string;
  role?: string;
};

const AuthContext = createContext<{
  signIn: (email: string, password: string) => Promise<User | false>;
  signOut: () => void;
  refresh_token: () => void;
  verify_code: (token: any, code: string) => void;
  session?: string | null;
  isLoading: boolean;
  userInfo?: User | null;
}>({
  signIn: async () => false,
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

  useEffect(() => {
    if (session && !userInfo) {
      (async () => {
        try {
          setIsLoading(true);
          const response = await api.post('/auth/refresh_token', {
            token: session,
          });
          if (response.data) {
            setSession(response.data.token);
            setUserInfo({
              email: response.data.email,
              name: response.data.name,
              token: response.data.token,
              user_id: response.data.user_id,
              premium: response.data.premium || false,
              role: response.data.role || 'user',
            });

            router.replace('/');
          }
        } catch (error) {
          setSession(null);
          setUserInfo(null);
          router.replace('/login');
        } finally {
          setIsLoading(false);
        }
      })();
    }
  }, [session]);

  return (
    <AuthContext.Provider
      value={{
        signIn: async (email: string, password: string) => {
          try {
            setIsLoading(true);
            const response = await api.post('/auth/login', { email, password });

            if (response.data.pending) {
              router.push({
                pathname: '/verify-code',
                params: { token: response.data.pending[1] },
              });

              return false;
            }

            await setSession(response.data.token);

            setUserInfo({
              email: response.data.email,
              name: response.data.name,
              token: response.data.token,
              user_id: response.data.user_id,
              premium: response.data.premium || false,
              role: response.data.role || 'teacher',
            });

            router.replace('/');

            return response.data; // SUCESSO
          } catch (error: any) {
            toast({
              message:
                error?.message === 'Request failed with status code 401'
                  ? 'Invalid email or password, please enter again.'
                  : error?.message || 'An unexpected error has occurred',
              variant: 'destructive',
              showProgress: true,
            });

            setUserInfo(null);
            setSession(null);
            return false; // ERRO
          } finally {
            setIsLoading(false);
          }
        },

        refresh_token: async () => {
          if (!session) return;
          try {
            setIsLoading(true);
            const response = await api.post('/auth/refresh_token', {
              token: session,
            });
            if (response.data) {
              setSession(response.data.token);

              setUserInfo({
                email: response.data.email,
                name: response.data.name,
                token: response.data.token,
                user_id: response.data.user_id,
                premium: response.data.premium || false,
                role: response.data.role || 'teacher',
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
          try {
            const response = await api.post(
              '/auth/verify_code',
              { code },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );

            if (response.status === 200) {
              await setSession(response.data.token);

              await new Promise((resolve) => setTimeout(resolve, 100));

              toast({
                message: `Conta verificada com sucesso!`,
                variant: 'success',
              });

              router.replace('/');
            }
          } catch (error: any) {
            if (error.response?.status === 401) {
              toast({
                message: `Código de verificação incorreto!`,
                variant: 'destructive',
              });
            } else {
              toast({
                message: `Ocorreu um erro inesperado.`,
                variant: 'destructive',
              });
              router.replace('/');
            }
          }
        },
        signOut: () => {
          setSession(null);

          setUserInfo(null);
          router.replace('/login');
        },
        session,
        isLoading,
        userInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
