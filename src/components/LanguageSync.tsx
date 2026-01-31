import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfile } from '@/contexts/profileContext';
import { getDeviceLocale } from '@/utils/deviceLocale';

/**
 * Syncs language to i18n: uses stored language when set,
 * otherwise uses device locale (and persists it) so the first option is device language.
 * Renders nothing; must be mounted inside ProfileProvider.
 */
export function LanguageSync() {
  const { language } = useProfile();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (language != null) {
      if (language !== i18n.language) {
        i18n.changeLanguage(language);
      }
    } else {
      const device = getDeviceLocale();
      if (i18n.language !== device) {
        i18n.changeLanguage(device);
      }
    }
  }, [language, i18n]);

  return null;
}
