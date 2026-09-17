import { Platform } from 'react-native';

const STORAGE_KEY = 'memobelc_affiliate_ref';

function webStorage() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return window.localStorage;
}

export function captureAffiliateRefFromUrl() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const ref = (params.get('ref') || params.get('affiliate_code') || '').trim().toUpperCase();
  if (ref) setStoredAffiliateCode(ref);
}

export function setStoredAffiliateCode(code: string) {
  const value = code.trim().toUpperCase();
  if (!value) return;
  const storage = webStorage();
  if (storage) {
    storage.setItem(STORAGE_KEY, value);
    return;
  }
  try {
    const SecureStore = require('expo-secure-store');
    SecureStore.setItemAsync(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}

export function getStoredAffiliateCode(): string | undefined {
  const storage = webStorage();
  if (storage) {
    return storage.getItem(STORAGE_KEY) || undefined;
  }
  return undefined;
}
