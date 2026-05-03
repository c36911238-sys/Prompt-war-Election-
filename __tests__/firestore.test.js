/**
 * Firestore helpers unit tests.
 * Firebase is fully mocked — no network calls are made.
 */

// ─── Mock Firebase Firestore ──────────────────────────────────────────────────
const mockAddDoc   = jest.fn().mockResolvedValue({ id: 'mock-doc-id' });
const mockGetDocs  = jest.fn();
const mockQuery    = jest.fn().mockReturnValue('mock-query');
const mockOrderBy  = jest.fn().mockReturnValue('mock-orderby');
const mockLimit    = jest.fn().mockReturnValue('mock-limit');
const mockCollection = jest.fn().mockReturnValue('mock-collection-ref');

jest.mock('firebase/firestore', () => ({
  collection:      (...args) => mockCollection(...args),
  addDoc:          (...args) => mockAddDoc(...args),
  query:           (...args) => mockQuery(...args),
  orderBy:         (...args) => mockOrderBy(...args),
  limit:           (...args) => mockLimit(...args),
  getDocs:         (...args) => mockGetDocs(...args),
  serverTimestamp: jest.fn().mockReturnValue({ _methodName: 'serverTimestamp' }),
}));

jest.mock('../lib/firebase', () => ({ db: {} }));
// ─────────────────────────────────────────────────────────────────────────────

import { saveConversation, getUserConversations } from '../lib/firestore';

describe('Firestore helpers', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('saveConversation', () => {
    it('returns the new document ID on success', async () => {
      const id = await saveConversation('uid-123', 'How do I vote?', 'Show your ID.', 'en', 'session-abc');
      expect(id).toBe('mock-doc-id');
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
    });

    it('returns null and does not throw when Firestore fails', async () => {
      mockAddDoc.mockRejectedValueOnce(new Error('permission-denied'));
      const id = await saveConversation('uid-123', 'test', 'test', 'en', 'session-abc');
      expect(id).toBeNull();
    });
  });

  describe('getUserConversations', () => {
    it('returns mapped conversation docs', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          { id: 'turn-1', data: () => ({ message: 'Q1', response: 'A1', language: 'en' }) },
          { id: 'turn-2', data: () => ({ message: 'Q2', response: 'A2', language: 'hi' }) },
        ],
      });

      const turns = await getUserConversations('uid-123');
      expect(turns).toHaveLength(2);
      expect(turns[0]).toEqual({ id: 'turn-1', message: 'Q1', response: 'A1', language: 'en' });
    });

    it('returns empty array when Firestore fails', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('unavailable'));
      const turns = await getUserConversations('uid-123');
      expect(turns).toEqual([]);
    });
  });
});
