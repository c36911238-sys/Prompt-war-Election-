/**
 * Input validation utilities with comprehensive sanitization
 */

import { ValidationError } from './errors.js';

/**
 * Validation schemas and rules
 */
export const ValidationRules = {
  // Text input validation
  text: {
    minLength: 1,
    maxLength: 1000,
    allowedChars: /^[a-zA-Z0-9\s\.,\?!;:\-'"()\[\]{}@#$%&*+=/_|\\~`^<>]*$/,
  },

  // Language code validation (BCP 47)
  languageCode: {
    pattern: /^[a-z]{2}(-[A-Z]{2})?$/,
    allowed: ['en', 'es', 'fr', 'de', 'it', 'pt', 'hi', 'zh', 'ja', 'ko', 'ar', 'ru'],
  },

  // Email validation
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 254,
  },

  // General string validation
  string: {
    maxLength: 500,
    noHtml: true,
    noScript: true,
  },
};

/**
 * Sanitize text input by removing potentially harmful content
 */
export function sanitizeText(input) {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script-like content
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    // Remove null bytes and control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ');
}

/**
 * Validate text input against rules
 */
export function validateText(text, fieldName = 'text') {
  if (!text || typeof text !== 'string') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }

  const sanitized = sanitizeText(text);
  
  if (sanitized.length < ValidationRules.text.minLength) {
    throw new ValidationError(`${fieldName} is too short`, fieldName);
  }

  if (sanitized.length > ValidationRules.text.maxLength) {
    throw new ValidationError(
      `${fieldName} is too long (max ${ValidationRules.text.maxLength} characters)`,
      fieldName
    );
  }

  // Check for suspicious patterns
  if (/<script|javascript:|data:|vbscript:/i.test(text)) {
    throw new ValidationError(`${fieldName} contains invalid content`, fieldName);
  }

  return sanitized;
}

/**
 * Validate language code
 */
export function validateLanguageCode(code, fieldName = 'languageCode') {
  if (!code || typeof code !== 'string') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }

  const normalizedCode = code.toLowerCase();
  
  if (!ValidationRules.languageCode.pattern.test(code)) {
    throw new ValidationError(`${fieldName} has invalid format`, fieldName);
  }

  // Extract base language (before hyphen)
  const baseLanguage = normalizedCode.split('-')[0];
  
  if (!ValidationRules.languageCode.allowed.includes(baseLanguage)) {
    throw new ValidationError(`${fieldName} is not supported`, fieldName);
  }

  return code;
}

/**
 * Validate email address
 */
export function validateEmail(email, fieldName = 'email') {
  if (!email || typeof email !== 'string') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }

  const sanitized = sanitizeText(email);
  
  if (sanitized.length > ValidationRules.email.maxLength) {
    throw new ValidationError(`${fieldName} is too long`, fieldName);
  }

  if (!ValidationRules.email.pattern.test(sanitized)) {
    throw new ValidationError(`${fieldName} has invalid format`, fieldName);
  }

  return sanitized.toLowerCase();
}

/**
 * Validate general string input
 */
export function validateString(str, fieldName = 'string', options = {}) {
  const rules = { ...ValidationRules.string, ...options };
  
  if (!str || typeof str !== 'string') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }

  let sanitized = str.trim();
  
  if (rules.noHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }
  
  if (rules.noScript) {
    if (/<script|javascript:|data:|vbscript:/i.test(sanitized)) {
      throw new ValidationError(`${fieldName} contains invalid content`, fieldName);
    }
  }
  
  if (sanitized.length > rules.maxLength) {
    throw new ValidationError(
      `${fieldName} is too long (max ${rules.maxLength} characters)`,
      fieldName
    );
  }

  return sanitized;
}

/**
 * Validate request body structure
 */
export function validateRequestBody(body, requiredFields = []) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Invalid request body format');
  }

  for (const field of requiredFields) {
    if (!(field in body)) {
      throw new ValidationError(`Missing required field: ${field}`, field);
    }
  }

  return body;
}

/**
 * Rate limiting validation
 */
export function validateRateLimit(clientIp, rateLimitMap, maxRequests, windowMs) {
  const now = Date.now();
  const clientRecord = rateLimitMap.get(clientIp) ?? {
    count: 0,
    windowStart: now,
  };

  // Reset window if expired
  if (now - clientRecord.windowStart > windowMs) {
    rateLimitMap.set(clientIp, { count: 1, windowStart: now });
    return true;
  }

  // Check if limit exceeded
  if (clientRecord.count >= maxRequests) {
    return false;
  }

  // Increment counter
  rateLimitMap.set(clientIp, {
    ...clientRecord,
    count: clientRecord.count + 1,
  });
  
  return true;
}

/**
 * Comprehensive input validator for API endpoints
 */
export class InputValidator {
  constructor(rules = {}) {
    this.rules = rules;
  }

  validate(data) {
    const validated = {};
    const errors = [];

    for (const [field, rule] of Object.entries(this.rules)) {
      try {
        if (rule.required && !(field in data)) {
          throw new ValidationError(`${field} is required`, field);
        }

        if (field in data) {
          switch (rule.type) {
            case 'text':
              validated[field] = validateText(data[field], field);
              break;
            case 'email':
              validated[field] = validateEmail(data[field], field);
              break;
            case 'languageCode':
              validated[field] = validateLanguageCode(data[field], field);
              break;
            case 'string':
              validated[field] = validateString(data[field], field, rule.options);
              break;
            default:
              validated[field] = data[field];
          }
        }
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `Validation failed: ${errors.map(e => e.message).join(', ')}`
      );
    }

    return validated;
  }
}