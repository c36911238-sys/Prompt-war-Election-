/**
 * Firebase client SDK — safe for both SSR and browser.
 *
 * Next.js pre-renders 'use client' components on the server, so this
 * module can be evaluated server-side. All Firebase initialisation is
 * therefore made conditional on `typeof window !== 'undefined'`.
 * Server-side callers receive `null` and must guard accordingly.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getRemoteConfig } from 'firebase/remote-config';

const isClient = typeof window !== 'undefined';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Only initialise on the client; return null sentinel on the server.
const app = isClient
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null;

/** Firebase Authentication instance (null on server). */
export const auth = isClient && app ? getAuth(app) : null;

/** Pre-built Google OAuth provider. */
export const googleProvider = isClient ? new GoogleAuthProvider() : null;

/** Firestore database instance (null on server). */
export const db = isClient && app ? getFirestore(app) : null;

/**
 * Firebase Analytics — resolves to null on server or unsupported browsers.
 */
export const getFirebaseAnalytics = async () => {
  if (!isClient || !app) return null;
  try {
    const supported = await isSupported();
    if (!supported) return null;
    return getAnalytics(app);
  } catch {
    return null;
  }
};

/**
 * Firebase Remote Config instance (null on server).
 */
export const getFirebaseRemoteConfig = () => {
  if (!isClient || !app) return null;
  try {
    const rc = getRemoteConfig(app);
    rc.settings.minimumFetchIntervalMillis =
      process.env.NODE_ENV === 'production' ? 3600000 : 0;
    return rc;
  } catch {
    return null;
  }
};
