/**
 * Security utilities and configurations
 * Provides comprehensive security measures for the application
 */

import crypto from 'crypto';

/**
 * Generate cryptographically secure nonce for CSP
 */
export function generateNonce() {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Enhanced Content Security Policy
 */
export function getContentSecurityPolicy(nonce = null) {
  const nonceStr = nonce ? `'nonce-${nonce}'` : '';
  
  return [
    `default-src 'self'`,
    `script-src 'self' ${nonceStr} 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseapp.com https://*.googleapis.com https://www.googletagmanager.com`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    `img-src 'self' data: blob: https://*.googleusercontent.com https://*.googleapis.com https://www.google-analytics.com`,
    `connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.google.com https://www.google-analytics.com wss://*.firebaseio.com`,
    `frame-src 'self' https://accounts.google.com https://*.firebaseapp.com`,
    `media-src 'self' data: blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
    `block-all-mixed-content`,
  ].join('; ');
}

/**
 * Comprehensive security headers
 */
export function getSecurityHeaders(nonce = null) {
  return {
    // Content Security Policy
    'Content-Security-Policy': getContentSecurityPolicy(nonce),
    
    // XSS Protection
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    
    // HTTPS Enforcement
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    
    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions Policy (Feature Policy)
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
      'ambient-light-sensor=()',
    ].join(', '),
    
    // Additional Security
    'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
}

/**
 * CSRF Token Management
 */
export class CSRFProtection {
  static generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  static validateToken(token, sessionToken) {
    if (!token || !sessionToken) return false;
    return crypto.timingSafeEqual(
      Buffer.from(token, 'hex'),
      Buffer.from(sessionToken, 'hex')
    );
  }

  static getTokenFromRequest(request) {
    return (
      request.headers.get('x-csrf-token') ||
      request.headers.get('csrf-token') ||
      null
    );
  }
}

/**
 * Input sanitization for different contexts
 */
export class SecuritySanitizer {
  // HTML context sanitization
  static sanitizeHtml(input) {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // JavaScript context sanitization
  static sanitizeJs(input) {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/\f/g, '\\f')
      .replace(/\v/g, '\\v')
      .replace(/\0/g, '\\0');
  }

  // URL context sanitization
  static sanitizeUrl(input) {
    if (typeof input !== 'string') return '';
    
    try {
      const url = new URL(input);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return '';
      }
      return url.toString();
    } catch {
      return '';
    }
  }

  // CSS context sanitization
  static sanitizeCss(input) {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/[<>"'&]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/expression\s*\(/gi, '')
      .replace(/url\s*\(/gi, '')
      .replace(/@import/gi, '');
  }
}

/**
 * Security monitoring and logging
 */
export class SecurityMonitor {
  static logSecurityEvent(event, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      severity: this.getSeverity(event),
    };

    if (logEntry.severity === 'high') {
      console.error('[SECURITY ALERT]', logEntry);
    } else if (logEntry.severity === 'medium') {
      console.warn('[SECURITY WARNING]', logEntry);
    } else {
      console.log('[SECURITY INFO]', logEntry);
    }

    // In production, you might want to send this to a security monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to monitoring service
      this.sendToMonitoringService(logEntry);
    }
  }

  static getSeverity(event) {
    const highSeverityEvents = [
      'xss_attempt',
      'sql_injection_attempt',
      'path_traversal_attempt',
      'csrf_attack',
      'brute_force_attack',
    ];

    const mediumSeverityEvents = [
      'rate_limit_exceeded',
      'suspicious_user_agent',
      'invalid_input',
      'authentication_failure',
    ];

    if (highSeverityEvents.includes(event)) return 'high';
    if (mediumSeverityEvents.includes(event)) return 'medium';
    return 'low';
  }

  static sendToMonitoringService(logEntry) {
    // Implement integration with your security monitoring service
    // Examples: Datadog, New Relic, Sentry, etc.
    console.log('[MONITORING]', 'Would send to monitoring service:', logEntry);
  }
}

/**
 * Secure session management
 */
export class SecureSession {
  static generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  static hashPassword(password, salt = null) {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, actualSalt, 100000, 64, 'sha512');
    return {
      hash: hash.toString('hex'),
      salt: actualSalt,
    };
  }

  static verifyPassword(password, hash, salt) {
    const { hash: computedHash } = this.hashPassword(password, salt);
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(computedHash, 'hex')
    );
  }

  static generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
}

/**
 * API Security utilities
 */
export class APISecurity {
  static validateApiKey(apiKey, validKeys) {
    if (!apiKey || !Array.isArray(validKeys)) return false;
    return validKeys.some(validKey => 
      crypto.timingSafeEqual(
        Buffer.from(apiKey),
        Buffer.from(validKey)
      )
    );
  }

  static createSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  static verifySignature(payload, signature, secret) {
    const expectedSignature = this.createSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
}

export default {
  generateNonce,
  getContentSecurityPolicy,
  getSecurityHeaders,
  CSRFProtection,
  SecuritySanitizer,
  SecurityMonitor,
  SecureSession,
  APISecurity,
};