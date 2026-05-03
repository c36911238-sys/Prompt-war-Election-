/**
 * TTS API route tests.
 * Verifies input validation and error handling.
 *
 * Note: The Next.js `Response` global is not available in Jest/jsdom.
 * We polyfill it here so the route module can be tested in isolation.
 */

// ─── Polyfill Next.js globals not available in jsdom ─────────────────────────
if (typeof global.Response === 'undefined') {
  global.Response = class MockResponse {
    constructor(body, init = {}) {
      this._body   = body;
      this.status  = init.status || 200;
      this.headers = new Map(Object.entries(init.headers || {}));
    }
    async json() { return JSON.parse(this._body); }
    static json(data, init = {}) {
      return new MockResponse(JSON.stringify(data), init);
    }
  };
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Mock TTS Client ──────────────────────────────────────────────────────────
const mockSynthesizeSpeech = jest.fn().mockResolvedValue([
  { audioContent: Buffer.from('mock-audio') },
]);

jest.mock('@google-cloud/text-to-speech', () => ({
  TextToSpeechClient: jest.fn().mockImplementation(() => ({
    synthesizeSpeech: mockSynthesizeSpeech,
  })),
}));
// ─────────────────────────────────────────────────────────────────────────────

process.env.GOOGLE_APPLICATION_CREDENTIALS = '/mock/path/creds.json';

const { POST } = require('../app/api/tts/route');

/**
 * Create a minimal Next.js Request mock.
 * @param {object} body - JSON body
 */
function createMockRequest(body) {
  return { json: async () => body };
}

describe('POST /api/tts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSynthesizeSpeech.mockResolvedValue([{ audioContent: Buffer.from('mock-audio') }]);
  });

  it('Test 1 — Returns 400 for empty text (after 1000-char slice)', async () => {
    // Sending empty string → sliced to '' → hits the !ttsInputText guard → 400
    const mockRequest    = createMockRequest({ text: '', languageCode: 'en-US' });
    const ttsResponse    = await POST(mockRequest);
    const responseBody   = await ttsResponse.json();

    expect(ttsResponse.status).toBe(400);
    expect(responseBody.error).toBeDefined();
  });

  it('Test 2 — Returns 200 with audioContent for valid input', async () => {
    const mockRequest  = createMockRequest({ text: 'How do I vote?', languageCode: 'en-US' });
    const ttsResponse  = await POST(mockRequest);
    const responseBody = await ttsResponse.json();

    expect(ttsResponse.status).toBe(200);
    expect(responseBody.audioContent).toBeDefined();
  });

  it('Test 3 — Returns 500 when TTS client throws', async () => {
    mockSynthesizeSpeech.mockRejectedValueOnce(new Error('TTS unavailable'));

    const mockRequest  = createMockRequest({ text: 'test text', languageCode: 'en-US' });
    const ttsResponse  = await POST(mockRequest);
    const responseBody = await ttsResponse.json();

    expect(ttsResponse.status).toBe(500);
    expect(responseBody.error).toBe('Text-to-speech generation failed. Please try again.');
  });
});
