/**
 * /api/chat route unit tests.
 * Covers: missing body (400), rate limiting (429),
 * and error masking (no internal details leaked to client).
 *
 * The Next.js `Response` global is polyfilled for Jest/jsdom.
 */

// ─── Polyfill Next.js Web API globals ────────────────────────────────────────
if (typeof global.Response === 'undefined') {
  global.Response = class MockResponse {
    constructor(body, init = {}) {
      this._body  = body;
      this.status = init.status || 200;
    }
    async json() { return JSON.parse(this._body); }
    static json(data, init = {}) {
      return new MockResponse(JSON.stringify(data), init);
    }
  };
}

if (typeof global.Request === 'undefined') {
  global.Request = class MockRequest {
    constructor(url, init = {}) {
      this.url    = url;
      this.method = init.method || 'GET';
      this._body  = init.body || '';
      this.headers = {
        get: (key) => (init.headers || {})[key.toLowerCase()] ?? null,
      };
    }
    async json() { return JSON.parse(this._body); }
  };
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Mock Vertex AI service ───────────────────────────────────────────────────
jest.mock('../lib/vertexService', () => ({
  generateElectionResponse: jest.fn().mockResolvedValue('Mocked election answer.'),
}));
// ─────────────────────────────────────────────────────────────────────────────

const { POST } = require('../app/api/chat/route');

/**
 * Build a mock POST request to /api/chat.
 * @param {object} body - JSON body
 * @param {object} [headers] - Optional headers
 */
function buildChatRequest(body, headers = {}) {
  return new Request('http://localhost/api/chat', {
    method:  'POST',
    body:    JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('POST /api/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Test 1 — Returns 400 when message is missing', async () => {
    const chatRequest    = buildChatRequest({});
    const chatResponse   = await POST(chatRequest);
    expect(chatResponse.status).toBe(400);
    const responseBody = await chatResponse.json();
    expect(responseBody.error).toBeDefined();
  });

  it('Test 2 — Returns 429 when rate limit is exceeded', async () => {
    const makeRequest = () =>
      buildChatRequest(
        { message: 'test question', language: 'en' },
        { 'x-forwarded-for': '9.9.9.9' }
      );

    // Exhaust the 10-request window
    for (let requestIndex = 0; requestIndex < 10; requestIndex++) {
      await POST(makeRequest());
    }

    // 11th request from same IP should be rate-limited
    const rateLimitedResponse = await POST(makeRequest());
    expect(rateLimitedResponse.status).toBe(429);

    const responseBody = await rateLimitedResponse.json();
    expect(responseBody.error).toMatch(/too many requests/i);
  });

  it('Test 3 — Error response never exposes internal error details', async () => {
    const { generateElectionResponse } = require('../lib/vertexService');
    generateElectionResponse.mockRejectedValueOnce(
      new Error('GOOGLE_INTERNAL_ERROR: secret-key-xyz')
    );

    const chatRequest  = buildChatRequest(
      { message: 'test question', language: 'en' },
      { 'x-forwarded-for': '8.8.8.8' }
    );
    const chatResponse = await POST(chatRequest);
    const responseBody = await chatResponse.json();

    // Route falls back to curated static response — never raw error
    expect(JSON.stringify(responseBody)).not.toContain('GOOGLE_INTERNAL_ERROR');
    expect(JSON.stringify(responseBody)).not.toContain('secret-key-xyz');
  });
});
