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
 * Persist a single chat turn to Firestore.
 *
 * @param {string} uid       - Firebase Auth UID
 * @param {string} message   - The user's message
 * @param {string} response  - The AI response
 * @param {string} language  - Selected language code (e.g. "en", "hi")
 * @param {string} sessionId - Random session identifier for this browser tab
 * @returns {Promise<string>} The Firestore document ID
 */
export async function saveConversation(uid, message, response, language, sessionId) {
  try {
    const turnsRef = collection(db, 'conversations', uid, 'turns');
    const docRef = await addDoc(turnsRef, {
      message,
      response,
      language,
      sessionId,
      timestamp: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    // Non-fatal — never block the UI on a Firestore write failure.
    console.warn('[Firestore] saveConversation failed:', err.message);
    return null;
  }
}

/**
 * Fetch the most recent N conversation turns for a user.
 *
 * @param {string} uid   - Firebase Auth UID
 * @param {number} [n=20] - Maximum number of turns to return
 * @returns {Promise<Array>} Array of turn objects with their doc IDs
 */
export async function getUserConversations(uid, n = 20) {
  try {
    const turnsRef = collection(db, 'conversations', uid, 'turns');
    const q = query(turnsRef, orderBy('timestamp', 'desc'), limit(n));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.warn('[Firestore] getUserConversations failed:', err.message);
    return [];
  }
}
