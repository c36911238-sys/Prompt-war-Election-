/**
 * Shared API utilities for consistent request handling across endpoints
 * Eliminates code duplication and ensures consistent behavior
 */

import crypto from 'crypto';
import { HTTP_STATUS, ERROR_MESSAGES, LIMITS } from './constants.js';

/**
 * Extract client IP address from request headers
 * Handles various proxy configurations (Vercel, Cloudflare, etc.)
 * 
 * @param {Request} request - Next.js Request object
 * @returns {string} Client IP address or 'unknown'
 */
export function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-client-ip') ||
    'unknown'
  );
}

/**
 * Generate a unique request ID for correlation and logging
 * @returns {string} UUID v4 request ID
 */
export function generateRequestId() {
  return crypto.randomUUID();
}

/**
 * Create standardized error response with consistent structure
 * 
 * @param {string} message - Error message to return
 * @param {number} status - HTTP status code (default: 400)
 * @param {Object} headers - Additional headers (optional)
 * @param {string} requestId - Request ID for correlation (optional)
 * @returns {Response} JSON error response
 */
export function createErrorResponse(message, status = HTTP_STATUS.BAD_REQUEST, headers = {}, requestId = null) {
  const errorResponse = {
    error: message,
    timestamp: new Date().toISOString(),
  };

  if (requestId) {
    errorResponse.requestId = requestId;
  }

  return Response.json(errorResponse, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      ...headers,
    },
  });
}

/**
 * Create standardized success response with consistent structure
 * 
 * @param {Object} data - Response data
 * @param {Object} headers - Additional headers (optional)
 * @param {string} requestId - Request ID for correlation (optional)
 * @returns {Response} JSON success response
 */
export function createSuccessResponse(data, headers = {}, requestId = null) {
  const response = {
    ...data,
    timestamp: new Date().toISOString(),
  };

  if (requestId) {
    response.requestId = requestId;
  }

  return Response.json(response, {
    status: HTTP_STATUS.OK,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Parse and validate JSON request body with error handling
 * 
 * @param {Request} request - Next.js Request object
 * @returns {Promise<Object>} Parsed JSON body
 * @throws {Error} If JSON parsing fails
 */
export async function parseRequestBody(request) {
  try {
    return await request.json();
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}

/**
 * Create a timeout promise that rejects after specified milliseconds
 * 
 * @param {number} ms - Timeout in milliseconds
 * @param {string} operation - Operation name for error message
 * @returns {Promise} Promise that rejects with timeout error
 */
export function createTimeoutPromise(ms, operation = 'Operation') {
  return new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`${operation} timeout after ${ms}ms`)), ms)
  );
}

/**
 * Execute a promise with timeout using Promise.race
 * 
 * @param {Promise} promise - Promise to execute
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} operation - Operation name for error message
 * @returns {Promise} Promise that resolves or rejects with timeout
 */
export async function withTimeout(promise, timeoutMs, operation = 'Operation') {
  const timeoutPromise = createTimeoutPromise(timeoutMs, operation);
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Retry a function with exponential backoff
 * 
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} baseDelay - Base delay in milliseconds (default: 1000)
 * @returns {Promise} Result of the function or throws last error
 */
export async function withRetry(fn, maxRetries = LIMITS.MAX_RETRIES, baseDelay = LIMITS.RETRY_BASE_DELAY_MS) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Don't retry on certain error types
      if (error.message?.includes('validation') || 
          error.message?.includes('Invalid') ||
          error.message?.includes('required')) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Log request with consistent format and correlation ID
 * 
 * @param {string} service - Service name (e.g., 'TTS', 'CHAT')
 * @param {string} level - Log level ('INFO', 'WARN', 'ERROR')
 * @param {string} message - Log message
 * @param {Object} context - Additional context (requestId, clientIp, etc.)
 */
export function logRequest(service, level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    service,
    level,
    message,
    ...context,
  };
  
  console.log(`[${service}] ${JSON.stringify(logEntry)}`);
}

/**
 * Validate HTTP method for endpoint
 * 
 * @param {Request} request - Next.js Request object
 * @param {string[]} allowedMethods - Array of allowed HTTP methods
 * @returns {boolean} True if method is allowed
 */
export function validateHttpMethod(request, allowedMethods) {
  return allowedMethods.includes(request.method);
}

/**
 * Create method not allowed response
 * 
 * @param {string[]} allowedMethods - Array of allowed methods
 * @param {string} requestId - Request ID for correlation
 * @returns {Response} Method not allowed response
 */
export function createMethodNotAllowedResponse(allowedMethods, requestId = null) {
  return createErrorResponse(
    `Method not allowed. Allowed methods: ${allowedMethods.join(', ')}`,
    HTTP_STATUS.METHOD_NOT_ALLOWED,
    { 'Allow': allowedMethods.join(', ') },
    requestId
  );
}

/**
 * Sanitize text input by removing HTML tags and potentially harmful content
 * 
 * @param {string} text - Input text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeTextInput(text) {
  if (typeof text !== 'string') {
    return '';
  }
  
  return text
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>"'&]/g, '') // Remove potentially harmful characters
    .substring(0, LIMITS.CHAT_MESSAGE_MAX); // Enforce length limit
}

/**
 * Validate text length against limits
 * 
 * @param {string} text - Text to validate
 * @param {number} maxLength - Maximum allowed length
 * @param {number} minLength - Minimum required length (default: 1)
 * @param {string} fieldName - Field name for error messages
 * @throws {Error} If validation fails
 */
export function validateTextLength(text, maxLength, minLength = 1, fieldName = 'Text') {
  if (!text || typeof text !== 'string') {
    throw new Error(ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD(fieldName));
  }
  
  const trimmedText = text.trim();
  
  if (trimmedText.length < minLength) {
    throw new Error(ERROR_MESSAGES.VALIDATION.TOO_SHORT(fieldName, minLength));
  }
  
  if (trimmedText.length > maxLength) {
    throw new Error(ERROR_MESSAGES.VALIDATION.TOO_LONG(fieldName, maxLength));
  }
}

/**
 * Validate language code format (BCP 47)
 * 
 * @param {string} languageCode - Language code to validate
 * @throws {Error} If validation fails
 */
export function validateLanguageCode(languageCode) {
  if (!languageCode || typeof languageCode !== 'string') {
    throw new Error(ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD('Language code'));
  }
  
  if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(languageCode)) {
    throw new Error(ERROR_MESSAGES.VALIDATION.INVALID_FORMAT('language code'));
  }
}