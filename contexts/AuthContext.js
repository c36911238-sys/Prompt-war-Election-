'use client';

/**
 * AuthContext — Firebase Auth state for the entire application.
 *
 * Provides:
 *   user           — Firebase User object or null
 *   loading        — true while auth state is being determined
 *   signInWithGoogle()
 *   signInWithEmail(email, password)
 *   signUpWithEmail(email, password)
 *   logout()
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  // Initialise loading=false immediately when Firebase is unconfigured (auth===null).
  // This avoids a synchronous setState inside the effect body.
  const [loading, setLoading] = useState(auth !== null);

  // Subscribe to Firebase auth state changes (browser only).
  // Skipped entirely when Firebase is unconfigured.
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    return signInWithPopup(auth, googleProvider);
  }, []);

  const signInWithEmail = useCallback(async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUpWithEmail = useCallback(async (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  }, []);

  const logout = useCallback(async () => {
    return signOut(auth);
  }, []);

  // Memoised context value to prevent unnecessary re-renders downstream.
  const authContextValue = useMemo(
    () => ({ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, logout }),
    [user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, logout]
  );

  return <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook — consume auth state anywhere in the app.
 * Throws if used outside of <AuthProvider>.
 */
export function useAuth() {
  const authContext = useContext(AuthContext);
  if (authContext === null || authContext === undefined) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }
  return authContext;
}
