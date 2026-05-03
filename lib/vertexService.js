/**
 * Vertex AI service — Gemini 2.0 Flash.
 *
 * Design decisions:
 *  - Singleton client: the VertexAI instance is created once per server
 *    process and reused across requests.
 *  - Response cache: identical queries are served from memory for
 *    CACHE_TTL_MS milliseconds, avoiding redundant API calls.
 *  - Separation of concerns: AI generation is always in English;
 *    translation to the target language is delegated to translateService.
 */

import { VertexAI } from '@google-cloud/vertexai';
import { translateText } from './translateService';
import { CACHE_TTL_MS } from './constants';

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

  const projectId  = process.env.GOOGLE_CLOUD_PROJECT || 'your-project-id';
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
 * Keys are `{language}::{normalised message}`.
 */
const responseCache = new Map();

function getCached(key) {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key, value) {
  responseCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate an election-process answer using Gemini 2.0 Flash.
 *
 * The model always responds in English; the text is then translated to
 * the requested language via the Google Translate API. Responses for
 * identical inputs are cached for CACHE_TTL_MS milliseconds.
 *
 * @param {string} message  - The user's question
 * @param {string} language - BCP-47 target language code (e.g. 'hi', 'fr')
 * @returns {Promise<string>} The translated AI answer
 */
export async function generateElectionResponse(message, language) {
  const cacheKey = `${language}::${message.trim().toLowerCase()}`;
  const cached   = getCached(cacheKey);
  if (cached) return cached;

  const model = getGenerativeModel();

  const prompt = [
    'You are a helpful, professional, and completely objective AI Election Process Assistant.',
    'Your goal is to educate users on democratic election processes, timelines, and general voting procedures.',
    'Do not endorse any specific political party or candidate.',
    'Respond in English only — translation is handled separately.',
    '',
    `User question: "${message}"`,
    '',
    'Provide a concise, accurate, easy-to-understand answer in 2–4 sentences.',
  ].join('\n');

  const result      = await model.generateContent(prompt);
  const englishText = result.response.candidates[0].content.parts[0].text;
  const finalText   = await translateText(englishText, language);

  setCached(cacheKey, finalText);
  return finalText;
}
