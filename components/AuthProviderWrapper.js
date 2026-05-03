'use client';

/**
 * AuthProviderWrapper — Client Component boundary for Firebase Auth.
 *
 * By placing this import inside a 'use client' file, Next.js ensures
 * that firebase.js (and all Firebase SDK code) is ONLY ever executed
 * in the browser, never during server-side rendering or static generation.
 *
 * This is the standard Next.js App Router pattern for third-party SDKs
 * that depend on browser globals (window, indexedDB, etc.).
 */

import { AuthProvider } from '@/contexts/AuthContext';

export default function AuthProviderWrapper({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
