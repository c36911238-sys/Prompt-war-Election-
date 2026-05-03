import { Suspense } from 'react';
import Timeline from '@/components/Timeline';
import TimelineSkeleton from '@/components/TimelineSkeleton';
import AuthButton from '@/components/AuthButton';
// ChatAssistantLoader is a Client Component that wraps dynamic(ssr:false) —
// the only valid pattern in the App Router for SSR-disabled lazy loading.
import ChatAssistantLoader from '@/components/ChatAssistantLoader';

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

        {/* Right column — Chat Assistant (lazy loaded via ChatAssistantLoader) */}
        <section>
          <ChatAssistantLoader />
        </section>
      </main>
    </div>
  );
}
