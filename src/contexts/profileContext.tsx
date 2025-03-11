import { useContext, createContext, type PropsWithChildren } from 'react';
import { useStorageStateSession } from '@/storage/useStorageState';

const ProfileContext = createContext<{
  language?: string | null;
  setLanguage: (lang: string) => void;
}>({
  language: null,
  setLanguage: () => false,
});

export function useProfile() {
  const value = useContext(ProfileContext);
  if (process.env.NODE_ENV !== 'production') {
    if (!value) {
      throw new Error('useProfile must be wrapped in a <ProfileProvider />');
    }
  }

  return value;
}

export function ProfileProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = useStorageStateSession('language');

  return (
    <ProfileContext.Provider
      value={{
        language,
        setLanguage,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}
