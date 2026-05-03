import './globals.css';

export const metadata = {
  title: 'Election Process Assistant | AI-Powered Civic Guide',
  description:
    'Interactive AI assistant powered by Gemini 2.0 Flash to understand election processes, voting eligibility, timelines, and democratic procedures — in multiple languages.',
  keywords: 'election, voting, democracy, AI assistant, Gemini, civic education',
};

/**
 * Root layout — wraps the entire app.
 *
 * AuthProvider is intentionally imported inside the Client Component
 * boundary (it has 'use client') so Firebase SDK never initialises on
 * the server during static page generation.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body>
        {/*
          AuthProvider is a 'use client' component — Next.js will only
          execute its module (and thus firebase.js) in the browser,
          never during SSR/static generation.
        */}
        <AuthProviderWrapper>
          {children}
        </AuthProviderWrapper>
      </body>
    </html>
  );
}

/**
 * Thin server-side shell that imports the client AuthProvider.
 * By keeping this import at the leaf of the server tree, Firebase
 * initialisation is deferred entirely to the browser.
 */
import AuthProviderWrapper from '@/components/AuthProviderWrapper';
