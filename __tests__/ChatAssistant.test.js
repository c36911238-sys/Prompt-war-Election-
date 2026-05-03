/**
 * ChatAssistant component tests.
 * Covers API failure, loading state, and empty state.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatAssistant from '../components/ChatAssistant';

// ─── Mock AuthContext ─────────────────────────────────────────────────────────
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

// ─── Mock analytics (non-critical, should not affect tests) ──────────────────
jest.mock('../lib/analytics', () => ({
  trackChatSent:       jest.fn(),
  trackLanguageChange: jest.fn(),
  trackTTSPlayback:    jest.fn(),
}));

// ─── Mock Firestore ───────────────────────────────────────────────────────────
jest.mock('../lib/firestore', () => ({
  saveConversation: jest.fn().mockResolvedValue('mock-doc-id'),
}));

// ─── Mock DOMPurify (passthrough) ────────────────────────────────────────────
jest.mock('dompurify', () => ({
  sanitize: (text) => text,
}));
// ─────────────────────────────────────────────────────────────────────────────

describe('ChatAssistant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Test 1 — API failure shows error in chat', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok:   false,
      status: 500,
      json: async () => ({ error: 'Internal Server Error' }),
    });

    render(<ChatAssistant />);

    const chatInput = screen.getByRole('textbox');
    fireEvent.change(chatInput, { target: { value: 'test question' } });
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => {
      // Should show the network error boundary or an assistant message about unavailability
      const alerts = screen.queryAllByRole('alert');
      const statuses = screen.queryAllByRole('status');
      expect(alerts.length + statuses.length).toBeGreaterThan(0);
    });
  });

  it('Test 2 — Submit button disabled during pending response', async () => {
    // Never resolves — simulates pending network request
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));

    render(<ChatAssistant />);

    const chatInput = screen.getByRole('textbox');
    fireEvent.change(chatInput, { target: { value: 'test question' } });
    fireEvent.submit(screen.getByRole('form'));

    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
  });

  it('Test 3 — Empty state renders with no user messages', () => {
    render(<ChatAssistant />);

    // The empty state should be visible on initial render (only greeting message present)
    expect(screen.getByRole('status', { name: /no messages yet/i })).toBeInTheDocument();
    expect(screen.getByText(/ask anything about the election process/i)).toBeInTheDocument();
  });
});
