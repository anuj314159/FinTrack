// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyApp6LIzs8vOBnPjDLhbFBliB5ziYQgr1I",
    authDomain: "trackmoney-14f5c.firebaseapp.com",
    projectId: "trackmoney-14f5c",
    storageBucket: "trackmoney-14f5c.firebasestorage.app",
    messagingSenderId: "395591440315",
    appId: "1:395591440315:android:2f39a91ce13bcef56d969e",
};
export const API_KEY = "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";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Firebase Auth with persistence
// Use initializeAuth for React Native instead of getAuth directly for persistence setup
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage) // Store auth state in AsyncStorage
});


export { db, auth, app }; // Export db and auth