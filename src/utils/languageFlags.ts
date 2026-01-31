/** Country codes for Flags API: https://flagsapi.com/{CODE}/flat/64.png */
export const LANGUAGE_FLAG_CODES: Record<string, string> = {
  en: 'US',
  'pt-BR': 'BR',
  es: 'ES',
  de: 'DE',
  zh: 'CN',
};

export function getFlagUri(countryCode: string): string {
  return `https://flagsapi.com/${countryCode}/flat/64.png`;
}
