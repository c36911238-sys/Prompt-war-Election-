/**
 * Next.js Middleware - Security & Performance Layer
 * 
 * Provides:
 * - Advanced rate limiting with Redis-like memory store
 * - Request validation and sanitization
 * - Security headers enforcement
 * - Bot detection and blocking
 * - Request logging and monitoring
 * - CSRF protection
 */

import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const RATE_LIMITS = {
  api: { requests: 100, window: 60 * 1000 }, // 100 req/min for API
  chat: { requests: 20, window: 60 * 1000 }, // 20 req/min for chat
  tts: { requests: 30, window: 60 * 1000 },  // 30 req/min for TTS
  auth: { requests: 5, window: 60 * 1000 },  // 5 req/min for auth attempts
};

const BLOCKED_USER_AGENTS = [
  /bot/i, /crawler/i, /spider/i, /scraper/i,
  /curl/i, /wget/i, /python/i, /java/i,
];

const SUSPICIOUS_PATTERNS = [
  /\.\./,           // Path traversal
  /<script/i,       // XSS attempts
  /javascript:/i,   // JavaScript protocol
  /data:/i,         // Data URLs
  /vbscript:/i,     // VBScript
  /on\w+=/i,        // Event handlers
];

// ---------------------------------------------------------------------------
// Rate Limiting Store
// ---------------------------------------------------------------------------

class RateLimitStore {
  constructor() {
    this.store = new Map();
    this.cleanup();
  }

  getKey(ip, endpoint) {
    return `${ip}:${endpoint}`;
  }

  isRateLimited(ip, endpoint, limit) {
    const key = this.getKey(ip, endpoint);
    const now = Date.now();
    const record = this.store.get(key) || { count: 0, resetTime: now + limit.window };

    // Reset if window expired
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + limit.window;
      this.store.set(key, record);
      return false;
    }

    // Check if limit exceeded
    if (record.count >= limit.requests) {
      return true;
    }

    // Increment counter
    record.count++;
    this.store.set(key, record);
    return false;
  }

  cleanup() {
    // Clean expired entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.store.entries()) {
        if (now > record.resetTime) {
          this.store.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }
}

const rateLimitStore = new RateLimitStore();

// ---------------------------------------------------------------------------
// Security Utilities
// ---------------------------------------------------------------------------

function getClientIP(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    request.ip ||
    'unknown'
  );
}

function isBot(userAgent) {
  if (!userAgent) return true;
  return BLOCKED_USER_AGENTS.some(pattern => pattern.test(userAgent));
}

function hasSuspiciousContent(url, userAgent = '') {
  const content = `${url} ${userAgent}`;
  return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(content));
}

function validateRequest(request) {
  const userAgent = request.headers.get('user-agent') || '';
  const url = request.url;

  // Block bots and crawlers
  if (isBot(userAgent)) {
    return { valid: false, reason: 'Bot detected' };
  }

  // Check for suspicious patterns
  if (hasSuspiciousContent(url, userAgent)) {
    return { valid: false, reason: 'Suspicious content detected' };
  }

  // Validate content type for POST requests
  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return { valid: false, reason: 'Invalid content type' };
    }
  }

  return { valid: true };
}

function createSecurityHeaders() {
  return {
    // Security headers
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    
    // Content Security Policy
    'Content-Security-Policy': [
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
    
    // Additional security
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
  };
}

function createErrorResponse(message, status = 400) {
  return NextResponse.json(
    { 
      error: message,
      timestamp: new Date().toISOString(),
    },
    { 
      status,
      headers: createSecurityHeaders(),
    }
  );
}

// ---------------------------------------------------------------------------
// Middleware Function
// ---------------------------------------------------------------------------

export function middleware(request) {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;
  const method = request.method;
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';

  // Skip middleware for static assets and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public/') ||
    pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next();
  }

  // Validate request
  const validation = validateRequest(request);
  if (!validation.valid) {
    console.warn(`[Security] Blocked request from ${ip}: ${validation.reason}`);
    return createErrorResponse('Request blocked for security reasons', 403);
  }

  // Apply rate limiting based on endpoint
  let rateLimit = RATE_LIMITS.api; // default
  
  if (pathname.startsWith('/api/chat')) {
    rateLimit = RATE_LIMITS.chat;
  } else if (pathname.startsWith('/api/tts')) {
    rateLimit = RATE_LIMITS.tts;
  } else if (pathname.includes('auth') || pathname.includes('login')) {
    rateLimit = RATE_LIMITS.auth;
  }

  if (rateLimitStore.isRateLimited(ip, pathname, rateLimit)) {
    console.warn(`[Security] Rate limit exceeded for ${ip} on ${pathname}`);
    return createErrorResponse('Too many requests. Please slow down.', 429);
  }

  // Log request for monitoring
  console.log(`[Request] ${method} ${pathname} from ${ip} - ${Date.now() - startTime}ms`);

  // Create response with security headers
  const response = NextResponse.next();
  
  // Apply security headers
  const securityHeaders = createSecurityHeaders();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add performance headers
  response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
  response.headers.set('X-Request-ID', crypto.randomUUID());

  return response;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};