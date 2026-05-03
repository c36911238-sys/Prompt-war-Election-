/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Railway-specific optimizations
  output: 'standalone',
  
  // Environment variables (string values only)
  env: {
    PORT: process.env.PORT || "3000",
    NODE_ENV: process.env.NODE_ENV || "development",
  },

  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      '@google-cloud/text-to-speech',
      '@google-cloud/translate', 
      '@google-cloud/vertexai',
      'firebase',
      'dompurify'
    ],
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleapis.com',
        pathname: '/**',
      },
    ],
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          firebase: {
            test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
            name: 'firebase',
            chunks: 'all',
          },
          google: {
            test: /[\\/]node_modules[\\/]@google-cloud[\\/]/,
            name: 'google-cloud',
            chunks: 'all',
          },
        },
      };
    }

    // Bundle analyzer (only in development)
    if (dev && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          openAnalyzer: true,
        })
      );
    }

    return config;
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Security headers
          { 
            key: 'X-Content-Type-Options', 
            value: 'nosniff' 
          },
          { 
            key: 'X-Frame-Options', 
            value: 'DENY' 
          },
          { 
            key: 'X-XSS-Protection', 
            value: '1; mode=block' 
          },
          { 
            key: 'Referrer-Policy', 
            value: 'strict-origin-when-cross-origin' 
          },
          { 
            key: 'Permissions-Policy', 
            value: 'camera=(), microphone=(), geolocation=(), payment=()' 
          },
          
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseapp.com https://*.googleapis.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https://*.googleusercontent.com https://*.googleapis.com",
              "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.google.com wss://*.firebaseio.com",
              "frame-src https://accounts.google.com https://*.firebaseapp.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          
          // Performance headers
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // API routes get different cache headers
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
    ];
  },

  // Redirects for better SEO
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },

  // Rewrites for clean URLs
  async rewrites() {
    return [
      {
        source: '/health',
        destination: '/api/health',
      },
    ];
  },
};

export default nextConfig;
