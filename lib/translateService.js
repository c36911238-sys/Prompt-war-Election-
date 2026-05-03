/**
 * Google Translate API wrapper (server-side only).
 *
 * Uses the @google-cloud/translate v2 (REST) client.
 * Credentials are picked up from the same env vars used by Vertex AI:
 *   GOOGLE_APPLICATION_CREDENTIALS  — path to service-account JSON (local)
 *   GOOGLE_CREDENTIALS_JSON         — raw JSON string (Vercel / Railway)
 *
 * Returns the original text unchanged if translation fails or the
 * language is already English.
 */

import { Translate } from '@google-cloud/translate/build/src/v2/index.js';

/** Singleton Translate client (created once per server process). */
let translateClient = null;

function getTranslateClient() {
  if (translateClient) return translateClient;

  const hasJsonString = !!process.env.GOOGLE_CREDENTIALS_JSON;

  const clientOptions = hasJsonString
    ? { credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON) }
    : {};

  translateClient = new Translate(clientOptions);
  return translateClient;
}

/**
 * Translate text to the target language using Google Translate API.
 * Returns the original text unchanged when translation fails or
 * when the target language is already English.
 *
 * @param {string} sourceText      - Source text (English)
 * @param {string} targetLanguage  - BCP-47 target language code (e.g. 'hi', 'fr')
 * @returns {Promise<string>}      - Translated text, or original on failure
 */
export async function translateText(sourceText, targetLanguage) {
  if (!targetLanguage || targetLanguage === 'en') return sourceText;

  try {
    const client = getTranslateClient();
    const [translationResult] = await client.translate(sourceText, targetLanguage);
    return translationResult;
  } catch (translateError) {
    console.warn('[translateService] Translation failed, returning original:', translateError.message);
    throw new Error(
      `[translateService] Translation failed for language "${targetLanguage}": ${translateError.message}`
    );
  }
}
