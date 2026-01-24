// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBXzinZ-dcfF_n5WqBHzl88UqwnxLYF8tw",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ksyk-maps.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ksyk-maps",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ksyk-maps.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "95947778891",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:95947778891:web:7c878e8b1b700ec0c816ce",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-M5YV8NBBPL"
};

// Log config for debugging (remove in production)
console.log('Firebase Config Loaded:', {
    apiKey: firebaseConfig.apiKey ? '✓ Set' : '✗ Missing',
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;