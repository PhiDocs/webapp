// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

function requiredEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeMeasurementId(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (normalized === 'undefined' || normalized === 'null') return undefined;
  return /^G-[A-Z0-9]+$/i.test(normalized) ? normalized : undefined;
}

const firebaseMeasurementId = normalizeMeasurementId(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID);

// Public Firebase Web config is read from NEXT_PUBLIC_* env vars.
const firebaseConfig = {
  apiKey: requiredEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, "NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain: requiredEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: requiredEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, "NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: requiredEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: requiredEnv(
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
  ),
  appId: requiredEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID, "NEXT_PUBLIC_FIREBASE_APP_ID"),
};


// --- Client-side Initialization ---
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const firestoreDatabaseId = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID || "(default)";
const db = getFirestore(app, firestoreDatabaseId);
const auth = getAuth(app);
const storage = getStorage(app);

export { 
  app, 
  db, 
  auth, 
  storage,
  firebaseMeasurementId,
};
