'use client';

/**
 * ChatAssistantLoader — thin Client Component wrapper.
 *
 * `ssr: false` is only allowed inside Client Components in Next.js App Router.
 * This wrapper is the correct place to lazy-load a client-only component,
 * keeping app/page.js as a Server Component.
 */

import dynamic from 'next/dynamic';

const ChatAssistant = dynamic(() => import('./ChatAssistant'), {
  ssr: false,
  loading: () => (
    <div
      className="glass-panel animate-fade-in"
      style={{
        height: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)',
      }}
      aria-label="Loading chat assistant"
      aria-busy="true"
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: '2rem', opacity: 0.4 }}
        aria-hidden="true"
      >
        robot_2
      </span>
    </div>
  ),
});

export default function ChatAssistantLoader() {
  return <ChatAssistant />;
}
