import { Suspense } from 'react';
import Timeline from '@/components/Timeline';
import TimelineSkeleton from '@/components/TimelineSkeleton';
import AuthButton from '@/components/AuthButton';
import ThemeToggle from '@/components/ThemeToggle';
// ChatAssistantLoader owns the dynamic(ssr:false) call — required because
// ssr:false is only valid inside Client Components in the App Router.
import ChatAssistantLoader from '@/components/ChatAssistantLoader';

export default function Home() {
  return (
    <div className="container">
      <header className="animate-fade-in">
        <div className="header-actions">
          <ThemeToggle />
          <AuthButton />
        </div>

        <h1 className="text-gradient page-title">
          Election Process Assistant
        </h1>
        <p className="page-subtitle">
          Your interactive, AI-powered guide to the democratic process — explore
          the timeline and ask our Gemini-powered assistant any question.
        </p>
      </header>

      <main>
        <section aria-label="Election timeline" className="animate-fade-in delay-200">
          <Suspense fallback={<TimelineSkeleton />}>
            <Timeline />
          </Suspense>
        </section>

        <section aria-label="AI chat assistant" className="animate-fade-in delay-300">
          <ChatAssistantLoader />
        </section>
      </main>
    </div>
  );
}
