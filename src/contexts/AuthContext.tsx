import {
  useEffect,
  useContext,
  createContext,
  type PropsWithChildren,
  useState,
  useCallback,
} from 'react';
import {
  useStorageStateSession,
  useStorageStateLoading,
} from '@/storage/useStorageState';
import api from '@/services/api';
import { useToast } from '@/components/Toast';
import i18n from '@/locales/i18n';
import { emptyAddress, profileApi, type UserAddress } from '@/services/profile';

export type User = {
  email: string;
  name: string;
  token: string;
  user_id: string;
  premium: boolean;
  image?: string;
  role?: string;
  roles?: string[];
  must_change_password?: boolean;
  cpf_cnpj?: string;
  coins?: number;
  address?: UserAddress;
};

function parseUserRoles(data: { role?: string; roles?: string[] }): string[] {
  if (Array.isArray(data.roles) && data.roles.length > 0) {
    return data.roles;
  }
  return [data.role || 'user'];
}

function userFromAuthResponse(data: {
  email: string;
  name: string;
  token: string;
  user_id: string;
  premium?: boolean;
  role?: string;
  roles?: string[];
  must_change_password?: boolean;
}): User {
  const roles = parseUserRoles(data);
  return {
    email: data.email,
    name: data.name,
    token: data.token,
    user_id: data.user_id,
    premium: data.premium || false,
    role: data.role || roles[0] || 'user',
    roles,
    must_change_password: Boolean(data.must_change_password),
  };
}

async function hydrateUserProfile(user: User): Promise<User> {
  try {
    const response = await profileApi.me(user.token);
    const profile = response.data;
    return {
      ...user,
      name: profile.name || user.name,
      email: profile.email || user.email,
      image: profile.image || undefined,
      cpf_cnpj: profile.cpf_cnpj || undefined,
      coins: profile.coins ?? 0,
      address: profile.address || emptyAddress(),
    };
  } catch {
    return user;
  }
}

type SignInResult = {
  success: boolean;
  user?: User;
  pending?: { token: string };
  error?: string;
};

const AuthContext = createContext<{
  signIn: (email: string, password: string) => Promise<SignInResult>;
  acceptAuth: (data: {
    token: string;
    name: string;
    email: string;
    user_id: string;
    role?: string;
    roles?: string[];
    must_change_password?: boolean;
  }) => Promise<void>;
  signOut: () => void;
  refresh_token: () => Promise<{ success: boolean; needsLogin?: boolean }>;
  verify_code: (token: any, code: string) => Promise<{ success: boolean; error?: string }>;
  updateUserInfo: (partial: Partial<User>) => void;
  session?: string | null;
  isLoading: boolean;
  userInfo?: User | null;
}>({
  signIn: async () => ({ success: false }),
  acceptAuth: async () => undefined,
  signOut: () => null,
  refresh_token: async () => ({ success: false }),
  verify_code: async () => ({ success: false }),
  updateUserInfo: () => undefined,
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
  const { toast } = useToast();

  const updateUserInfo = useCallback((partial: Partial<User>) => {
    setUserInfo((current) => (current ? { ...current, ...partial } : current));
  }, []);

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
            const user = userFromAuthResponse(response.data);
            setUserInfo(await hydrateUserProfile(user));
          }
        } catch (error) {
          setSession(null);
          setUserInfo(null);
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
              const pendingToken = Array.isArray(response.data.pending) 
                ? response.data.pending[1] 
                : response.data.pending.token || response.data.pending;
              
              return {
                success: false,
                pending: { token: pendingToken },
              };
            }

            await setSession(response.data.token);

            const user = await hydrateUserProfile(userFromAuthResponse(response.data));

            setUserInfo(user);

            return { success: true, user };
          } catch (error: any) {
            let errorMessage = i18n.t('An unexpected error has occurred');
            
            if (error?.response?.status === 401) {
              errorMessage = i18n.t('Invalid email or password, please enter again.');
            } else if (error?.response?.data?.error) {
              errorMessage = error.response.data.error;
            } else if (error?.message) {
              errorMessage = error.message;
            }

            toast({
              message: errorMessage,
              variant: 'destructive',
              showProgress: true,
            });

            setUserInfo(null);
            setSession(null);
            return { success: false, error: errorMessage };
          } finally {
            setIsLoading(false);
          }
        },

        acceptAuth: async (data) => {
          await setSession(data.token);
          setUserInfo(await hydrateUserProfile(userFromAuthResponse({ ...data, token: data.token })));
        },

        refresh_token: async () => {
          if (!session) return { success: false, needsLogin: true };
          try {
            setIsLoading(true);
            const response = await api.post('/auth/refresh_token', {
              token: session,
            });
            if (response.data) {
              setSession(response.data.token);

              setUserInfo(await hydrateUserProfile(userFromAuthResponse(response.data)));

              return { success: true };
            }
            return { success: false, needsLogin: true };
          } catch (error) {
            setSession(null);
            setUserInfo(null);
            return { success: false, needsLogin: true };
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
              if (response.data?.email && response.data?.user_id) {
                setUserInfo(await hydrateUserProfile(userFromAuthResponse(response.data)));
              }

              await new Promise((resolve) => setTimeout(resolve, 100));

              toast({
                message: i18n.t('Account verified successfully!'),
                variant: 'success',
              });

              return { success: true };
            }
            return { success: false, error: i18n.t('Verification failed') };
          } catch (error: any) {
            if (error.response?.status === 401) {
              toast({
                message: i18n.t('Incorrect verification code!'),
                variant: 'destructive',
              });
              return { success: false, error: i18n.t('Invalid code') };
            } else {
              toast({
                message: i18n.t('An unexpected error has occurred.'),
                variant: 'destructive',
              });
              return { success: false, error: i18n.t('Unexpected error') };
            }
          }
        },
        updateUserInfo,
        signOut: () => {
          const token = userInfo?.token;

          // Tenta informar o backend para remover tokens de push deste usuário
          if (token && userInfo?.user_id) {
            api
              .post(
                '/auth/logout',
                {},
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                },
              )
              .catch(() => {
                // silencioso – se falhar, apenas segue o fluxo local de logout
              });
          }

          setSession(null);
          setUserInfo(null);
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
