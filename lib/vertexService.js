/**
 * Vertex AI service — Gemini 2.0 Flash.
 *
 * Design decisions:
 *  - Singleton client: the VertexAI instance is created once per server
 *    process and reused across requests.
 *  - Response cache: identical queries are served from memory for
 *    RESPONSE_CACHE_TTL_MS milliseconds, avoiding redundant API calls.
 *  - Separation of concerns: AI generation is always in English;
 *    translation to the target language is delegated to translateService.
 */

import { VertexAI } from '@google-cloud/vertexai';
import { translateText } from './translateService';
import { CACHE_TTL_MS } from './constants';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RESPONSE_CACHE_TTL_MS = CACHE_TTL_MS;
const MAX_CACHE_SIZE = 100;

// ---------------------------------------------------------------------------
// Singleton model instance
// ---------------------------------------------------------------------------

/** @type {import('@google-cloud/vertexai').GenerativeModel | null} */
let generativeModel = null;

/**
 * Return the cached GenerativeModel, creating it on first call.
 * Throws if Google Cloud credentials are missing.
 */
function getGenerativeModel() {
  if (generativeModel) return generativeModel;

  const hasFilePath   = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const hasJsonString = !!process.env.GOOGLE_CREDENTIALS_JSON;

  if (!hasFilePath && !hasJsonString) {
    throw new Error('Missing Google Cloud credentials. Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CREDENTIALS_JSON.');
  }

  const projectId   = process.env.GOOGLE_CLOUD_PROJECT || 'your-project-id';
  const authOptions = hasJsonString
    ? { credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON) }
    : undefined;

  const vertexAI = new VertexAI({
    project:           projectId,
    location:          'us-central1',
    googleAuthOptions: authOptions,
  });

  generativeModel = vertexAI.getGenerativeModel({
    model: 'gemini-2.0-flash-001',
    generationConfig: {
      temperature:     0.2,  // Low temperature → factual, deterministic answers
      maxOutputTokens: 512,
      topP:            0.8,
    },
  });

  return generativeModel;
}

// ---------------------------------------------------------------------------
// Response cache
// ---------------------------------------------------------------------------

/**
 * @type {Map<string, { value: string; expiresAt: number }>}
 * Keys are `{language}:{normalised message}`.
 */
const responseCache = new Map();

function getCached(cacheKey) {
  const entry = responseCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(cacheKey);
    return null;
  }
  return entry.value;
}

function setCached(cacheKey, cachedValue) {
  // LRU-like eviction: oldest entry removed when cap is
  // reached to prevent unbounded memory growth in
  // long-running server instances
  if (responseCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = responseCache.keys().next().value;
    responseCache.delete(oldestKey);
  }
  responseCache.set(cacheKey, { value: cachedValue, expiresAt: Date.now() + RESPONSE_CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate an election-process answer using Gemini 2.0 Flash.
 *
 * The model always responds in English; the text is then translated to
 * the requested language via the Google Translate API. Responses for
 * identical inputs are cached for RESPONSE_CACHE_TTL_MS milliseconds.
 *
 * @param {string} userMessage  - The user's question
 * @param {string} languageCode - BCP-47 target language code (e.g. 'hi', 'fr')
 * @returns {Promise<string>} The translated AI answer
 */
export async function generateElectionResponse(userMessage, languageCode) {
  const cacheKey   = `${languageCode}:${userMessage.trim().toLowerCase()}`;
  const cached     = getCached(cacheKey);
  if (cached) return cached;

  const model = getGenerativeModel();

  const prompt = [
    'You are a helpful, professional, and completely objective AI Election Process Assistant.',
    'Your goal is to educate users on democratic election processes, timelines, and general voting procedures.',
    'Do not endorse any specific political party or candidate.',
    'Respond in English only — translation is handled separately.',
    '',
    `User question: "${userMessage}"`,
    '',
    'Provide a concise, accurate, easy-to-understand answer in 2–4 sentences.',
  ].join('\n');

  const vertexResponse = await model.generateContent(prompt);
  const englishText    = vertexResponse.response.candidates[0].content.parts[0].text;

  let finalText = englishText;
  try {
    finalText = await translateText(englishText, languageCode);
  } catch (translationError) {
    // Best-effort translation: fall back to English on failure.
    // The API route will still return a valid response to the user.
    console.warn('[vertexService] Translation failed, returning English:', translationError.message);
  }

  setCached(cacheKey, finalText);
  return finalText;
}
