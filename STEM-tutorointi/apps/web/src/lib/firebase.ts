/**
 * Firebase Client Configuration
 * 
 * This file initializes Firebase for client-side use (browser).
 * Used for Authentication, Firestore, and other client-side Firebase services.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, Analytics, isSupported } from 'firebase/analytics';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate configuration
const validateConfig = () => {
  const requiredKeys = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];

  const missingKeys = requiredKeys.filter(
    (key) => !firebaseConfig[key as keyof typeof firebaseConfig]
  );

  if (missingKeys.length > 0) {
    console.error('Missing Firebase configuration keys:', missingKeys);
    throw new Error(
      `Missing Firebase configuration. Please check your environment variables: ${missingKeys.join(', ')}`
    );
  }
};

// Initialize Firebase (singleton pattern)
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let analytics: Analytics | null = null;

/**
 * Initialize Firebase app
 * Only initializes once, returns existing instance on subsequent calls
 */
export const initializeFirebase = (): FirebaseApp => {
  if (!app) {
    validateConfig();
    
    // Check if Firebase is already initialized
    const apps = getApps();
    if (apps.length > 0) {
      app = apps[0];
    } else {
      app = initializeApp(firebaseConfig);
    }
  }
  return app;
};

/**
 * Get Firebase Auth instance
 */
export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    const firebaseApp = initializeFirebase();
    auth = getAuth(firebaseApp);
  }
  return auth;
};

/**
 * Get Firestore instance
 */
export const getFirebaseFirestore = (): Firestore => {
  if (!db) {
    const firebaseApp = initializeFirebase();
    db = getFirestore(firebaseApp);
  }
  return db;
};

/**
 * Get Firebase Analytics instance (only in browser)
 */
export const getFirebaseAnalytics = async (): Promise<Analytics | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!analytics) {
    const firebaseApp = initializeFirebase();
    const supported = await isSupported();
    if (supported) {
      analytics = getAnalytics(firebaseApp);
    }
  }
  return analytics;
};

// Export initialized instances
export { app, auth, db, analytics };

// Export Firebase app for direct use
export const firebaseApp = initializeFirebase();
export const firebaseAuth = getFirebaseAuth();
export const firebaseDb = getFirebaseFirestore();
