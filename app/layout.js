import { AuthProvider } from '@/contexts/AuthContext';
import { trackPageView } from '@/lib/analytics';
import './globals.css';

export const metadata = {
  title: 'Election Process Assistant | AI-Powered Civic Guide',
  description:
    'Interactive AI assistant powered by Gemini 2.0 Flash to understand election processes, voting eligibility, timelines, and democratic procedures — in multiple languages.',
  keywords: 'election, voting, democracy, AI assistant, Gemini, civic education',
};

/**
 * Root layout — wraps the entire app with:
 *  • Firebase AuthProvider (auth state available everywhere)
 *  • Google Analytics page-view tracking
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>

        {/* Firebase Analytics page-view — client-side only script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (async () => {
                try {
                  const { trackPageView } = await import('/lib/analytics.js');
                  trackPageView(window.location.pathname);
                } catch {}
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
