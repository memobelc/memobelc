import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import ptBr from '@/locales/pt_br.json';
import es from '@/locales/es.json';
import de from '@/locales/de.json';
import zh from '@/locales/zh.json';

const translations = {
  en,
  'pt-BR': ptBr,
  es,
  de,
  zh,
};

i18n.use(initReactI18next).init({
  lng: 'pt-BR',
  resources: translations,
  react: {
    useSuspense: false,
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
