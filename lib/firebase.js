/**
 * Firebase client SDK — safe for SSR and graceful when unconfigured.
 *
 * Initialization requires NEXT_PUBLIC_FIREBASE_* environment variables.
 * When they are absent (e.g. local dev without .env.local, or a Vercel
 * deployment before env vars are added), ALL exports return null and the
 * app continues to work — auth, Firestore and Analytics are simply skipped.
 *
 * Two additional guards are applied:
 *  1. isClient  — Firebase SDK must not run during SSR / static generation.
 *  2. isConfigured — prevents auth/invalid-api-key when env vars are missing.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getRemoteConfig } from 'firebase/remote-config';

const isClient = typeof window !== 'undefined';

/** True only when all required Firebase env vars are present. */
const isConfigured = !!(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID
);

/** Initialised Firebase App, or null when unconfigured / on the server. */
const app = isClient && isConfigured
  ? (getApps().length ? getApp() : initializeApp({
      apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    }))
  : null;

if (isClient && !isConfigured) {
  console.info(
    '[Firebase] Environment variables not configured. ' +
    'Auth, Firestore and Analytics are disabled. ' +
    'See .env.local.example for setup instructions.'
  );
}

/** Firebase Auth instance, or null when unconfigured. */
export const auth = app ? getAuth(app) : null;

/** Google OAuth provider, or null when unconfigured. */
export const googleProvider = app ? new GoogleAuthProvider() : null;

/** Firestore instance, or null when unconfigured. */
export const db = app ? getFirestore(app) : null;

/**
 * Resolve the Firebase Analytics instance.
 * Returns null when unconfigured, on the server, or in unsupported browsers.
 */
export const getFirebaseAnalytics = async () => {
  if (!app) return null;
  try {
    const supported = await isSupported();
    return supported ? getAnalytics(app) : null;
  } catch {
    return null;
  }
};

/**
 * Return the Firebase Remote Config instance, or null when unconfigured.
 */
export const getFirebaseRemoteConfig = () => {
  if (!app) return null;
  try {
    const rc = getRemoteConfig(app);
    rc.settings.minimumFetchIntervalMillis =
      process.env.NODE_ENV === 'production' ? 3600000 : 0;
    return rc;
  } catch {
    return null;
  }
};
