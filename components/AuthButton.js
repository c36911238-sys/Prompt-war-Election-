'use client';

/**
 * AuthButton — compact header control.
 * Shows: user avatar + name when signed in, "Sign In" button when not.
 */

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';

// Lazy load the modal — only needed on interaction
const AuthModal = dynamic(() => import('./AuthModal'), { ssr: false });

const AuthButton = React.memo(function AuthButton() {
  const { user, logout, loading } = useAuth();
  const [showModal, setShowModal] = useState(false);

  const openModal  = useCallback(() => setShowModal(true),  []);
  const closeModal = useCallback(() => setShowModal(false), []);

  if (loading) return null; // Avoid layout shift during auth resolution

  return (
    <>
      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {user.photoURL && (
            <img
              src={user.photoURL}
              alt={`${user.displayName || 'User'} avatar`}
              width={32}
              height={32}
              style={{ borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)' }}
              referrerPolicy="no-referrer"
            />
          )}
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.displayName || user.email}
          </span>
          <button
            className="btn-secondary"
            onClick={logout}
            aria-label="Sign out"
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            Sign Out
          </button>
        </div>
      ) : (
        <button
          className="btn-primary"
          onClick={openModal}
          aria-label="Sign in to save your history"
          style={{ padding: '8px 18px', fontSize: '0.85rem' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>login</span>
          Sign In
        </button>
      )}

      {showModal && <AuthModal onClose={closeModal} />}
    </>
  );
});

export default AuthButton;
