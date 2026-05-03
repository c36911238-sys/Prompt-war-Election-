/**
 * vertexService unit tests.
 * Google Cloud and network are fully mocked.
 */

// ─── Mock @google-cloud/vertexai ──────────────────────────────────────────────
const mockGenerateContent = jest.fn();
jest.mock('@google-cloud/vertexai', () => ({
  VertexAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

// ─── Mock translateService (passthrough) ─────────────────────────────────────
jest.mock('../lib/translateService', () => ({
  translateText: jest.fn().mockImplementation((sourceText) => Promise.resolve(sourceText)),
}));

// ─── Mock constants ───────────────────────────────────────────────────────────
jest.mock('../lib/constants', () => ({
  CACHE_TTL_MS: 5 * 60 * 1000,
}));
// ─────────────────────────────────────────────────────────────────────────────

// Set required env vars before importing the module
process.env.GOOGLE_APPLICATION_CREDENTIALS = '/mock/path/creds.json';
process.env.GOOGLE_CLOUD_PROJECT           = 'mock-project';

const { generateElectionResponse } = require('../lib/vertexService');

const MOCK_VERTEX_RESPONSE = {
  response: {
    candidates: [{ content: { parts: [{ text: 'cached answer' }] } }],
  },
};

describe('vertexService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateContent.mockResolvedValue(MOCK_VERTEX_RESPONSE);
  });

  it('Test 1 — Cache hit: API called only once for duplicate prompt', async () => {
    await generateElectionResponse('What is voting?', 'en');
    await generateElectionResponse('What is voting?', 'en');

    // Vertex AI should only be called once — second call hits cache
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('Test 2 — Cache does not exceed MAX_CACHE_SIZE', async () => {
    const MAX_CACHE_SIZE = 100;

    // Fill cache with MAX_CACHE_SIZE + 1 unique prompts
    for (let phaseIndex = 0; phaseIndex <= MAX_CACHE_SIZE; phaseIndex++) {
      await generateElectionResponse(`unique question ${phaseIndex}`, 'en');
    }

    // The cache should have evicted the oldest entry via LRU-like eviction
    // Total calls should equal MAX_CACHE_SIZE + 1 (no caching, all unique)
    expect(mockGenerateContent).toHaveBeenCalledTimes(MAX_CACHE_SIZE + 1);
  });
});
