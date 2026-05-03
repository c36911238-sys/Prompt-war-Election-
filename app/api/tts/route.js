/**
 * Google Cloud Text-to-Speech API route.
 *
 * POST /api/tts
 * Body: { text: string, languageCode: string }
 *
 * Returns: { audioContent: string } — base64-encoded MP3 audio
 *
 * Credentials come from the same env vars as Vertex AI.
 */

import { TextToSpeechClient } from '@google-cloud/text-to-speech';

/** Singleton TTS client. */
let ttsClient = null;

function getTTSClient() {
  if (ttsClient) return ttsClient;

  const hasJsonString = !!process.env.GOOGLE_CREDENTIALS_JSON;
  const clientOptions = hasJsonString
    ? { credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON) }
    : {};

  ttsClient = new TextToSpeechClient(clientOptions);
  return ttsClient;
}

/**
 * Handle POST /api/tts requests.
 *
 * Converts the provided text to MP3 audio using Google Cloud TTS,
 * returning it as a base64-encoded string for browser playback.
 *
 * @param {Request} req - Incoming Next.js Request object
 * @returns {Promise<Response>} JSON response with { audioContent } or { error }
 */
export async function POST(req) {
  let ttsInputText  = '';
  let languageCode  = 'en-US';

  try {
    const requestBody = await req.json();
    ttsInputText = (requestBody.text || '').slice(0, 1000); // Hard cap — avoid abuse
    languageCode = requestBody.languageCode || 'en-US';

    if (!ttsInputText) {
      return Response.json({ error: 'text is required' }, { status: 400 });
    }

    const ttsClientInstance = getTTSClient();

    const [ttsApiResponse] = await ttsClientInstance.synthesizeSpeech({
      input:       { text: ttsInputText },
      voice:       { languageCode, ssmlGender: 'NEUTRAL' },
      audioConfig: { audioEncoding: 'MP3' },
    });

    // Convert Buffer to base64 string for JSON transport.
    const audioBase64 = Buffer.from(ttsApiResponse.audioContent).toString('base64');

    return Response.json({ audioContent: audioBase64 });

  } catch (ttsClientError) {
    // Never expose raw error to the client.
    console.error('[TTS] synthesizeSpeech failed:', ttsClientError.message);
    return Response.json(
      { error: 'Text-to-speech generation failed. Please try again.' },
      { status: 500 }
    );
  }
}
