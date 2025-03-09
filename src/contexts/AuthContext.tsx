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
  image?: string;
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
  const [dateSession, setDateSession] = useStorageStateSession('date_session');
  const [isLoading, setIsLoading] = useStorageStateLoading();
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (session) {
      const lastSessionDate = dateSession ? new Date(dateSession) : null;
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      if (!lastSessionDate || lastSessionDate < twentyFourHoursAgo) {
        (async () => {
          try {
            setIsLoading(true);
            const response = await api.post('/auth/refresh_token', {
              token: session,
            });
            if (response.data) {
              setSession(response.data.token);
              setDateSession(new Date().toISOString());
              setUserInfo({
                email: response.data.email,
                name: response.data.name,
                token: response.data.token,
                user_id: response.data.user_id,
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
            } else {
              await setSession(response.data.token);
              setDateSession(new Date().toISOString());

              setUserInfo({
                email: response.data.email,
                name: response.data.name,
                token: response.data.token,
                user_id: response.data.user_id,
              });

              router.replace('/');
              setIsLoading(false);
            }
          } catch (error) {
            if (error instanceof Error) {
              toast({
                message:
                  error.message === 'Request failed with status code 401'
                    ? 'Invalid email or password, please enter again.'
                    : error.message,
                variant: 'destructive',
                showProgress: true,
              });
            } else {
              toast({
                message: `An unexpected error has occurred`,
                variant: 'destructive',
              });
            }

            setUserInfo(null);
            setSession(null);
            setDateSession(null);
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
              setDateSession(new Date().toISOString());
              setUserInfo({
                email: response.data.email,
                name: response.data.name,
                token: response.data.token,
                user_id: response.data.user_id,
              });

              setTimeout(() => {
                router.replace('/');
              }, 0);
            }
          } catch (error) {
            setSession(null);
            setDateSession(null);
            setUserInfo(null);
            setTimeout(() => {
              router.replace('/login');
            }, 0);
          } finally {
            setIsLoading(false);
          }
        },
        verify_code: async (token: string, code: string) => {
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
            setDateSession(new Date().toISOString());

            await new Promise((resolve) => setTimeout(resolve, 100));

            router.replace('/');
          } else {
            alert(response.data.message);
            router.replace('/');
          }
        },

        signOut: () => {
          setSession(null);
          setDateSession(null);
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
