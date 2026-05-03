/**
 * Centralized rate limiting utilities
 * Provides consistent rate limiting across all API endpoints
 */

import { LIMITS, ERROR_MESSAGES } from './constants.js';
import { logRequest } from './apiUtils.js';

/**
 * Rate limiter class with configurable limits and optional exponential backoff
 */
export class RateLimiter {
  /**
   * Create a new rate limiter instance
   * 
   * @param {Object} options - Configuration options
   * @param {number} options.maxRequests - Maximum requests per window
   * @param {number} options.windowMs - Time window in milliseconds
   * @param {boolean} options.enableBackoff - Enable exponential backoff (default: false)
   * @param {string} options.name - Limiter name for logging (default: 'API')
   */
  constructor({ maxRequests, windowMs, enableBackoff = false, name = 'API' }) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.enableBackoff = enableBackoff;
    this.name = name;
    this.records = new Map();
    
    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Check if client has exceeded rate limit
   * 
   * @param {string} clientId - Client identifier (usually IP address)
   * @returns {Object} Rate limit result { allowed: boolean, retryAfter?: number }
   */
  check(clientId) {
    const now = Date.now();
    const clientRecord = this.records.get(clientId) ?? {
      count: 0,
      windowStart: now,
      violations: 0,
    };

    // Reset window if expired
    if (now - clientRecord.windowStart > this.windowMs) {
      this.records.set(clientId, { 
        count: 1, 
        windowStart: now,
        violations: clientRecord.violations, // Preserve violation count for backoff
      });
      return { allowed: true };
    }

    // Check if limit exceeded
    if (clientRecord.count >= this.maxRequests) {
      // Calculate backoff if enabled
      let retryAfter = this.windowMs - (now - clientRecord.windowStart);
      
      if (this.enableBackoff && clientRecord.violations > 0) {
        // Exponential backoff: 2^violations * base window
        const backoffMultiplier = Math.pow(2, Math.min(clientRecord.violations, 5)); // Cap at 32x
        retryAfter = Math.min(retryAfter * backoffMultiplier, 24 * 60 * 60 * 1000); // Max 24 hours
      }

      // Increment violations for future backoff
      this.records.set(clientId, {
        ...clientRecord,
        violations: clientRecord.violations + 1,
      });

      logRequest(this.name, 'WARN', 'Rate limit exceeded', {
        clientId,
        count: clientRecord.count,
        violations: clientRecord.violations,
        retryAfter,
      });

      return { 
        allowed: false, 
        retryAfter: Math.ceil(retryAfter / 1000), // Convert to seconds
      };
    }

    // Increment counter
    this.records.set(clientId, {
      ...clientRecord,
      count: clientRecord.count + 1,
    });
    
    return { allowed: true };
  }

  /**
   * Start cleanup interval to remove expired entries
   * @private
   */
  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [clientId, record] of this.records.entries()) {
        // Remove entries older than window + max backoff time
        const maxAge = this.windowMs * (this.enableBackoff ? 32 : 1);
        if (now - record.windowStart > maxAge) {
          this.records.delete(clientId);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logRequest(this.name, 'INFO', 'Rate limit cleanup completed', {
          cleanedCount,
          remainingEntries: this.records.size,
        });
      }
    }, 5 * 60 * 1000); // Cleanup every 5 minutes
  }

  /**
   * Get current statistics for monitoring
   * 
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      name: this.name,
      totalClients: this.records.size,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
      enableBackoff: this.enableBackoff,
    };
  }

  /**
   * Reset rate limit for a specific client (admin function)
   * 
   * @param {string} clientId - Client identifier to reset
   */
  reset(clientId) {
    this.records.delete(clientId);
    logRequest(this.name, 'INFO', 'Rate limit reset for client', { clientId });
  }

  /**
   * Clear all rate limit records (admin function)
   */
  clear() {
    const count = this.records.size;
    this.records.clear();
    logRequest(this.name, 'INFO', 'All rate limits cleared', { clearedCount: count });
  }
}

/**
 * Pre-configured rate limiters for different services
 */
export const rateLimiters = {
  chat: new RateLimiter({
    maxRequests: LIMITS.RATE_LIMIT_MAX_CHAT,
    windowMs: LIMITS.RATE_LIMIT_WINDOW_MS,
    enableBackoff: true,
    name: 'CHAT',
  }),
  
  tts: new RateLimiter({
    maxRequests: LIMITS.RATE_LIMIT_MAX_TTS,
    windowMs: LIMITS.RATE_LIMIT_WINDOW_MS,
    enableBackoff: false,
    name: 'TTS',
  }),
};

/**
 * Middleware function to check rate limits
 * 
 * @param {string} service - Service name ('chat' or 'tts')
 * @param {string} clientId - Client identifier
 * @returns {Object} Rate limit result { allowed: boolean, retryAfter?: number }
 */
export function checkRateLimit(service, clientId) {
  const limiter = rateLimiters[service];
  if (!limiter) {
    throw new Error(`Unknown rate limiter service: ${service}`);
  }
  
  return limiter.check(clientId);
}

/**
 * Create rate limit exceeded response
 * 
 * @param {string} service - Service name
 * @param {number} retryAfter - Retry after seconds
 * @returns {string} Error message
 */
export function createRateLimitMessage(service, retryAfter) {
  const baseMessage = service === 'tts' 
    ? ERROR_MESSAGES.RATE_LIMIT.TTS_EXCEEDED
    : ERROR_MESSAGES.RATE_LIMIT.EXCEEDED;
    
  if (retryAfter) {
    return `${baseMessage}. Try again in ${retryAfter} seconds.`;
  }
  
  return baseMessage;
}