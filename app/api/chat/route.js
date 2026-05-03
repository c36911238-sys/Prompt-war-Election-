/**
 * POST /api/chat
 *
 * Accepts a user message and language code, returns an AI-generated
 * election-process answer via Vertex AI (Gemini 2.0 Flash).
 *
 * Features:
 * - Rate limiting per IP
 * - Input validation and sanitization
 * - Graceful fallback responses
 * - Comprehensive error handling
 * - Security headers
 */

import { generateElectionResponse } from '@/lib/vertexService';

// ---------------------------------------------------------------------------
// Constants and Configuration
// ---------------------------------------------------------------------------

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_MESSAGE_LENGTH = 1000;
const FALLBACK_DELAY_MS = 800;

// In-memory rate limiter: resets on server restart.
// Prevents Vertex AI quota exhaustion from a single client.
const rateLimitMap = new Map();

// ---------------------------------------------------------------------------
// Rate Limiting
// ---------------------------------------------------------------------------

/**
 * Returns true if the given client IP has exceeded the rate limit.
 *
 * @param {string} clientIp - The client's IP address
 * @returns {boolean}
 */
function isRateLimited(clientIp) {
  const now = Date.now();
  const clientRecord = rateLimitMap.get(clientIp) ?? {
    count: 0,
    windowStart: now,
  };

  // Reset window if expired
  if (now - clientRecord.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(clientIp, { count: 1, windowStart: now });
    return false;
  }

  // Check if limit exceeded
  if (clientRecord.count >= RATE_LIMIT_MAX) {
    return true;
  }

  // Increment counter
  rateLimitMap.set(clientIp, {
    ...clientRecord,
    count: clientRecord.count + 1,
  });
  
  return false;
}

/**
 * Clean up expired rate limit entries to prevent memory leaks
 */
function cleanupRateLimitMap() {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(ip);
    }
  }
}

// Clean up every 5 minutes
setInterval(cleanupRateLimitMap, 5 * 60 * 1000);

// ---------------------------------------------------------------------------
// Input Validation
// ---------------------------------------------------------------------------

/**
 * Validates and sanitizes the request body
 * 
 * @param {Object} body - Request body
 * @returns {Object} Validated data or throws error
 */
function validateRequestBody(body) {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }

  const message = (body.message || '').trim();
  const language = body.language || 'en';

  if (!message) {
    throw new Error('Message is required');
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`);
  }

  // Basic XSS prevention
  if (/<script|javascript:|data:/i.test(message)) {
    throw new Error('Invalid message content');
  }

  // Validate language code format
  if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(language)) {
    throw new Error('Invalid language code');
  }

  return { message, language };
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
 * Create error response with consistent format
 * 
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @returns {Response} JSON error response
 */
function createErrorResponse(message, status = 400) {
  return Response.json(
    { 
      error: message,
      timestamp: new Date().toISOString(),
    },
    { 
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

/**
 * Handle POST /api/chat requests.
 *
 * Validates the request body, delegates to generateElectionResponse,
 * and falls back to curated static answers on any credential/network failure.
 *
 * @param {Request} request - Incoming Next.js Request object
 * @returns {Promise<Response>} JSON response with { response } or { error }
 */
export async function POST(request) {
  const startTime = Date.now();
  
  try {
    // Rate limiting check
    const clientIp = getClientIp(request);
    if (isRateLimited(clientIp)) {
      console.warn(`[API /chat] Rate limit exceeded for IP: ${clientIp}`);
      return createErrorResponse(
        'Too many requests. Please wait a moment before trying again.',
        429
      );
    }

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      return createErrorResponse('Invalid JSON in request body');
    }

    const { message, language } = validateRequestBody(requestBody);

    // Log request (without sensitive data)
    console.log(`[API /chat] Request from ${clientIp}, language: ${language}, message length: ${message.length}`);

    // Generate AI response
    try {
      const electionAnswer = await generateElectionResponse(message, language);
      
      const responseTime = Date.now() - startTime;
      console.log(`[API /chat] Success in ${responseTime}ms`);
      
      return Response.json(
        { 
          response: electionAnswer,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        }
      );
      
    } catch (vertexApiError) {
      // Log the full error server-side; never expose internals to the client
      console.error('[API /chat] Vertex AI error:', {
        message: vertexApiError.message,
        code: vertexApiError.code,
        ip: clientIp,
        language,
      });

      // Simulate realistic latency so the UI typing indicator remains visible
      await new Promise((resolve) => setTimeout(resolve, FALLBACK_DELAY_MS));

      const fallbackResponse = selectFallback(message);
      const responseTime = Date.now() - startTime;
      
      console.log(`[API /chat] Fallback response in ${responseTime}ms`);
      
      return Response.json(
        { 
          response: fallbackResponse,
          fallback: true,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        }
      );
    }

  } catch (validationError) {
    console.warn(`[API /chat] Validation error: ${validationError.message}`);
    return createErrorResponse(validationError.message);
  } catch (unexpectedError) {
    console.error('[API /chat] Unexpected error:', unexpectedError);
    return createErrorResponse(
      'An unexpected error occurred. Please try again.',
      500
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return createErrorResponse('Method not allowed. Use POST.', 405);
}

export async function PUT() {
  return createErrorResponse('Method not allowed. Use POST.', 405);
}

export async function DELETE() {
  return createErrorResponse('Method not allowed. Use POST.', 405);
}
