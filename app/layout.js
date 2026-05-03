import './globals.css';
import AuthProviderWrapper from '@/components/AuthProviderWrapper';
import { ThemeProvider } from '@/contexts/ThemeContext';

export const metadata = {
  title: 'Election Process Assistant | AI-Powered Civic Guide',
  description:
    'Interactive AI assistant powered by Gemini 2.0 Flash to understand election processes, voting eligibility, timelines, and democratic procedures — in multiple languages.',
  keywords: 'election, voting, democracy, AI assistant, Gemini, civic education',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' }
  ],
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <ThemeProvider>
          <AuthProviderWrapper>
            {children}
          </AuthProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
