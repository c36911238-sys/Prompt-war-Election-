/**
 * Structured logging utility for better debugging and monitoring
 */

/**
 * Log levels in order of severity
 */
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/**
 * Current log level based on environment
 */
const CURRENT_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? 
  (process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG);

/**
 * Format log message with timestamp and context
 */
function formatLogMessage(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...context,
  };

  // In development, make it more readable
  if (process.env.NODE_ENV !== 'production') {
    return `[${timestamp}] ${level}: ${message}${
      Object.keys(context).length > 0 ? `\n${JSON.stringify(context, null, 2)}` : ''
    }`;
  }

  // In production, use structured JSON
  return JSON.stringify(logEntry);
}

/**
 * Logger class with structured logging
 */
export class Logger {
  constructor(component = 'app') {
    this.component = component;
  }

  /**
   * Log debug information
   */
  debug(message, context = {}) {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      console.log(formatLogMessage('DEBUG', message, {
        component: this.component,
        ...context,
      }));
    }
  }

  /**
   * Log general information
   */
  info(message, context = {}) {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
      console.log(formatLogMessage('INFO', message, {
        component: this.component,
        ...context,
      }));
    }
  }

  /**
   * Log warnings
   */
  warn(message, context = {}) {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(formatLogMessage('WARN', message, {
        component: this.component,
        ...context,
      }));
    }
  }

  /**
   * Log errors
   */
  error(message, error = null, context = {}) {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.ERROR) {
      const errorContext = {
        component: this.component,
        ...context,
      };

      if (error) {
        errorContext.error = {
          message: error.message,
          stack: error.stack,
          code: error.code,
          name: error.name,
        };
      }

      console.error(formatLogMessage('ERROR', message, errorContext));
    }
  }

  /**
   * Log API request/response
   */
  apiLog(method, path, statusCode, responseTime, context = {}) {
    const level = statusCode >= 400 ? 'WARN' : 'INFO';
    const message = `${method} ${path} ${statusCode} - ${responseTime}ms`;
    
    this[level.toLowerCase()](message, {
      type: 'api',
      method,
      path,
      statusCode,
      responseTime,
      ...context,
    });
  }

  /**
   * Log performance metrics
   */
  performance(operation, duration, context = {}) {
    this.info(`Performance: ${operation}`, {
      type: 'performance',
      operation,
      duration,
      ...context,
    });
  }

  /**
   * Log security events
   */
  security(event, context = {}) {
    this.warn(`Security: ${event}`, {
      type: 'security',
      event,
      ...context,
    });
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger('app');

/**
 * Create logger for specific component
 */
export function createLogger(component) {
  return new Logger(component);
}

/**
 * Request logging middleware helper
 */
export function logRequest(request, response, startTime) {
  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname;
  const responseTime = Date.now() - startTime;
  const statusCode = response.status;
  
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   request.headers.get('x-real-ip') || 
                   'unknown';

  logger.apiLog(method, path, statusCode, responseTime, {
    clientIp,
    userAgent: request.headers.get('user-agent'),
  });
}