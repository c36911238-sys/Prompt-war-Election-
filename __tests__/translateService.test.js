/**
 * translateService unit tests.
 * The Google Cloud Translate client is fully mocked — no network calls.
 */

// ─── Mock @google-cloud/translate ────────────────────────────────────────────
const mockTranslate = jest.fn();

jest.mock('@google-cloud/translate/build/src/v2/index.js', () => ({
  Translate: jest.fn().mockImplementation(() => ({
    translate: mockTranslate,
  })),
}));
// ─────────────────────────────────────────────────────────────────────────────

const { translateText } = require('../lib/translateService');

describe('translateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Test 1 — Returns source text unchanged when target language is English', async () => {
    const translationResult = await translateText('What is voting?', 'en');
    expect(translationResult).toBe('What is voting?');
    // Translate client should NOT be called for English — early return
    expect(mockTranslate).not.toHaveBeenCalled();
  });

  it('Test 2 — Returns translated text on successful API call', async () => {
    mockTranslate.mockResolvedValueOnce(['¿Qué es votar?', {}]);
    const translationResult = await translateText('What is voting?', 'es');
    expect(translationResult).toBe('¿Qué es votar?');
  });

  it('Test 3 — Throws descriptive error with language context on API failure', async () => {
    mockTranslate.mockRejectedValueOnce(new Error('API quota exceeded'));
    await expect(translateText('test', 'hi'))
      .rejects
      .toThrow('[translateService]');
  });

  it('Test 4 — Error message includes the target language code', async () => {
    mockTranslate.mockRejectedValueOnce(new Error('Network error'));
    await expect(translateText('test text', 'fr'))
      .rejects
      .toThrow('"fr"');
  });
});
