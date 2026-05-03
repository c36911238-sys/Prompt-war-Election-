/**
 * Enhanced input validation utilities with comprehensive sanitization
 * Provides defense against XSS, injection attacks, and malformed data
 */

import { ValidationError } from './errors.js';
import DOMPurify from 'dompurify';

/**
 * Validation schemas and rules
 */
export const ValidationRules = {
  // Text input validation
  text: {
    minLength: 1,
    maxLength: 1000,
    allowedChars: /^[a-zA-Z0-9\s\.,\?!;:\-'"()\[\]{}@#$%&*+=/_|\\~`^<>]*$/,
    forbiddenPatterns: [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /data:/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
      /expression\s*\(/gi,
      /url\s*\(/gi,
    ],
  },

  // Language code validation (BCP 47)
  languageCode: {
    pattern: /^[a-z]{2}(-[A-Z]{2})?$/,
    allowed: ['en', 'es', 'fr', 'de', 'it', 'pt', 'hi', 'zh', 'ja', 'ko', 'ar', 'ru'],
  },

  // Email validation (RFC 5322 compliant)
  email: {
    pattern: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    maxLength: 254,
    minLength: 5,
  },

  // Password validation
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbiddenPatterns: [
      /(.)\1{2,}/g, // No more than 2 consecutive identical characters
      /^(password|123456|qwerty|admin)/i, // Common weak passwords
    ],
  },

  // General string validation
  string: {
    maxLength: 500,
    noHtml: true,
    noScript: true,
    noSql: true,
  },

  // File upload validation
  file: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
};

/**
 * Advanced sanitization with DOMPurify for client-side usage
 */
export function sanitizeHtml(input) {
  if (typeof window !== 'undefined' && DOMPurify) {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });
  }
  // Server-side fallback
  return sanitizeText(input);
}

/**
 * Sanitize text input by removing potentially harmful content
 */
export function sanitizeText(input) {
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input.trim();

  // Remove dangerous patterns
  ValidationRules.text.forbiddenPatterns?.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  return sanitized
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script-like content
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=/gi, '')
    // Remove CSS expressions
    .replace(/expression\s*\(/gi, '')
    // Remove null bytes and control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Remove potential SQL injection patterns
    .replace(/('|(\\')|(;|\\;)|(--|\\/\*)|(\\|\\|))/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validate and sanitize password
 */
export function validatePassword(password, fieldName = 'password') {
  if (!password || typeof password !== 'string') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }

  const rules = ValidationRules.password;

  if (password.length < rules.minLength) {
    throw new ValidationError(
      `${fieldName} must be at least ${rules.minLength} characters long`,
      fieldName
    );
  }

  if (password.length > rules.maxLength) {
    throw new ValidationError(
      `${fieldName} must be no more than ${rules.maxLength} characters long`,
      fieldName
    );
  }

  if (rules.requireUppercase && !/[A-Z]/.test(password)) {
    throw new ValidationError(
      `${fieldName} must contain at least one uppercase letter`,
      fieldName
    );
  }

  if (rules.requireLowercase && !/[a-z]/.test(password)) {
    throw new ValidationError(
      `${fieldName} must contain at least one lowercase letter`,
      fieldName
    );
  }

  if (rules.requireNumbers && !/\d/.test(password)) {
    throw new ValidationError(
      `${fieldName} must contain at least one number`,
      fieldName
    );
  }

  if (rules.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    throw new ValidationError(
      `${fieldName} must contain at least one special character`,
      fieldName
    );
  }

  // Check forbidden patterns
  for (const pattern of rules.forbiddenPatterns) {
    if (pattern.test(password)) {
      throw new ValidationError(
        `${fieldName} contains invalid patterns`,
        fieldName
      );
    }
  }

  return password;
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
 * Validate email address with enhanced security
 */
export function validateEmail(email, fieldName = 'email') {
  if (!email || typeof email !== 'string') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }

  const sanitized = sanitizeText(email);
  const rules = ValidationRules.email;
  
  if (sanitized.length < rules.minLength) {
    throw new ValidationError(`${fieldName} is too short`, fieldName);
  }

  if (sanitized.length > rules.maxLength) {
    throw new ValidationError(`${fieldName} is too long`, fieldName);
  }

  if (!rules.pattern.test(sanitized)) {
    throw new ValidationError(`${fieldName} has invalid format`, fieldName);
  }

  // Additional security checks
  if (sanitized.includes('..') || sanitized.startsWith('.') || sanitized.endsWith('.')) {
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
 * Validate file upload with security checks
 */
export function validateFile(file, fieldName = 'file') {
  if (!file) {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }

  const rules = ValidationRules.file;

  // Check file size
  if (file.size > rules.maxSize) {
    throw new ValidationError(
      `${fieldName} is too large (max ${Math.round(rules.maxSize / 1024 / 1024)}MB)`,
      fieldName
    );
  }

  // Check MIME type
  if (!rules.allowedTypes.includes(file.type)) {
    throw new ValidationError(
      `${fieldName} type not allowed. Allowed types: ${rules.allowedTypes.join(', ')}`,
      fieldName
    );
  }

  // Check file extension
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!rules.allowedExtensions.includes(extension)) {
    throw new ValidationError(
      `${fieldName} extension not allowed. Allowed extensions: ${rules.allowedExtensions.join(', ')}`,
      fieldName
    );
  }

  // Additional security checks
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    throw new ValidationError(`${fieldName} name contains invalid characters`, fieldName);
  }

  return file;
}

/**
 * Advanced rate limiting with exponential backoff
 */
export function validateAdvancedRateLimit(clientIp, rateLimitMap, maxRequests, windowMs, endpoint = 'default') {
  const now = Date.now();
  const key = `${clientIp}:${endpoint}`;
  const clientRecord = rateLimitMap.get(key) ?? {
    count: 0,
    windowStart: now,
    violations: 0,
    lastViolation: 0,
  };

  // Calculate dynamic window based on violations (exponential backoff)
  const violationMultiplier = Math.min(Math.pow(2, clientRecord.violations), 16);
  const effectiveWindow = windowMs * violationMultiplier;

  // Reset window if expired
  if (now - clientRecord.windowStart > effectiveWindow) {
    // Reduce violations over time (forgiveness)
    const timeSinceLastViolation = now - clientRecord.lastViolation;
    if (timeSinceLastViolation > windowMs * 10) { // 10x window for forgiveness
      clientRecord.violations = Math.max(0, clientRecord.violations - 1);
    }

    rateLimitMap.set(key, { 
      count: 1, 
      windowStart: now,
      violations: clientRecord.violations,
      lastViolation: clientRecord.lastViolation,
    });
    return { allowed: true, retryAfter: 0 };
  }

  // Check if limit exceeded
  if (clientRecord.count >= maxRequests) {
    // Record violation
    clientRecord.violations++;
    clientRecord.lastViolation = now;
    rateLimitMap.set(key, clientRecord);

    const retryAfter = Math.ceil((clientRecord.windowStart + effectiveWindow - now) / 1000);
    return { allowed: false, retryAfter, violations: clientRecord.violations };
  }

  // Increment counter
  rateLimitMap.set(key, {
    ...clientRecord,
    count: clientRecord.count + 1,
  });
  
  return { allowed: true, retryAfter: 0 };
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