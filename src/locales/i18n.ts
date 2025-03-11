import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import ptBr from '@/locales/pt_br.json';

const translations = {
  en,
  'pt-BR': ptBr,
};

i18n.use(initReactI18next).init({
  lng: 'en',
  resources: translations,
  react: {
    useSuspense: false,
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
