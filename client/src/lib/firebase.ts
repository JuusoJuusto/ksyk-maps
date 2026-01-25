// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration - HARDCODED FOR RELIABILITY
const firebaseConfig = {
    apiKey: "AIzaSyBXzinZ-dcfF_n5WqBHzl88UqwnxLYF8tw",
    authDomain: "ksyk-maps.firebaseapp.com",
    projectId: "ksyk-maps",
    storageBucket: "ksyk-maps.firebasestorage.app",
    messagingSenderId: "95947778891",
    appId: "1:95947778891:web:7c878e8b1b700ec0c816ce",
    measurementId: "G-M5YV8NBBPL"
};

console.log('🔥 Firebase initializing...');

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

console.log('✅ Firebase initialized successfully!');

export default app;