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

export async function POST(req) {
  let text = '';
  let languageCode = 'en-US';

  try {
    const body = await req.json();
    text = (body.text || '').slice(0, 1000); // Hard cap — avoid abuse
    languageCode = body.languageCode || 'en-US';

    if (!text) {
      return Response.json({ error: 'text is required' }, { status: 400 });
    }

    const client = getTTSClient();

    const [response] = await client.synthesizeSpeech({
      input:       { text },
      voice:       { languageCode, ssmlGender: 'NEUTRAL' },
      audioConfig: { audioEncoding: 'MP3' },
    });

    // Convert Buffer to base64 string for JSON transport.
    const audioBase64 = Buffer.from(response.audioContent).toString('base64');

    return Response.json({ audioContent: audioBase64 });

  } catch (error) {
    // Never expose raw error to the client.
    console.error('[TTS] synthesizeSpeech failed:', error.message);
    return Response.json(
      { error: 'Text-to-speech generation failed. Please try again.' },
      { status: 500 }
    );
  }
}
