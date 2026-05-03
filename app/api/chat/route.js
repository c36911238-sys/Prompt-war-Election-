/**
 * POST /api/chat
 *
 * Accepts a user message and language code, returns an AI-generated
 * election-process answer via Vertex AI (Gemini 2.0 Flash).
 *
 * Falls back to curated static responses when credentials are absent,
 * so the app remains demonstrable without a live Google Cloud project.
 */

import { generateElectionResponse } from '@/lib/vertexService';

// ---------------------------------------------------------------------------
// Rate limiter
// ---------------------------------------------------------------------------

const RATE_LIMIT_MAX       = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// In-memory rate limiter: resets on server restart.
// Prevents Vertex AI quota exhaustion from a single client.
const rateLimitMap = new Map();

/**
 * Returns true if the given client IP has exceeded the rate limit.
 *
 * @param {string} clientIp - The client's IP address
 * @returns {boolean}
 */
function isRateLimited(clientIp) {
  const now          = Date.now();
  const clientRecord = rateLimitMap.get(clientIp) ?? {
    count:       0,
    windowStart: now,
  };

  if (now - clientRecord.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(clientIp, { count: 1, windowStart: now });
    return false;
  }

  if (clientRecord.count >= RATE_LIMIT_MAX) return true;

  rateLimitMap.set(clientIp, {
    ...clientRecord,
    count: clientRecord.count + 1,
  });
  return false;
}

// ---------------------------------------------------------------------------
// Fallback responses
// ---------------------------------------------------------------------------

/** Keyword-based fallback responses used when Vertex AI is unavailable. */
const FALLBACK_RESPONSES = {
  register:  'Voter registration is the first step in the electoral process. You typically need a valid ID and proof of address to register online or at a local government office.',
  vote:      'On voting day, bring valid photo identification to your designated polling station. Polls are usually open from early morning until early evening.',
  candidate: 'Candidates are individuals who stand for election. They submit nomination papers, campaign to present their policies, and are listed on the official ballot.',
};

const FALLBACK_DEFAULT =
  'Elections involve several key stages: voter registration, candidate nomination, campaigning, voting day, and the counting of results. Which stage would you like to know more about?';

/**
 * Select the most relevant fallback response for a given message.
 *
 * @param {string} userMessage - The original user message
 * @returns {string} A plain-English fallback answer
 */
function selectFallback(userMessage) {
  const lowerCaseMessage = userMessage.toLowerCase();
  if (lowerCaseMessage.includes('register') || lowerCaseMessage.includes('registration')) {
    return FALLBACK_RESPONSES.register;
  }
  if (lowerCaseMessage.includes('vote') || lowerCaseMessage.includes('voting')) {
    return FALLBACK_RESPONSES.vote;
  }
  if (lowerCaseMessage.includes('who') || lowerCaseMessage.includes('candidate')) {
    return FALLBACK_RESPONSES.candidate;
  }
  return FALLBACK_DEFAULT;
}

// ---------------------------------------------------------------------------
// Route handler
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
  // Rate limiting — checked before any other logic
  const clientIp = request.headers.get('x-forwarded-for') ?? 'unknown';
  if (isRateLimited(clientIp)) {
    return Response.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429 }
    );
  }

  let userMessage  = '';
  let languageCode = 'en';

  try {
    const requestBody = await request.json();
    userMessage  = (requestBody.message  || '').trim();
    languageCode =  requestBody.language || languageCode;

    if (!userMessage) {
      return Response.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    const electionAnswer = await generateElectionResponse(userMessage, languageCode);
    return Response.json({ response: electionAnswer });

  } catch (vertexApiError) {
    // Log the full error server-side; never expose internals to the client.
    console.error('[API /chat] Vertex AI error:', vertexApiError.message);

    // Simulate realistic latency so the UI typing indicator remains visible.
    await new Promise((resolve) => setTimeout(resolve, 800));

    return Response.json(
      { response: selectFallback(userMessage) },
      { status: 200 }
    );
  }
}
