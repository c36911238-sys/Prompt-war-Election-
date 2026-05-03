/**
 * Firebase client SDK initialisation.
 *
 * All Firebase products are exported from this single module so the app
 * always uses one shared SDK instance (avoids the "already initialised"
 * error in Next.js hot-reload environments).
 *
 * Required environment variables (NEXT_PUBLIC_* so they reach the browser):
 *   NEXT_PUBLIC_FIREBASE_API_KEY
 *   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 *   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 *   NEXT_PUBLIC_FIREBASE_APP_ID
 *   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getRemoteConfig } from 'firebase/remote-config';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Prevent duplicate initialisation in Next.js dev mode (module hot-reload).
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/** Firebase Authentication instance. */
export const auth = getAuth(app);

/** Pre-built Google OAuth provider (used by AuthContext). */
export const googleProvider = new GoogleAuthProvider();

/** Firestore database instance. */
export const db = getFirestore(app);

/**
 * Firebase Analytics — only available in browser environments.
 * Returns null on the server (SSR) or when not supported.
 */
export const getFirebaseAnalytics = async () => {
  if (typeof window === 'undefined') return null;
  const supported = await isSupported();
  if (!supported) return null;
  return getAnalytics(app);
};

/**
 * Firebase Remote Config instance.
 * Only initialise on the client.
 */
export const getFirebaseRemoteConfig = () => {
  if (typeof window === 'undefined') return null;
  const rc = getRemoteConfig(app);
  // Cache fetched config for 1 hour in production, 0 seconds in dev.
  rc.settings.minimumFetchIntervalMillis =
    process.env.NODE_ENV === 'production' ? 3600000 : 0;
  return rc;
};
