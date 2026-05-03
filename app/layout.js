import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';

export const metadata = {
  title: 'Election Process Assistant',
  description: 'Interactive AI assistant to understand election processes, timelines, and steps.',
};

export default function RootLayout({ children }) {
  // Use a placeholder if NEXT_PUBLIC_GA_ID is not provided
  const gaId = process.env.NEXT_PUBLIC_GA_ID || 'G-XXXXXXXXXX';

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        {children}
        <GoogleAnalytics gaId={gaId} />
      </body>
    </html>
  );
}
