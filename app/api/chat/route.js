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

/** Keyword-based fallback responses used when Vertex AI is unavailable. */
const FALLBACK_RESPONSES = {
  register: 'Voter registration is the first step in the electoral process. You typically need a valid ID and proof of address to register online or at a local government office.',
  vote:     'On voting day, bring valid photo identification to your designated polling station. Polls are usually open from early morning until early evening.',
  candidate:'Candidates are individuals who stand for election. They submit nomination papers, campaign to present their policies, and are listed on the official ballot.',
};

const FALLBACK_DEFAULT =
  'Elections involve several key stages: voter registration, candidate nomination, campaigning, voting day, and the counting of results. Which stage would you like to know more about?';

/**
 * Select the most relevant fallback response for a given message.
 *
 * @param {string} message - The original user message
 * @returns {string} A plain-English fallback answer
 */
function selectFallback(message) {
  const lower = message.toLowerCase();
  if (lower.includes('register') || lower.includes('registration')) {
    return FALLBACK_RESPONSES.register;
  }
  if (lower.includes('vote') || lower.includes('voting')) {
    return FALLBACK_RESPONSES.vote;
  }
  if (lower.includes('who') || lower.includes('candidate')) {
    return FALLBACK_RESPONSES.candidate;
  }
  return FALLBACK_DEFAULT;
}

export async function POST(req) {
  let message  = 'Unknown';
  let language = 'en';

  try {
    const body = await req.json();
    message    = body.message  || message;
    language   = body.language || language;

    const content = await generateElectionResponse(message, language);
    return Response.json({ response: content });

  } catch (error) {
    // Log the full error server-side; never expose internals to the client.
    console.error('[API /chat] Vertex AI error:', error.message);

    // Simulate realistic latency so the UI typing indicator remains visible.
    await new Promise((resolve) => setTimeout(resolve, 800));

    return Response.json(
      { response: selectFallback(message) },
      { status: 200 }
    );
  }
}
