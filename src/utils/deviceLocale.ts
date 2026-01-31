import * as Localization from 'expo-localization';
import { Platform } from 'react-native';

export const SUPPORTED_LANGS = ['en', 'pt-BR', 'es', 'de', 'zh'] as const;
export type SupportedLangCode = (typeof SUPPORTED_LANGS)[number];

/**
 * Maps device locale code to app supported language.
 * Returns a supported code or 'en' as default.
 */
function mapToSupported(localeCode: string): SupportedLangCode {
  const lower = localeCode.toLowerCase().replace('_', '-');
  if (lower.startsWith('pt')) return 'pt-BR';
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('de')) return 'de';
  if (lower.startsWith('zh')) return 'zh';
  if (lower.startsWith('en')) return 'en';
  return 'en';
}

/**
 * Gets device locale and maps to a supported app language.
 * On web uses navigator.language; on native uses expo-localization.
 * Falls back to 'en' if detection fails.
 */
export function getDeviceLocale(): SupportedLangCode {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.language) {
      return mapToSupported(navigator.language);
    }
    return 'en';
  }

  try {
    const locales = Localization.getLocales();
    const first = locales?.[0];
    const code = first?.languageTag ?? first?.languageCode ?? '';
    if (code) return mapToSupported(code);
  } catch {
    // fallback to en
  }

  return 'en';
}
