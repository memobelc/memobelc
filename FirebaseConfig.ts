// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyDX1DXOCOTL4Dgf9xpByTZtxMtr9GPXVb8',
  authDomain: 'memobelc.firebaseapp.com',
  projectId: 'memobelc',
  storageBucket: 'memobelc.firebasestorage.app',
  messagingSenderId: '774031264210',
  appId: '1:774031264210:web:d166856a3ce21c8871a00b',
  measurementId: 'G-FB5L025723',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
