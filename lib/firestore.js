/**
 * Firestore helpers — all conversation persistence lives here.
 *
 * Schema:
 *   conversations (collection)
 *     └── {uid} (document)
 *           └── turns (sub-collection)
 *                 └── {auto-id} (document)
 *                       - message   : string  — user's question
 *                       - response  : string  — AI answer
 *                       - language  : string  — BCP-47 language code
 *                       - sessionId : string  — random per-tab session ID
 *                       - timestamp : Timestamp
 *                       - savedAt   : Timestamp — server-side write time
 */

import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Persists a single conversation turn to Firestore.
 * Best-effort: failures are logged and never thrown to
 * avoid interrupting the user experience.
 * Uses serverTimestamp() for timezone-consistent ordering.
 *
 * @param {string} userId       - Authenticated Firebase UID
 * @param {string} userMessage  - The user's message
 * @param {string} aiResponse   - The AI response
 * @param {string} languageCode - Selected language code (e.g. "en", "hi")
 * @param {string} sessionId    - Random session identifier for this browser tab
 * @returns {Promise<string|null>} The Firestore document ID, or null on failure
 */
export async function saveConversation(userId, userMessage, aiResponse, languageCode, sessionId) {
  try {
    const turnsRef = collection(db, 'conversations', userId, 'turns');
    const docRef   = await addDoc(turnsRef, {
      message:   userMessage,
      response:  aiResponse,
      language:  languageCode,
      sessionId,
      timestamp: serverTimestamp(),
      savedAt:   serverTimestamp(),
    });
    return docRef.id;
  } catch (firestoreError) {
    // Non-fatal — never block the UI on a Firestore write failure.
    console.warn('[firestore] Failed to persist conversation turn:', firestoreError.code);
    return null;
  }
}

/**
 * Fetch the most recent N conversation turns for a user.
 *
 * @param {string} userId       - Authenticated Firebase UID
 * @param {number} [turnLimit=20] - Maximum number of turns to return
 * @returns {Promise<Array>} Array of turn objects with their doc IDs
 */
export async function getUserConversations(userId, turnLimit = 20) {
  try {
    const turnsRef   = collection(db, 'conversations', userId, 'turns');
    const turnsQuery = query(turnsRef, orderBy('timestamp', 'desc'), limit(turnLimit));
    const snapshot   = await getDocs(turnsQuery);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (firestoreError) {
    console.warn('[firestore] getUserConversations failed:', firestoreError.code);
    return [];
  }
}
