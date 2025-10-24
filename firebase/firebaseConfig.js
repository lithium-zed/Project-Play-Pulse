import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, getDocs } from 'firebase/firestore/lite';
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
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
const analytics = getAnalytics(app);
const db = getFirestore(app);
const database = getDatabase(app);
const getAuthApp = getAuth(app);

export { app, analytics, db, database, getAuthApp };