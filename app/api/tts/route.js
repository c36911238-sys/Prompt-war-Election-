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
 * - Centralized rate limiting with monitoring
 * - Timeout handling for API calls
 * - Consistent error handling and logging
 * - Security measures and request correlation
 */

import { TextToSpeechClient } from '@google-cloud/text-to-speech';
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
  validateLanguageCode,
  sanitizeTextInput,
  validateHttpMethod,
  createMethodNotAllowedResponse
} from '@/lib/apiUtils';
import { checkRateLimit, createRateLimitMessage } from '@/lib/rateLimiting';

// ---------------------------------------------------------------------------
// Constants and Configuration
// ---------------------------------------------------------------------------

/** Singleton TTS client with enhanced error handling */
let ttsClient = null;

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
      throw new Error(ERROR_MESSAGES.SERVICE.CONFIGURATION_ERROR('Google Cloud TTS'));
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
    logRequest('TTS', 'ERROR', 'Client initialization failed', { error: error.message });
    throw new Error(ERROR_MESSAGES.SERVICE.UNAVAILABLE('TTS'));
  }
}

// ---------------------------------------------------------------------------
// Input Validation
// ---------------------------------------------------------------------------

/**
 * Validate and sanitize TTS request
 * 
 * @param {Object} body - Request body
 * @returns {Object} Validated data { text: string, languageCode: string }
 * @throws {Error} If validation fails
 */
function validateTtsRequest(body) {
  if (!body || typeof body !== 'object') {
    throw new Error(ERROR_MESSAGES.SECURITY.INVALID_REQUEST);
  }

  // Extract and validate text
  let text = body.text;
  if (!text) {
    throw new Error(ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD('Text'));
  }

  // Sanitize and validate text length
  text = sanitizeTextInput(text);
  validateTextLength(text, LIMITS.TTS_TEXT_MAX, 1, 'Text');

  // Extract and validate language code
  const languageCode = body.languageCode || 'en-US';
  validateLanguageCode(languageCode);

  return { text, languageCode };
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
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    // Get client IP for rate limiting and logging
    const clientIp = getClientIp(request);
    
    // Check rate limiting
    const rateLimitResult = checkRateLimit('tts', clientIp);
    if (!rateLimitResult.allowed) {
      const message = createRateLimitMessage('tts', rateLimitResult.retryAfter);
      logRequest('TTS', 'WARN', 'Rate limit exceeded', { 
        requestId, 
        clientIp, 
        retryAfter: rateLimitResult.retryAfter 
      });
      
      return createErrorResponse(
        message,
        HTTP_STATUS.TOO_MANY_REQUESTS,
        { 'Retry-After': rateLimitResult.retryAfter?.toString() },
        requestId
      );
    }

    // Parse and validate request
    const requestBody = await parseRequestBody(request);
    const { text, languageCode } = validateTtsRequest(requestBody);

    // Log request
    logRequest('TTS', 'INFO', 'Processing TTS request', {
      requestId,
      clientIp,
      languageCode,
      textLength: text.length,
    });

    // Get TTS client
    const ttsClientInstance = getTTSClient();

    // Synthesize speech with timeout
    const ttsPromise = ttsClientInstance.synthesizeSpeech({
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

    const [ttsApiResponse] = await withTimeout(
      ttsPromise, 
      LIMITS.TTS_TIMEOUT_MS, 
      'TTS API call'
    );

    // Validate response
    if (!ttsApiResponse.audioContent) {
      throw new Error('No audio content received from TTS service');
    }

    // Convert Buffer to base64 string for JSON transport
    const audioBase64 = Buffer.from(ttsApiResponse.audioContent).toString('base64');
    
    const responseTime = Date.now() - startTime;
    logRequest('TTS', 'INFO', 'TTS request completed successfully', {
      requestId,
      clientIp,
      responseTime,
      audioSize: audioBase64.length,
    });

    return createSuccessResponse(
      { 
        audioContent: audioBase64,
        languageCode,
      },
      {
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      },
      requestId
    );

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Handle validation errors
    if (error.message && (
      error.message.includes('required') || 
      error.message.includes('Invalid') ||
      error.message.includes('too long') ||
      error.message.includes('format')
    )) {
      logRequest('TTS', 'WARN', 'Validation error', {
        requestId,
        clientIp: getClientIp(request),
        error: error.message,
        responseTime,
      });
      
      return createErrorResponse(error.message, HTTP_STATUS.BAD_REQUEST, {}, requestId);
    }
    
    // Handle timeout errors
    if (error.message?.includes('timeout')) {
      logRequest('TTS', 'ERROR', 'TTS timeout', {
        requestId,
        clientIp: getClientIp(request),
        responseTime,
      });
      
      return createErrorResponse(
        ERROR_MESSAGES.SERVICE.TIMEOUT('TTS'),
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        {},
        requestId
      );
    }
    
    // TTS service errors
    logRequest('TTS', 'ERROR', 'TTS service error', {
      requestId,
      clientIp: getClientIp(request),
      error: error.message,
      code: error.code,
      responseTime,
    });
    
    return createErrorResponse(
      ERROR_MESSAGES.SERVICE.UNAVAILABLE('TTS'),
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      {},
      requestId
    );
  }
}

// Handle unsupported methods
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
