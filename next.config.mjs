/** @type {import('next').NextConfig} */
const nextConfig = {
  // Gzip compression for all responses
  compress: true,

  // Railway-specific optimizations
  output: 'standalone',
  
  // Use Railway's PORT environment variable
  env: {
    PORT: process.env.PORT || 3000,
  },

  // Optimise images: serve AVIF/WebP automatically
  images: {
    formats: ['image/avif', 'image/webp'],
    // Allow Next.js <Image /> to serve Google OAuth user avatars.
    remotePatterns: [
      {
        protocol: 'https',
        hostname:  'lh3.googleusercontent.com',
        pathname:  '/**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Security
          { key: 'X-Content-Type-Options',   value: 'nosniff' },
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-XSS-Protection',          value: '1; mode=block' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },

          // Content Security Policy
          // Allows Firebase, Google APIs, Fonts, and our own origin.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts: self + Google/Firebase SDKs (needed for Firebase Auth popup & Analytics)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseapp.com https://*.googleapis.com",
              // Styles: self + Google Fonts
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Fonts
              "font-src 'self' https://fonts.gstatic.com",
              // Images: self + Firebase storage + Google user photos
              "img-src 'self' data: https://*.googleusercontent.com https://*.googleapis.com",
              // Connections: Firebase, Google APIs, our own API routes
              "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.google.com wss://*.firebaseio.com",
              // Frames: Google Auth popup
              "frame-src https://accounts.google.com https://*.firebaseapp.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
