/**
 * Custom error classes for better error handling and debugging
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(message, code = 'APP_ERROR', statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Validation error for invalid input data
 */
export class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 'VALIDATION_ERROR', 400);
    this.field = field;
  }
}

/**
 * Rate limiting error
 */
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 'RATE_LIMIT_ERROR', 429);
  }
}

/**
 * External service error (Google Cloud, Firebase, etc.)
 */
export class ExternalServiceError extends AppError {
  constructor(message, service = 'unknown') {
    super(message, 'EXTERNAL_SERVICE_ERROR', 503);
    this.service = service;
  }
}

/**
 * Authentication/Authorization errors
 */
export class AuthError extends AppError {
  constructor(message) {
    super(message, 'AUTH_ERROR', 401);
  }
}

/**
 * Configuration error for missing environment variables
 */
export class ConfigError extends AppError {
  constructor(message) {
    super(message, 'CONFIG_ERROR', 500);
  }
}

/**
 * Error handler utility functions
 */
export const ErrorHandler = {
  /**
   * Check if error is operational (expected) vs programming error
   */
  isOperational: (error) => {
    return error instanceof AppError;
  },

  /**
   * Log error with appropriate level
   */
  logError: (error, context = {}) => {
    const logData = {
      message: error.message,
      stack: error.stack,
      code: error.code || 'UNKNOWN',
      timestamp: new Date().toISOString(),
      ...context,
    };

    if (ErrorHandler.isOperational(error)) {
      console.warn('[Operational Error]', logData);
    } else {
      console.error('[Programming Error]', logData);
    }
  },

  /**
   * Create safe error response for client
   */
  createSafeErrorResponse: (error) => {
    if (ErrorHandler.isOperational(error)) {
      return {
        error: error.message,
        code: error.code,
        timestamp: error.timestamp,
      };
    }

    // Don't expose internal errors to client
    return {
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    };
  },
};