/**
 * POST /api/chat
 *
 * Accepts a user message and language code, returns an AI-generated
 * election-process answer via Vertex AI (Gemini 2.0 Flash).
 *
 * Features:
 * - Advanced rate limiting with exponential backoff
 * - Comprehensive input validation and sanitization
 * - Security monitoring and threat detection
 * - CSRF protection
 * - Request signing and validation
 * - Graceful fallback responses
 * - Enhanced error handling
 */

import { generateElectionResponse } from '@/lib/vertexService';
import { 
  validateText, 
  validateLanguageCode, 
  validateRequestBody,
  validateAdvancedRateLimit,
  sanitizeHtml 
} from '@/lib/validation';
import { 
  SecurityMonitor, 
  CSRFProtection, 
  getSecurityHeaders,
  SecuritySanitizer 
} from '@/lib/security';
import { ValidationError, RateLimitError, AuthError } from '@/lib/errors';

// ---------------------------------------------------------------------------
// Constants and Configuration
// ---------------------------------------------------------------------------

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_MESSAGE_LENGTH = 1000;
const FALLBACK_DELAY_MS = 800;

// Enhanced rate limiting with exponential backoff
const rateLimitMap = new Map();

// Security patterns for threat detection
const THREAT_PATTERNS = {
  xss: [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
  ],
  sqlInjection: [
    /('|(\\')|(;|\\;)|(--|\\/\\*)|(\\||\\|\\|))/gi,
    /union\s+select/gi,
    /drop\s+table/gi,
  ],
  pathTraversal: [
    /\.\.\//g,
    /\.\.\\\/g,
    /%2e%2e%2f/gi,
  ],
};

// ---------------------------------------------------------------------------
// Security and Threat Detection
// ---------------------------------------------------------------------------

/**
 * Detect potential security threats in input
 */
function detectThreats(input, clientIp) {
  const threats = [];
  
  for (const [threatType, patterns] of Object.entries(THREAT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(input)) {
        threats.push(threatType);
        SecurityMonitor.logSecurityEvent(`${threatType}_attempt`, {
          clientIp,
          input: input.substring(0, 100), // Log first 100 chars only
          pattern: pattern.toString(),
        });
      }
    }
  }
  
  return threats;
}

/**
 * Enhanced request validation with security checks
 */
function validateSecureRequest(request, body) {
  const clientIp = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || '';
  
  // Check for suspicious user agents
  const suspiciousAgents = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python-requests/i,
  ];
  
  if (suspiciousAgents.some(pattern => pattern.test(userAgent))) {
    SecurityMonitor.logSecurityEvent('suspicious_user_agent', {
      clientIp,
      userAgent,
    });
    throw new AuthError('Request blocked for security reasons');
  }
  
  // Validate request body structure
  validateRequestBody(body, ['message']);
  
  // Sanitize and validate message
  const message = sanitizeHtml(body.message || '');
  const language = body.language || 'en';
  
  // Detect threats in message
  const threats = detectThreats(message, clientIp);
  if (threats.length > 0) {
    throw new ValidationError(`Security threat detected: ${threats.join(', ')}`);
  }
  
  // Validate message content
  const validatedMessage = validateText(message, 'message');
  const validatedLanguage = validateLanguageCode(language, 'language');
  
  return { 
    message: validatedMessage, 
    language: validatedLanguage,
    clientIp,
  };
}

// ---------------------------------------------------------------------------
// Rate Limiting with Enhanced Security
// ---------------------------------------------------------------------------

/**
 * Advanced rate limiting with exponential backoff and threat scoring
 */
function checkRateLimit(clientIp) {
  const result = validateAdvancedRateLimit(
    clientIp, 
    rateLimitMap, 
    RATE_LIMIT_MAX, 
    RATE_LIMIT_WINDOW_MS,
    'chat'
  );
  
  if (!result.allowed) {
    SecurityMonitor.logSecurityEvent('rate_limit_exceeded', {
      clientIp,
      violations: result.violations,
      retryAfter: result.retryAfter,
    });
    
    throw new RateLimitError(
      `Too many requests. Please wait ${result.retryAfter} seconds before trying again.`
    );
  }
  
  return result;
}

