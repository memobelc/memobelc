import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import ptBr from '@/locales/pt_br.json';
import es from '@/locales/es.json';
import de from '@/locales/de.json';
import zh from '@/locales/zh.json';
import { getDeviceLocale } from '@/utils/deviceLocale';

export const supportedLanguages = [
  { code: 'en', label: 'English' },
  { code: 'pt-BR', label: 'Português' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'zh', label: '中文' },
] as const;

export type SupportedLanguageCode = (typeof supportedLanguages)[number]['code'];

const translations = {
  en,
  'pt-BR': ptBr,
  es,
  de,
  zh,
};

i18n.use(initReactI18next).init({
  lng: getDeviceLocale(),
  fallbackLng: 'en',
  supportedLngs: ['en', 'pt-BR', 'es', 'de', 'zh'],
  resources: translations,
  react: {
    useSuspense: false,
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
