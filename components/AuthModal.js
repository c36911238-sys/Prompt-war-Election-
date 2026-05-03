'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import './AuthModal.css';

/** Google "G" logo SVG for the sign-in button. */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
    />
    <path
      fill="#FBBC05"
      d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
    />
    <path
      fill="#EA4335"
      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.169 6.656 3.58 9 3.58z"
    />
  </svg>
);

/** Maps Firebase Auth error codes to user-friendly messages. */
const FIREBASE_ERROR_MESSAGES = {
  'auth/invalid-credential':   'Invalid email or password.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password':        'Password must be at least 6 characters.',
  'auth/user-not-found':       'No account found with this email.',
  'auth/wrong-password':       'Incorrect password. Please try again.',
};

/**
 * AuthModal — Email/Password + Google Sign-In modal.
 *
 * @param {{ onClose: () => void }} props
 */
const AuthModal = React.memo(function AuthModal({ onClose }) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();

  const [tab, setTab]         = useState('login');   // 'login' | 'signup'
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [busy, setBusy]       = useState(false);

  const clearError = useCallback(() => setError(''), []);

  const handleTabChange = useCallback((nextTab) => {
    setTab(nextTab);
    clearError();
  }, [clearError]);

  const handleGoogleSignIn = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [signInWithGoogle, onClose]);

  const handleEmailSubmit = useCallback(async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (tab === 'login') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      onClose();
    } catch (err) {
      setError(FIREBASE_ERROR_MESSAGES[err.code] ?? 'Authentication failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [tab, email, password, signInWithEmail, signUpWithEmail, onClose]);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to Election Process Assistant"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-card animate-fade-in">
        <button className="modal-close" onClick={onClose} aria-label="Close sign-in modal">
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2 className="text-gradient" style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>
          Welcome Back
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.2rem' }}>
          Sign in to save your conversation history.
        </p>

        <div className="auth-tabs" role="tablist">
          {['login', 'signup'].map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={`auth-tab ${tab === t ? 'active' : ''}`}
              onClick={() => handleTabChange(t)}
            >
              {t === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Google */}
        <button
          className={`btn-google ${busy ? 'auth-loading' : ''}`}
          onClick={handleGoogleSignIn}
          disabled={busy}
          aria-label="Sign in with Google"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="auth-divider" aria-hidden="true">or</div>

        {/* Email / Password */}
        <form className={`auth-form ${busy ? 'auth-loading' : ''}`} onSubmit={handleEmailSubmit} noValidate>
          {error && (
            <div className="auth-error" role="alert" aria-live="assertive">
              {error}
            </div>
          )}

          <div>
            <label className="auth-label" htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              className="input-glass"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              aria-required="true"
            />
          </div>

          <div>
            <label className="auth-label" htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              className="input-glass"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              required
              aria-required="true"
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn-primary auth-submit"
            disabled={busy || !email || !password}
          >
            {busy ? 'Please wait…' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
});

export default AuthModal;
