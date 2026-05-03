/**
 * AuthContext unit tests.
 * Verifies that useAuth throws when used outside AuthProvider.
 */

import { renderHook } from '@testing-library/react';
import { useAuth } from '../contexts/AuthContext';

// ─── Mock Firebase Auth ───────────────────────────────────────────────────────
jest.mock('firebase/auth', () => ({
  onAuthStateChanged:          jest.fn(),
  signInWithPopup:             jest.fn(),
  signInWithEmailAndPassword:  jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut:                     jest.fn(),
  GoogleAuthProvider:          jest.fn(),
}));

jest.mock('../lib/firebase', () => ({
  auth:           null,
  googleProvider: null,
}));
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthContext', () => {
  it('useAuth throws when used outside AuthProvider', () => {
    // renderHook without a wrapper → no AuthProvider in tree
    expect(() => renderHook(() => useAuth()))
      .toThrow('useAuth must be used within an AuthProvider');
  });
});
