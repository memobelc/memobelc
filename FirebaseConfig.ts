// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

function env(name: string): string | undefined {
  const v = process.env[name];
  if (v == null) return undefined;
  const t = v.trim();
  if (t.length >= 2) {
    const q = t[0];
    if ((q === '"' || q === "'") && t[t.length - 1] === q) {
      return t.slice(1, -1).trim();
    }
  }
  return t;
}

// Configuração via .env (EXPO_PUBLIC_* — embutida no build no web/native)
const firebaseConfig = {
  apiKey: env('EXPO_PUBLIC_FIREBASE_API_KEY') ?? '',
  authDomain: env('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN') ?? '',
  projectId: env('EXPO_PUBLIC_FIREBASE_PROJECT_ID') ?? '',
  storageBucket: env('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET') ?? '',
  messagingSenderId: env('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID') ?? '',
  appId: env('EXPO_PUBLIC_FIREBASE_APP_ID') ?? '',
  measurementId: env('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID') ?? '',
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
