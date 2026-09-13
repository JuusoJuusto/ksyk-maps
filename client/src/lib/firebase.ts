import { initializeApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBf6tU9tcOHG6COqj9bziYB__rPh58fmeo",
  authDomain: "ksykmaps-7110c.firebaseapp.com",
  projectId: "ksykmaps-7110c",
  storageBucket: "ksykmaps-7110c.firebasestorage.app",
  messagingSenderId: "858419157963",
  appId: "1:858419157963:web:41a7a360ac9b68da3bf44e",
  measurementId: "G-Y2SHKZ2T8N",
};

export const firebaseApp = initializeApp(firebaseConfig);

// Analytics is browser-only; guard against SSR / test environments.
export let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
  try {
    analytics = getAnalytics(firebaseApp);
  } catch {
    // Non-critical — silently skip if analytics can't be initialised
    // (e.g. ad-blockers, restricted environments).
  }
}
