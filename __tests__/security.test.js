/**
 * Security-focused unit tests
 * Tests validation, sanitization, and security utilities
 */

import { 
  validateText, 
  validateEmail, 
  validatePassword,
  sanitizeText,
  sanitizeHtml,
  validateAdvancedRateLimit 
} from '../lib/validation';
import { 
  SecuritySanitizer, 
  CSRFProtection, 
  SecureSession,
  APISecurity 
} from '../lib/security';
import { ValidationError } from '../lib/errors';

describe('Input Validation Security', () => {
  describe('validateText', () => {
    it('should reject XSS attempts', () => {
      const xssInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        'data:text/html,<script>alert(1)</script>',
      ];

      xssInputs.forEach(input => {
        expect(() => validateText(input)).toThrow(ValidationError);
      });
    });

    it('should reject SQL injection attempts', () => {
      const sqlInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "UNION SELECT * FROM users",
      ];

      sqlInputs.forEach(input => {
        expect(() => validateText(input)).toThrow(ValidationError);
      });
    });

    it('should accept safe text', () => {
      const safeInputs = [
        'Hello world',
        'What is voting?',
        'How do I register to vote?',
      ];

      safeInputs.forEach(input => {
        expect(() => validateText(input)).not.toThrow();
      });
    });
  });

  describe('validateEmail', () => {
    it('should reject malformed emails', () => {
      const badEmails = [
        'not-an-email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        '.user@domain.com',
      ];

      badEmails.forEach(email => {
        expect(() => validateEmail(email)).toThrow(ValidationError);
      });
    });

    it('should accept valid emails', () => {
      const goodEmails = [
        'user@domain.com',
        'test.email@example.org',
        'user+tag@domain.co.uk',
      ];

      goodEmails.forEach(email => {
        expect(() => validateEmail(email)).not.toThrow();
      });
    });
  });

  describe('validatePassword', () => {
    it('should reject weak passwords', () => {
      const weakPasswords = [
        '123456',
        'password',
        'abc',
        'PASSWORD123', // no special chars
        'password!', // no uppercase
      ];

      weakPasswords.forEach(password => {
        expect(() => validatePassword(password)).toThrow(ValidationError);
      });
    });

    it('should accept strong passwords', () => {
      const strongPasswords = [
        'MyStr0ng!Pass',
        'C0mplex#Password123',
        'Secure&P@ssw0rd',
      ];

      strongPasswords.forEach(password => {
        expect(() => validatePassword(password)).not.toThrow();
      });
    });
  });
});

describe('Sanitization', () => {
  describe('sanitizeText', () => {
    it('should remove HTML tags', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const result = sanitizeText(input);
      expect(result).toBe('Hello world');
    });

    it('should remove dangerous content', () => {
      const input = 'javascript:alert("xss")';
      const result = sanitizeText(input);
      expect(result).not.toContain('javascript:');
    });
  });

  describe('SecuritySanitizer', () => {
    it('should sanitize HTML context', () => {
      const input = '<script>alert("xss")</script>';
      const result = SecuritySanitizer.sanitizeHtml(input);
      expect(result).not.toContain('<script>');
    });

    it('should sanitize JavaScript context', () => {
      const input = 'alert("test")';
      const result = SecuritySanitizer.sanitizeJs(input);
      expect(result).toBe('alert(\\"test\\")');
    });

    it('should sanitize URLs', () => {
      const validUrl = 'https://example.com';
      const invalidUrl = 'javascript:alert(1)';
      
      expect(SecuritySanitizer.sanitizeUrl(validUrl)).toBe(validUrl);
      expect(SecuritySanitizer.sanitizeUrl(invalidUrl)).toBe('');
    });
  });
});

describe('Rate Limiting', () => {
  it('should allow requests within limit', () => {
    const rateLimitMap = new Map();
    const result = validateAdvancedRateLimit('127.0.0.1', rateLimitMap, 5, 60000);
    expect(result.allowed).toBe(true);
  });

  it('should block requests exceeding limit', () => {
    const rateLimitMap = new Map();
    const ip = '127.0.0.1';
    
    // Make 5 requests (at limit)
    for (let i = 0; i < 5; i++) {
      validateAdvancedRateLimit(ip, rateLimitMap, 5, 60000);
    }
    
    // 6th request should be blocked
    const result = validateAdvancedRateLimit(ip, rateLimitMap, 5, 60000);
    expect(result.allowed).toBe(false);
  });

  it('should implement exponential backoff for violations', () => {
    const rateLimitMap = new Map();
    const ip = '127.0.0.1';
    
    // Exceed limit multiple times
    for (let i = 0; i < 10; i++) {
      validateAdvancedRateLimit(ip, rateLimitMap, 1, 1000);
    }
    
    const result = validateAdvancedRateLimit(ip, rateLimitMap, 1, 1000);
    expect(result.violations).toBeGreaterThan(0);
  });
});

describe('CSRF Protection', () => {
  it('should generate valid tokens', () => {
    const token = CSRFProtection.generateToken();
    expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
  });

  it('should validate matching tokens', () => {
    const token = CSRFProtection.generateToken();
    const isValid = CSRFProtection.validateToken(token, token);
    expect(isValid).toBe(true);
  });

  it('should reject non-matching tokens', () => {
    const token1 = CSRFProtection.generateToken();
    const token2 = CSRFProtection.generateToken();
    const isValid = CSRFProtection.validateToken(token1, token2);
    expect(isValid).toBe(false);
  });
});

describe('Secure Session Management', () => {
  it('should generate secure session IDs', () => {
    const sessionId = SecureSession.generateSessionId();
    expect(sessionId).toHaveLength(64); // 32 bytes = 64 hex chars
  });

  it('should hash passwords securely', () => {
    const password = 'testPassword123!';
    const { hash, salt } = SecureSession.hashPassword(password);
    
    expect(hash).toHaveLength(128); // 64 bytes = 128 hex chars
    expect(salt).toHaveLength(32); // 16 bytes = 32 hex chars
  });

  it('should verify passwords correctly', () => {
    const password = 'testPassword123!';
    const { hash, salt } = SecureSession.hashPassword(password);
    
    const isValid = SecureSession.verifyPassword(password, hash, salt);
    expect(isValid).toBe(true);
    
    const isInvalid = SecureSession.verifyPassword('wrongPassword', hash, salt);
    expect(isInvalid).toBe(false);
  });
});

describe('API Security', () => {
  it('should validate API keys securely', () => {
    const validKeys = ['key1', 'key2', 'key3'];
    
    expect(APISecurity.validateApiKey('key1', validKeys)).toBe(true);
    expect(APISecurity.validateApiKey('invalid', validKeys)).toBe(false);
  });

  it('should create and verify signatures', () => {
    const payload = 'test payload';
    const secret = 'secret key';
    
    const signature = APISecurity.createSignature(payload, secret);
    const isValid = APISecurity.verifySignature(payload, signature, secret);
    
    expect(isValid).toBe(true);
    
    const isInvalid = APISecurity.verifySignature('different payload', signature, secret);
    expect(isInvalid).toBe(false);
  });
});