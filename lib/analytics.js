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
 * @param {Record<string, unknown>} [params]
 */
async function track(eventName, params = {}) {
  const analytics = await getAnalyticsInstance();
  if (!analytics) return;
  logEvent(analytics, eventName, params);
}

// ---------------------------------------------------------------------------
// Public trackers
// ---------------------------------------------------------------------------

/**
 * Track a page view.
 * @param {string} pagePath - e.g. '/'
 */
export function trackPageView(pagePath) {
  return track('page_view', { page_path: pagePath });
}

/**
 * Track a chat message being sent.
 * @param {string}  language - Selected language code
 * @param {boolean} isAuth   - Whether the user was authenticated
 */
export function trackChatSent(language, isAuth) {
  return track('chat_message_sent', { language, authenticated: isAuth });
}

/**
 * Track a language selector change.
 * @param {string} fromLang
 * @param {string} toLang
 */
export function trackLanguageChange(fromLang, toLang) {
  return track('language_changed', { from: fromLang, to: toLang });
}

/**
 * Track a TTS playback.
 * @param {string} language
 */
export function trackTTSPlayback(language) {
  return track('tts_played', { language });
}

/**
 * Track a timeline phase selection.
 * @param {number} phaseId
 * @param {string} phaseTitle
 */
export function trackTimelinePhase(phaseId, phaseTitle) {
  return track('timeline_phase_selected', { phase_id: phaseId, phase_title: phaseTitle });
}
