import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore/lite';
import { getDatabase } from "firebase/database";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
// Optionally import the services that you want to use
// import {...} from 'firebase/auth';
// import {...} from 'firebase/database';
// import {...} from 'firebase/firestore';
// import {...} from 'firebase/functions';
// import {...} from 'firebase/storage';

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBx4N57heX9B5ReQp-cOvo9ntUfmppl5FU",
  authDomain: "play-pulse-68ff9.firebaseapp.com",
  databaseURL: "https://play-pulse-68ff9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "play-pulse-68ff9",
  storageBucket: "play-pulse-68ff9.firebasestorage.app",
  messagingSenderId: "526875205839",
  appId: "1:526875205839:web:6bbdcb6cca8e36989657ba",
  measurementId: "G-2ZV9LDEBT1"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const database = getDatabase(app);

// Initialize auth with React Native AsyncStorage persistence when available.
// We attempt to add an optional encryption layer using expo-secure-store to
// store the AES key and crypto-js for AES encryption. If those packages are
// not installed, we fall back to using AsyncStorage unencrypted. If
// @react-native-async-storage/async-storage is not available, we fall back to
// memory persistence (getAuth) and warn.

let getAuthApp;
try {
  // Try to require AsyncStorage (this will throw if the package isn't installed)
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;

  // Helper to create an encrypted wrapper around AsyncStorage when possible
  const tryCreateEncryptedWrapper = () => {
    try {
      const SecureStore = require('expo-secure-store');
      const CryptoJS = require('crypto-js');

      const KEY_NAME = 'play_pulse_auth_enc_key_v1';

      // get or create a secret key stored in SecureStore
      const getOrCreateKey = async () => {
        let key = await SecureStore.getItemAsync(KEY_NAME);
        if (!key) {
          // generate 32-byte random hex key
          const random = CryptoJS.lib.WordArray.random(32);
          key = random.toString();
          await SecureStore.setItemAsync(KEY_NAME, key);
        }
        return key;
      };

      const wrapper = {
        async getItem(k) {
          try {
            const stored = await AsyncStorage.getItem(k);
            if (!stored) return null;
            const secret = await getOrCreateKey();
            const bytes = CryptoJS.AES.decrypt(stored, secret);
            const decrypted = bytes.toString(CryptoJS.enc.Utf8);
            // if decryption yields an empty string, fall back to stored value
            return decrypted || stored;
          } catch (e) {
            console.warn('Encrypted storage getItem failed, falling back to plain value', e);
            return AsyncStorage.getItem(k);
          }
        },
        async setItem(k, v) {
          try {
            const secret = await getOrCreateKey();
            const cipher = CryptoJS.AES.encrypt(v, secret).toString();
            await AsyncStorage.setItem(k, cipher);
          } catch (e) {
            console.warn('Encrypted storage setItem failed, saving plain value', e);
            await AsyncStorage.setItem(k, v);
          }
        },
        async removeItem(k) {
          return AsyncStorage.removeItem(k);
        }
      };

      return wrapper;
    } catch (e) {
      // crypto or secure store not available
      return null;
    }
  };

  const encryptedWrapper = tryCreateEncryptedWrapper();
  const storageForAuth = encryptedWrapper ?? AsyncStorage;

  // initializeAuth with React Native persistence
  getAuthApp = initializeAuth(app, {
    persistence: getReactNativePersistence(storageForAuth),
  });
} catch (e) {
  console.warn('AsyncStorage not available for Firebase Auth persistence, using memory persistence. To enable persistence install @react-native-async-storage/async-storage', e);
  // fallback to default getAuth (memory persistence)
  getAuthApp = getAuth(app);
}

export { app, db, database, getAuthApp };