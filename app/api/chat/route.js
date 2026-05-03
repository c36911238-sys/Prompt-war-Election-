/**
 * POST /api/chat
 *
 * Accepts a user message and language code, returns an AI-generated
 * election-process answer via Vertex AI (Gemini 2.0 Flash).
 *
 * Features:
 * - Centralized rate limiting with exponential backoff
 * - Comprehensive input validation and sanitization
 * - Security monitoring and threat detection
 * - Enhanced error handling with request correlation
 * - Graceful fallback responses
 */

import { generateElectionResponse } from '@/lib/vertexService';
import { 
  validateText, 
  validateLanguageCode, 
  validateRequestBody,
  sanitizeHtml 
} from '@/lib/validation';
import { 
  SecurityMonitor, 
  getSecurityHeaders,
  SecuritySanitizer 
} from '@/lib/security';
import { ValidationError, RateLimitError, AuthError } from '@/lib/errors';
import { LIMITS, HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants';
import { 
  getClientIp, 
  generateRequestId, 
  createErrorResponse, 
  createSuccessResponse,
  parseRequestBody,
  withTimeout,
  logRequest,
  validateTextLength,
  sanitizeTextInput,
  createMethodNotAllowedResponse
} from '@/lib/apiUtils';
import { checkRateLimit, createRateLimitMessage } from '@/lib/rateLimiting';

// ---------------------------------------------------------------------------
// Constants and Configuration
// ---------------------------------------------------------------------------

// Security patterns for threat detection
const THREAT_PATTERNS = {
  xss: [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
  ],
  sqlInjection: [
    /('|(\\')|(;|\\;)|(--|\\/\*)|(\\|\\|))/gi,
    /union\s+select/gi,
    /drop\s+table/gi,
  ],
  pathTraversal: [
    /\.\.\//g,
    /\.\.\\\/g,
    /%2e%2e%2f/gi,
  ],
  commandInjection: [/[;&|`$()]/g],
  ldapInjection: [/[*()\\]/g],
  xxe: [/<!ENTITY/gi, /SYSTEM/gi],
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
 * 
 * @param {Request} request - Next.js Request object
 * @param {Object} body - Parsed request body
 * @returns {Object} Validated data { message: string, language: string, clientIp: string }
 * @throws {Error} If validation fails
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
    throw new AuthError(ERROR_MESSAGES.SECURITY.UNAUTHORIZED_ACCESS);
  }
  
  // Validate request body structure
  validateRequestBody(body, ['message']);
  
  // Extract and sanitize message
  let message = body.message || '';
  message = sanitizeTextInput(message);
  
  // Validate message length
  validateTextLength(message, LIMITS.CHAT_MESSAGE_MAX, 1, 'Message');
  
  // Extract and validate language
  const language = body.language || 'en';
  const validatedLanguage = validateLanguageCode(language);
  
  // Detect threats in message
  const threats = detectThreats(message, clientIp);
  if (threats.length > 0) {
    throw new ValidationError(`Security threat detected: ${threats.join(', ')}`);
  }
  
  return { 
    message, 
    language: validatedLanguage,
    clientIp,
  };
}

// ---------------------------------------------------------------------------
// Rate Limiting and Security
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
 * Create secure error response with enhanced headers
 * 
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {Object} additionalHeaders - Additional headers
 * @param {string} requestId - Request ID for correlation
 * @returns {Response} JSON error response
 */
function createSecureErrorResponse(message, status = HTTP_STATUS.BAD_REQUEST, additionalHeaders = {}, requestId = null) {
  const securityHeaders = getSecurityHeaders();
  
  const errorResponse = {
    error: SecuritySanitizer.sanitizeHtml(message),
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
      ...securityHeaders,
      ...additionalHeaders,
    },
  });
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
  const requestId = generateRequestId();
  
  try {
    // Get client information
    const clientIp = getClientIp(request);
    
    // Check rate limiting first
    const rateLimitResult = checkRateLimit('chat', clientIp);
    if (!rateLimitResult.allowed) {
      const message = createRateLimitMessage('chat', rateLimitResult.retryAfter);
      
      SecurityMonitor.logSecurityEvent('rate_limit_exceeded', {
        requestId,
        clientIp,
        retryAfter: rateLimitResult.retryAfter,
      });
      
      return createSecureErrorResponse(
        message,
        HTTP_STATUS.TOO_MANY_REQUESTS,
        { 'Retry-After': rateLimitResult.retryAfter?.toString() },
        requestId
      );
    }

    // Parse and validate request body
    const requestBody = await parseRequestBody(request);
    const { message, language } = validateChatRequest(requestBody, request);

    // Log successful request (without sensitive data)
    logRequest('CHAT', 'INFO', 'Processing chat request', {
      requestId,
      clientIp,
      language,
      messageLength: message.length,
    });

    // Generate AI response with timeout
    try {
      const electionAnswer = await withTimeout(
        generateElectionResponse(message, language),
        LIMITS.VERTEX_AI_TIMEOUT_MS,
        'Vertex AI request'
      );
      
      const responseTime = Date.now() - startTime;
      logRequest('CHAT', 'INFO', 'Chat request completed successfully', {
        requestId,
        clientIp,
        responseTime,
      });
      
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
      await new Promise((resolve) => setTimeout(resolve, LIMITS.FALLBACK_DELAY_MS));

      const fallbackResponse = selectFallback(message);
      const responseTime = Date.now() - startTime;
      
      logRequest('CHAT', 'INFO', 'Using fallback response', {
        requestId,
        clientIp,
        responseTime,
      });
      
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
      return createSecureErrorResponse(error.message, HTTP_STATUS.BAD_REQUEST, {}, requestId);
    }
    
    if (error instanceof AuthError) {
      return createSecureErrorResponse(error.message, HTTP_STATUS.FORBIDDEN, {}, requestId);
    }
    
    // Log unexpected errors
    SecurityMonitor.logSecurityEvent('unexpected_error', {
      requestId,
      clientIp,
      message: error.message,
      stack: error.stack,
    });
    
    logRequest('CHAT', 'ERROR', 'Unexpected error in chat request', {
      requestId,
      clientIp,
      error: error.message,
    });
    
    return createSecureErrorResponse(
      'An unexpected error occurred. Please try again.',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      {},
      requestId
    );
  }
}

// Handle unsupported methods with enhanced security
export async function GET(request) {
  const requestId = generateRequestId();
  return createMethodNotAllowedResponse(['POST'], requestId);
}

export async function PUT(request) {
  const requestId = generateRequestId();
  return createMethodNotAllowedResponse(['POST'], requestId);
}

export async function DELETE(request) {
  const requestId = generateRequestId();
  return createMethodNotAllowedResponse(['POST'], requestId);
}

export async function PATCH(request) {
  const requestId = generateRequestId();
  return createMethodNotAllowedResponse(['POST'], requestId);
}
