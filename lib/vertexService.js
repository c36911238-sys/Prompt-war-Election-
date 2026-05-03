/**
 * Vertex AI — Gemini 2.0 Flash service.
 *
 * Performance improvements over v1:
 *  1. Singleton VertexAI client — created once per server process,
 *     not on every request.
 *  2. In-memory response cache (5-min TTL) — identical queries return
 *     instantly without hitting the API.
 *  3. Upgraded model: gemini-2.0-flash-001 (faster, cheaper, smarter
 *     than 1.5-pro-preview).
 *  4. Real translation via Google Translate API instead of mock suffixes.
 */

import { VertexAI } from '@google-cloud/vertexai';
import { translateText } from './translateService';
import { CACHE_TTL_MS } from './constants';

// ---------------------------------------------------------------------------
// Singleton client
// ---------------------------------------------------------------------------

/** @type {import('@google-cloud/vertexai').VertexAI | null} */
let vertexClient = null;

/** @type {import('@google-cloud/vertexai').GenerativeModel | null} */
let generativeModel = null;

function getGenerativeModel() {
  if (generativeModel) return generativeModel;

  const hasFilePath  = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const hasJsonString = !!process.env.GOOGLE_CREDENTIALS_JSON;

  if (!hasFilePath && !hasJsonString) {
    throw new Error('Missing Google Cloud Credentials');
  }

  const projectId   = process.env.GOOGLE_CLOUD_PROJECT || 'your-project-id';
  const authOptions = hasJsonString
    ? { credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON) }
    : undefined;

  vertexClient = new VertexAI({
    project:            projectId,
    location:           'us-central1',
    googleAuthOptions:  authOptions,
  });

  generativeModel = vertexClient.getGenerativeModel({
    model: 'gemini-2.0-flash-001',          // ← upgraded from 1.5-pro-preview
    generationConfig: {
      temperature:     0.2,   // Deterministic, factual
      maxOutputTokens: 512,
      topP:            0.8,
    },
  });

  return generativeModel;
}

// ---------------------------------------------------------------------------
// Response cache
// ---------------------------------------------------------------------------

/** @type {Map<string, { value: string; expiresAt: number }>} */
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

function setCache(key, value) {
  responseCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate an election-process answer using Gemini 2.0 Flash.
 *
 * The AI always replies in English for accuracy; the response is then
 * translated to the requested language via Google Translate API.
 *
 * @param {string} message  - The user's question
 * @param {string} language - BCP-47 target language code
 * @returns {Promise<string>} AI-generated (and translated) answer
 */
export async function generateElectionResponse(message, language) {
  const cacheKey = `${language}::${message.trim().toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const model = getGenerativeModel();

  const prompt = `You are a helpful, professional, and completely objective AI Election Process Assistant.
Your primary goal is to educate the user on democratic election processes, timelines, and general voting procedures.
Do not endorse any specific political party or candidate.
Respond in English only — the response will be translated separately.

User question: "${message}"

Provide a concise, accurate, easy-to-understand answer in 2–4 sentences.`;

  const result   = await model.generateContent(prompt);
  const englishText = result.response.candidates[0].content.parts[0].text;

  // Translate to the requested language using Google Translate API.
  const finalText = await translateText(englishText, language);

  setCache(cacheKey, finalText);
  return finalText;
}
