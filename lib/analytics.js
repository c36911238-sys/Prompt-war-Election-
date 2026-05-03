/**
 * Typed Firebase Analytics helpers.
 *
 * All logEvent calls go through this module so that:
 *  - Event names and parameter shapes are consistent across the app.
 *  - Analytics initialisation is handled once (with SSR safety).
 *  - Every tracker is trivially mockable in Jest (mock this module).
 */

import { logEvent } from 'firebase/analytics';
import { getFirebaseAnalytics } from './firebase';

/**
 * Lazily resolved analytics instance.
 * A Promise is stored so concurrent callers share one resolution,
 * preventing multiple simultaneous getFirebaseAnalytics() calls.
 */
let analyticsPromise = null;

function getAnalyticsInstance() {
  if (!analyticsPromise) {
    analyticsPromise = getFirebaseAnalytics();
  }
  return analyticsPromise;
}

/**
 * Internal helper — resolves analytics and calls logEvent.
 * Silent no-op when analytics is unavailable (SSR / unsupported browser).
 *
 * @param {string} eventName
 * @param {Record<string, unknown>} [eventParams]
 * @returns {Promise<void>}
 */
async function track(eventName, eventParams = {}) {
  const analyticsInstance = await getAnalyticsInstance();
  if (!analyticsInstance) return;
  try {
    logEvent(analyticsInstance, eventName, eventParams);
  } catch {
    // Analytics is non-critical — never interrupt UX
  }
}

// ---------------------------------------------------------------------------
// Public trackers
// ---------------------------------------------------------------------------

/**
 * Track a page view.
 * @param {string} pagePath - e.g. '/'
 * @returns {Promise<void>}
 */
export function trackPageView(pagePath) {
  return track('page_view', { page_path: pagePath });
}

/**
 * Track a chat message being sent.
 * @param {string}  languageCode    - Selected language code
 * @param {boolean} isAuthenticated - Whether the user was authenticated
 * @returns {Promise<void>}
 */
export function trackChatSent(languageCode, isAuthenticated) {
  return track('chat_message_sent', { language: languageCode, authenticated: isAuthenticated });
}

/**
 * Track a language selector change.
 * @param {string} fromLanguage - Previous language code
 * @param {string} toLanguage   - New language code
 * @returns {Promise<void>}
 */
export function trackLanguageChange(fromLanguage, toLanguage) {
  return track('language_changed', { from: fromLanguage, to: toLanguage });
}

/**
 * Track a TTS playback.
 * @param {string} languageCode - Language code of the audio being played
 * @returns {Promise<void>}
 */
export function trackTTSPlayback(languageCode) {
  return track('tts_played', { language: languageCode });
}

/**
 * Track a timeline phase selection.
 * @param {number} phaseId    - Numeric phase identifier
 * @param {string} phaseTitle - Human-readable phase title
 * @returns {Promise<void>}
 */
export function trackTimelinePhase(phaseId, phaseTitle) {
  return track('timeline_phase_selected', { phase_id: phaseId, phase_title: phaseTitle });
}
