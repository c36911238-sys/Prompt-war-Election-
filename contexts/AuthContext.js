'use client';

/**
 * AuthContext — Enhanced Firebase Auth state with security features.
 *
 * Provides:
 *   user           — Firebase User object or null
 *   loading        — true while auth state is being determined
 *   signInWithGoogle()
 *   signInWithEmail(email, password)
 *   signUpWithEmail(email, password)
 *   logout()
 *   
 * Security Features:
 *   - Session timeout management
 *   - Failed login attempt tracking
 *   - Account lockout protection
 *   - Secure token refresh
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
  onIdTokenChanged,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { SecurityMonitor } from '@/lib/security';
import { validateEmail, validatePassword } from '@/lib/validation';

const AuthContext = createContext(null);

// Security configuration
const SECURITY_CONFIG = {
  maxFailedAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  tokenRefreshInterval: 55 * 60 * 1000, // 55 minutes
};

// Failed login attempts tracking
const failedAttempts = new Map();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(auth !== null);
  const [sessionExpiry, setSessionExpiry] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  // Check if account is locked due to failed attempts
  const checkAccountLock = useCallback((identifier) => {
    const attempts = failedAttempts.get(identifier);
    if (!attempts) return false;

    const now = Date.now();
    if (now - attempts.lastAttempt > SECURITY_CONFIG.lockoutDuration) {
      failedAttempts.delete(identifier);
      return false;
    }

    return attempts.count >= SECURITY_CONFIG.maxFailedAttempts;
  }, []);

  // Record failed login attempt
  const recordFailedAttempt = useCallback((identifier) => {
    const now = Date.now();
    const attempts = failedAttempts.get(identifier) || { count: 0, lastAttempt: now };
    
    attempts.count++;
    attempts.lastAttempt = now;
    failedAttempts.set(identifier, attempts);

    if (attempts.count >= SECURITY_CONFIG.maxFailedAttempts) {
      setIsLocked(true);
      SecurityMonitor.logSecurityEvent('account_locked', {
        identifier,
        attempts: attempts.count,
      });
    }
  }, []);

  // Clear failed attempts on successful login
  const clearFailedAttempts = useCallback((identifier) => {
    failedAttempts.delete(identifier);
    setIsLocked(false);
  }, []);

  // Session management
  useEffect(() => {
    if (user && sessionExpiry && Date.now() > sessionExpiry) {
      SecurityMonitor.logSecurityEvent('session_expired', {
        userId: user.uid,
      });
      signOut(auth);
    }
  }, [user, sessionExpiry]);

  // Token refresh management
  useEffect(() => {
    if (!auth || !user) return;

    const refreshToken = setInterval(async () => {
      try {
        await user.getIdToken(true); // Force refresh
      } catch (error) {
        SecurityMonitor.logSecurityEvent('token_refresh_failed', {
          userId: user.uid,
          error: error.message,
        });
      }
    }, SECURITY_CONFIG.tokenRefreshInterval);

    return () => clearInterval(refreshToken);
  }, [user]);

  // Enhanced auth state monitoring
  useEffect(() => {
    if (!auth) return;
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Set session expiry
        const expiry = Date.now() + SECURITY_CONFIG.sessionTimeout;
        setSessionExpiry(expiry);
        
        // Log successful authentication
        SecurityMonitor.logSecurityEvent('user_authenticated', {
          userId: firebaseUser.uid,
          method: 'firebase_auth',
        });
      } else {
        setSessionExpiry(null);
      }
      
      setUser(firebaseUser);
      setLoading(false);
    });

    // Also monitor ID token changes for additional security
    const unsubscribeToken = onIdTokenChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Verify token validity
        firebaseUser.getIdTokenResult().then((tokenResult) => {
          const now = Date.now();
          const tokenExpiry = new Date(tokenResult.expirationTime).getTime();
          
          if (now >= tokenExpiry) {
            SecurityMonitor.logSecurityEvent('expired_token_detected', {
              userId: firebaseUser.uid,
            });
            signOut(auth);
          }
        });
      }
    });

    return () => {
      unsubscribe();
      unsubscribeToken();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      if (!googleProvider) throw new Error('Google provider not configured');
      
      const result = await signInWithPopup(auth, googleProvider);
      
      SecurityMonitor.logSecurityEvent('google_signin_success', {
        userId: result.user.uid,
      });
      
      return result;
    } catch (error) {
      SecurityMonitor.logSecurityEvent('google_signin_failed', {
        error: error.message,
        code: error.code,
      });
      throw error;
    }
  }, []);

  const signInWithEmail = useCallback(async (email, password) => {
    try {
      // Validate inputs
      const validatedEmail = validateEmail(email);
      
      // Check account lock
      if (checkAccountLock(validatedEmail)) {
        throw new Error('Account temporarily locked due to multiple failed attempts');
      }
      
      const result = await signInWithEmailAndPassword(auth, validatedEmail, password);
      
      // Clear failed attempts on success
      clearFailedAttempts(validatedEmail);
      
      SecurityMonitor.logSecurityEvent('email_signin_success', {
        userId: result.user.uid,
      });
      
      return result;
    } catch (error) {
      const validatedEmail = validateEmail(email);
      recordFailedAttempt(validatedEmail);
      
      SecurityMonitor.logSecurityEvent('email_signin_failed', {
        email: validatedEmail,
        error: error.message,
        code: error.code,
      });
      
      throw error;
    }
  }, [checkAccountLock, clearFailedAttempts, recordFailedAttempt]);

  const signUpWithEmail = useCallback(async (email, password) => {
    try {
      // Validate inputs
      const validatedEmail = validateEmail(email);
      validatePassword(password);
      
      const result = await createUserWithEmailAndPassword(auth, validatedEmail, password);
      
      SecurityMonitor.logSecurityEvent('email_signup_success', {
        userId: result.user.uid,
      });
      
      return result;
    } catch (error) {
      SecurityMonitor.logSecurityEvent('email_signup_failed', {
        email: email,
        error: error.message,
        code: error.code,
      });
      
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const userId = user?.uid;
      await signOut(auth);
      
      SecurityMonitor.logSecurityEvent('user_logout', {
        userId,
      });
      
      // Clear session data
      setSessionExpiry(null);
      setIsLocked(false);
      
    } catch (error) {
      SecurityMonitor.logSecurityEvent('logout_failed', {
        error: error.message,
      });
      throw error;
    }
  }, [user]);

  // Enhanced context value with security features
  const authContextValue = useMemo(
    () => ({ 
      user, 
      loading, 
      isLocked,
      sessionExpiry,
      signInWithGoogle, 
      signInWithEmail, 
      signUpWithEmail, 
      logout 
    }),
    [user, loading, isLocked, sessionExpiry, signInWithGoogle, signInWithEmail, signUpWithEmail, logout]
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
