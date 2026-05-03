import Timeline from '@/components/Timeline';
import ChatAssistant from '@/components/ChatAssistant';

export default function Home() {
  return (
    <div className="container">
      <header className="animate-fade-in">
        <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          Election Process Assistant
        </h1>
        <p className="text-secondary" style={{ fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
          Your interactive guide to understanding the democratic process. Explore the timeline and ask our AI assistant any questions you have.
        </p>
      </header>

      <main>
        {/* Left Column - Interactive Timeline */}
        <section>
          <Timeline />
        </section>

        {/* Right Column - Chat Assistant */}
        <section>
          <ChatAssistant />
        </section>
      </main>
    </div>
  );
}