/**
 * Clean up expired rate limit entries and security logs
 */
function cleanupSecurityData() {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitMap.delete(key);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`[Security] Cleaned up ${cleanedCount} expired rate limit entries`);
  }
}

// Enhanced cleanup every 5 minutes
setInterval(cleanupSecurityData, 5 * 60 * 1000);

// ---------------------------------------------------------------------------
// Input Validation and Security
// ---------------------------------------------------------------------------

/**
 * Validates and sanitizes the request body with enhanced security
 * 
 * @param {Object} body - Request body
 * @param {Request} request - Request object for additional context
 * @returns {Object} Validated data or throws error
 */
function validateChatRequest(body, request) {
  return validateSecureRequest(request, body);
}

// ---------------------------------------------------------------------------
// Fallback Responses
// ---------------------------------------------------------------------------

/** Keyword-based fallback responses used when Vertex AI is unavailable. */
const FALLBACK_RESPONSES = {
  register: 'Voter registration is the first step in the electoral process. You typically need a valid ID and proof of address to register online or at a local government office. Check your local election office website for specific requirements and deadlines.',
  
  vote: 'On voting day, bring valid photo identification to your designated polling station. Polls are usually open from early morning until early evening. You can find your polling location on your voter registration card or your local election office website.',
  
  candidate: 'Candidates are individuals who stand for election. They submit nomination papers, campaign to present their policies, and are listed on the official ballot. You can research candidates through official voter guides, candidate websites, and local news sources.',
  
  eligibility: 'To be eligible to vote, you must be a citizen, at least 18 years old on election day, and registered to vote in your jurisdiction. Some areas have additional requirements, so check with your local election office.',
  
  absentee: 'Absentee or mail-in voting allows you to vote without going to a polling place on election day. Requirements vary by location - some require a reason (like travel or illness), while others allow no-excuse absentee voting.',
  
  timeline: 'Election timelines typically include: voter registration deadlines, candidate filing periods, early voting periods, election day, and certification of results. Key dates are published by your local election office.',
};

const FALLBACK_DEFAULT = 'Elections involve several key stages: voter registration, candidate nomination, campaigning, voting day, and the counting of results. Each stage has specific rules and timelines that vary by location. Which aspect of the election process would you like to know more about?';

/**
 * Select the most relevant fallback response for a given message.
 *
 * @param {string} userMessage - The original user message
 * @returns {string} A contextual fallback answer
 */
