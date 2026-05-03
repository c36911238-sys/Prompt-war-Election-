import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import Timeline from '@/components/Timeline';
import TimelineSkeleton from '@/components/TimelineSkeleton';
import AuthButton from '@/components/AuthButton';

/**
 * Lazy-load ChatAssistant — it's a heavy client component (DOMPurify + Firebase).
 * Loading it asynchronously keeps Time-to-Interactive fast for the Timeline.
 */
const ChatAssistant = dynamic(() => import('@/components/ChatAssistant'), {
  ssr:     false,
  loading: () => (
    <div
      className="glass-panel animate-fade-in"
      style={{ height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
      aria-label="Loading chat assistant"
      aria-busy="true"
    >
      <span className="material-symbols-outlined" style={{ fontSize: '2rem', opacity: 0.4 }}>robot_2</span>
    </div>
  ),
});

export default function Home() {
  return (
    <div className="container">
      <header className="animate-fade-in">
        {/* Auth button top-right */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <AuthButton />
        </div>

        <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          Election Process Assistant
        </h1>
        <p className="text-secondary" style={{ fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
          Your interactive, AI-powered guide to the democratic process — explore the timeline and ask our Gemini-powered assistant any question.
        </p>
      </header>

      <main>
        {/* Left column — Interactive Timeline (server-rendered, loads instantly) */}
        <section>
          <Suspense fallback={<TimelineSkeleton />}>
            <Timeline />
          </Suspense>
        </section>

        {/* Right column — Chat Assistant (lazy loaded, non-blocking) */}
        <section>
          <ChatAssistant />
        </section>
      </main>
    </div>
  );
}
