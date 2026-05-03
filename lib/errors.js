/**
 * Enhanced custom error classes with security context
 */

/**
 * Base application error class with enhanced logging
 */
export class AppError extends Error {
  constructor(message, code = 'APP_ERROR', statusCode = 500, context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.requestId = context.requestId || null;
    
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
      requestId: this.requestId,
      context: this.context,
    };
  }

  toSafeJSON() {
    // Safe version for client responses (no sensitive context)
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      requestId: this.requestId,
    };
  }
}

/**
 * Security-specific error for malicious requests
 */
export class SecurityError extends AppError {
  constructor(message, threatType = 'unknown', context = {}) {
    super(message, 'SECURITY_ERROR', 403, context);
    this.threatType = threatType;
  }
}

/**
 * Enhanced validation error with field context
 */
export class ValidationError extends AppError {
  constructor(message, field = null, context = {}) {
    super(message, 'VALIDATION_ERROR', 400, context);
    this.field = field;
  }
}

/**
 * Enhanced rate limiting error with retry information
 */
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', retryAfter = 60, context = {}) {
    super(message, 'RATE_LIMIT_ERROR', 429, context);
    this.retryAfter = retryAfter;
  }
}

/**
 * External service error with service context
 */
export class ExternalServiceError extends AppError {
  constructor(message, service = 'unknown', context = {}) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 503, { ...context, service });
    this.service = service;
  }
}

/**
 * Enhanced authentication/authorization errors
 */
export class AuthError extends AppError {
  constructor(message, authType = 'unknown', context = {}) {
    super(message, 'AUTH_ERROR', 401, context);
    this.authType = authType;
  }
}

/**
 * Configuration error with environment context
 */
export class ConfigError extends AppError {
  constructor(message, configKey = null, context = {}) {
    super(message, 'CONFIG_ERROR', 500, context);
    this.configKey = configKey;
  }
}

/**
 * Enhanced error handler utility functions with security focus
 */
export const ErrorHandler = {
  /**
   * Check if error is operational (expected) vs programming error
   */
  isOperational: (error) => {
    return error instanceof AppError;
  },

  /**
   * Enhanced error logging with security context
   */
  logError: (error, context = {}) => {
    const logData = {
      message: error.message,
      code: error.code || 'UNKNOWN',
      timestamp: new Date().toISOString(),
      requestId: context.requestId || error.requestId,
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      endpoint: context.endpoint,
      ...context,
    };

    // Add stack trace for programming errors only
    if (!ErrorHandler.isOperational(error)) {
      logData.stack = error.stack;
    }

    // Log based on severity
    if (error instanceof SecurityError) {
      console.error('[SECURITY ERROR]', logData);
      // In production, send to security monitoring
      ErrorHandler.sendToSecurityMonitoring(logData);
    } else if (ErrorHandler.isOperational(error)) {
      console.warn('[Operational Error]', logData);
    } else {
      console.error('[Programming Error]', logData);
    }

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      ErrorHandler.sendToMonitoring(logData);
    }
  },

  /**
   * Create safe error response for client (no sensitive data)
   */
  createSafeErrorResponse: (error, requestId = null) => {
    if (ErrorHandler.isOperational(error)) {
      return {
        error: error.message,
        code: error.code,
        timestamp: error.timestamp,
        requestId: requestId || error.requestId,
      };
    }

    // Don't expose internal errors to client
    return {
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      requestId: requestId,
    };
  },

  /**
   * Send error to monitoring service
   */
  sendToMonitoring: (logData) => {
    // Implement integration with monitoring service
    // Examples: Datadog, New Relic, Sentry, etc.
    if (process.env.MONITORING_ENDPOINT) {
      // Send to monitoring service
      console.log('[MONITORING]', 'Would send to monitoring service:', logData);
    }
  },

  /**
   * Send security events to specialized security monitoring
   */
  sendToSecurityMonitoring: (logData) => {
    // Implement integration with security monitoring service
    // Examples: Splunk, Elastic Security, etc.
    if (process.env.SECURITY_MONITORING_ENDPOINT) {
      // Send to security monitoring service
      console.log('[SECURITY MONITORING]', 'Would send to security service:', logData);
    }
  },

  /**
   * Sanitize error for logging (remove sensitive data)
   */
  sanitizeForLogging: (error, context = {}) => {
    const sanitized = { ...context };
    
    // Remove sensitive fields
    const sensitiveFields = [
      'password', 'token', 'apiKey', 'secret', 'credential',
      'authorization', 'cookie', 'session'
    ];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    // Truncate long values
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
        sanitized[key] = sanitized[key].substring(0, 1000) + '...[TRUNCATED]';
      }
    });
    
    return sanitized;
  },
};