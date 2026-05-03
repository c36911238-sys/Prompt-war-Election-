/**
 * Google Cloud Text-to-Speech API route.
 *
 * POST /api/tts
 * Body: { text: string, languageCode: string }
 *
 * Returns: { audioContent: string } — base64-encoded MP3 audio
 *
 * Features:
 * - Input validation and sanitization
 * - Rate limiting
 * - Error handling with fallbacks
 * - Security measures
 */

import { TextToSpeechClient } from '@google-cloud/text-to-speech';

// ---------------------------------------------------------------------------
// Constants and Configuration
// ---------------------------------------------------------------------------

const MAX_TEXT_LENGTH = 1000;
const RATE_LIMIT_MAX = 20; // Higher limit for TTS
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

// Rate limiting for TTS requests
const ttsRateLimitMap = new Map();

/** Singleton TTS client with enhanced error handling */
let ttsClient = null;

// ---------------------------------------------------------------------------
// Rate Limiting
// ---------------------------------------------------------------------------

/**
 * Check if client has exceeded TTS rate limit
 * 
 * @param {string} clientIp - Client IP address
 * @returns {boolean} True if rate limited
 */
function isTtsRateLimited(clientIp) {
  const now = Date.now();
  const clientRecord = ttsRateLimitMap.get(clientIp) ?? {
    count: 0,
    windowStart: now,
  };

  // Reset window if expired
  if (now - clientRecord.windowStart > RATE_LIMIT_WINDOW_MS) {
    ttsRateLimitMap.set(clientIp, { count: 1, windowStart: now });
    return false;
  }

  // Check if limit exceeded
  if (clientRecord.count >= RATE_LIMIT_MAX) {
    return true;
  }

  // Increment counter
  ttsRateLimitMap.set(clientIp, {
    ...clientRecord,
    count: clientRecord.count + 1,
  });
  
  return false;
}

// Clean up expired entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ttsRateLimitMap.entries()) {
    if (now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
      ttsRateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// ---------------------------------------------------------------------------
// Client Management
// ---------------------------------------------------------------------------

/**
 * Get or create TTS client with proper error handling
 * 
 * @returns {TextToSpeechClient} TTS client instance
 * @throws {Error} If credentials are invalid
 */
function getTTSClient() {
  if (ttsClient) return ttsClient;

  try {
    const hasJsonString = !!process.env.GOOGLE_CREDENTIALS_JSON;
    const hasProjectId = !!process.env.GOOGLE_CLOUD_PROJECT;
    
    if (!hasJsonString && !hasProjectId) {
      throw new Error('Google Cloud credentials not configured');
    }

    const clientOptions = hasJsonString
      ? { 
          credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
          projectId: process.env.GOOGLE_CLOUD_PROJECT,
        }
      : { projectId: process.env.GOOGLE_CLOUD_PROJECT };

    ttsClient = new TextToSpeechClient(clientOptions);
    return ttsClient;
    
  } catch (error) {
    console.error('[TTS] Client initialization failed:', error.message);
    throw new Error('TTS service unavailable');
  }
}

// ---------------------------------------------------------------------------
// Input Validation
// ---------------------------------------------------------------------------

/**
 * Validate and sanitize TTS request
 * 
 * @param {Object} body - Request body
 * @returns {Object} Validated data
 * @throws {Error} If validation fails
 */
function validateTtsRequest(body) {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }

  let text = (body.text || '').trim();
  const languageCode = body.languageCode || 'en-US';

  if (!text) {
    throw new Error('Text is required');
  }

  if (text.length > MAX_TEXT_LENGTH) {
    throw new Error(`Text too long. Maximum ${MAX_TEXT_LENGTH} characters allowed.`);
  }

  // Remove HTML tags and sanitize
  text = text.replace(/<[^>]*>/g, '');
  
  // Remove potentially harmful content
  text = text.replace(/[<>\"'&]/g, '');
  
  // Validate language code format
  if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(languageCode)) {
    throw new Error('Invalid language code format');
  }

  return { text, languageCode };
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/**
 * Get client IP from request headers
 * 
 * @param {Request} request - Request object
 * @returns {string} Client IP
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
 * Create standardized error response
 * 
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @returns {Response} JSON error response
 */
function createTtsErrorResponse(message, status = 400) {
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
 * Handle POST /api/tts requests.
 *
 * Converts the provided text to MP3 audio using Google Cloud TTS,
 * returning it as a base64-encoded string for browser playback.
 *
 * @param {Request} request - Incoming Next.js Request object
 * @returns {Promise<Response>} JSON response with { audioContent } or { error }
 */
export async function POST(request) {
  const startTime = Date.now();
  
  try {
    // Rate limiting check
    const clientIp = getClientIp(request);
    if (isTtsRateLimited(clientIp)) {
      console.warn(`[TTS] Rate limit exceeded for IP: ${clientIp}`);
      return createTtsErrorResponse(
        'Too many TTS requests. Please wait before trying again.',
        429
      );
    }

    // Parse and validate request
    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      return createTtsErrorResponse('Invalid JSON in request body');
    }

    const { text, languageCode } = validateTtsRequest(requestBody);

    // Log request
    console.log(`[TTS] Request from ${clientIp}, language: ${languageCode}, text length: ${text.length}`);

    // Get TTS client
    const ttsClientInstance = getTTSClient();

    // Synthesize speech
    const [ttsApiResponse] = await ttsClientInstance.synthesizeSpeech({
      input: { text },
      voice: { 
        languageCode, 
        ssmlGender: 'NEUTRAL',
        name: undefined, // Let Google choose the best voice
      },
      audioConfig: { 
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0,
        volumeGainDb: 0.0,
      },
    });

    // Validate response
    if (!ttsApiResponse.audioContent) {
      throw new Error('No audio content received from TTS service');
    }

    // Convert Buffer to base64 string for JSON transport
    const audioBase64 = Buffer.from(ttsApiResponse.audioContent).toString('base64');
    
    const responseTime = Date.now() - startTime;
    console.log(`[TTS] Success in ${responseTime}ms, audio size: ${audioBase64.length} chars`);

    return Response.json(
      { 
        audioContent: audioBase64,
        timestamp: new Date().toISOString(),
        languageCode,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
        },
      }
    );

  } catch (error) {
    // Handle validation errors
    if (error.message && (
      error.message.includes('required') || 
      error.message.includes('Invalid') ||
      error.message.includes('too long')
    )) {
      return createTtsErrorResponse(error.message);
    }
    
    // TTS service errors
    console.error('[TTS] Service error:', {
      message: error.message,
      code: error.code,
      ip: getClientIp(request),
    });
    
    return createTtsErrorResponse(
      'Text-to-speech service is temporarily unavailable. Please try again.',
      503
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return createTtsErrorResponse('Method not allowed. Use POST.', 405);
}

export async function PUT() {
  return createTtsErrorResponse('Method not allowed. Use POST.', 405);
}

export async function DELETE() {
  return createTtsErrorResponse('Method not allowed. Use POST.', 405);
}