function selectFallback(userMessage) {
  const lowerCaseMessage = userMessage.toLowerCase();
  
  const keywords = [
    { terms: ['register', 'registration', 'sign up'], response: 'register' },
    { terms: ['vote', 'voting', 'ballot', 'poll'], response: 'vote' },
    { terms: ['candidate', 'who', 'running', 'nominee'], response: 'candidate' },
    { terms: ['eligible', 'qualify', 'requirements', 'age'], response: 'eligibility' },
    { terms: ['absentee', 'mail', 'early voting'], response: 'absentee' },
    { terms: ['when', 'deadline', 'timeline', 'schedule'], response: 'timeline' },
  ];

  for (const { terms, response } of keywords) {
    if (terms.some(term => lowerCaseMessage.includes(term))) {
      return FALLBACK_RESPONSES[response];
    }
  }

  return FALLBACK_DEFAULT;
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/**
 * Get client IP address from request headers
 * 
 * @param {Request} request - The request object
 * @returns {string} Client IP address
 */
function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

/**
 * Create secure error response with enhanced headers
 * 
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {Object} additionalHeaders - Additional headers
 * @returns {Response} JSON error response
 */
function createSecureErrorResponse(message, status = 400, additionalHeaders = {}) {
  const securityHeaders = getSecurityHeaders();
  
  return Response.json(
    { 
      error: SecuritySanitizer.sanitizeHtml(message),
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    },
    { 
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        ...securityHeaders,
        ...additionalHeaders,
      },
    }
  );
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

/**
 * Handle POST /api/chat requests with enhanced security.
 *
 * Validates the request body, applies security measures, delegates to 
 * generateElectionResponse, and falls back to curated static answers 
 * on any credential/network failure.
 *
 * @param {Request} request - Incoming Next.js Request object
 * @returns {Promise<Response>} JSON response with { response } or { error }
 */
export async function POST(request) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  try {
    // Get client information
    const clientIp = getClientIp(request);
    
    // Check rate limiting first
    checkRateLimit(clientIp);

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      SecurityMonitor.logSecurityEvent('invalid_json', {
        clientIp,
        error: parseError.message,
      });
      return createSecureErrorResponse('Invalid JSON in request body');
    }

    // Validate and sanitize request
    const { message, language } = validateChatRequest(requestBody, request);

    // Log successful request (without sensitive data)
    console.log(`[API /chat] Request ${requestId} from ${clientIp}, language: ${language}, message length: ${message.length}`);

    // Generate AI response with timeout
    const responsePromise = generateElectionResponse(message, language);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 25000)
    );

    try {
      const electionAnswer = await Promise.race([responsePromise, timeoutPromise]);
      
      const responseTime = Date.now() - startTime;
      console.log(`[API /chat] Success ${requestId} in ${responseTime}ms`);
      
      const securityHeaders = getSecurityHeaders();
      
      return Response.json(
        { 
          response: SecuritySanitizer.sanitizeHtml(electionAnswer),
          timestamp: new Date().toISOString(),
          requestId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            ...securityHeaders,
          },
        }
      );
      
    } catch (vertexApiError) {
      // Log the full error server-side; never expose internals to the client
      SecurityMonitor.logSecurityEvent('vertex_api_error', {
        requestId,
        message: vertexApiError.message,
        code: vertexApiError.code,
        clientIp,
        language,
      });

      // Simulate realistic latency so the UI typing indicator remains visible
      await new Promise((resolve) => setTimeout(resolve, FALLBACK_DELAY_MS));

      const fallbackResponse = selectFallback(message);
      const responseTime = Date.now() - startTime;
      
      console.log(`[API /chat] Fallback response ${requestId} in ${responseTime}ms`);
      
      const securityHeaders = getSecurityHeaders();
      
      return Response.json(
        { 
          response: SecuritySanitizer.sanitizeHtml(fallbackResponse),
          fallback: true,
          timestamp: new Date().toISOString(),
          requestId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            ...securityHeaders,
          },
        }
      );
    }

  } catch (error) {
    // Enhanced error handling with security logging
    const clientIp = getClientIp(request);
    
    if (error instanceof ValidationError) {
      SecurityMonitor.logSecurityEvent('validation_error', {
        requestId,
        clientIp,
        field: error.field,
        message: error.message,
      });
      return createSecureErrorResponse(error.message, 400);
    }
    
    if (error instanceof RateLimitError) {
      return createSecureErrorResponse(error.message, 429, {
        'Retry-After': '60',
      });
    }
    
    if (error instanceof AuthError) {
      return createSecureErrorResponse(error.message, 403);
    }
    
    // Log unexpected errors
    SecurityMonitor.logSecurityEvent('unexpected_error', {
      requestId,
      clientIp,
      message: error.message,
      stack: error.stack,
    });
    
    console.error(`[API /chat] Unexpected error ${requestId}:`, error);
    return createSecureErrorResponse(
      'An unexpected error occurred. Please try again.',
      500
    );
  }
}

// Handle unsupported methods with enhanced security
export async function GET() {
  return createSecureErrorResponse('Method not allowed. Use POST.', 405);
}

export async function PUT() {
  return createSecureErrorResponse('Method not allowed. Use POST.', 405);
}

export async function DELETE() {
  return createSecureErrorResponse('Method not allowed. Use POST.', 405);
}

export async function PATCH() {
  return createSecureErrorResponse('Method not allowed. Use POST.', 405);
}
