/**
 * Typed Firebase Analytics wrapper.
 *
 * Centralising logEvent calls here means:
 *  - Event names and parameter shapes are consistent across the app.
 *  - Analytics is trivially mockable in Jest tests (just mock this module).
 *  - SSR safety is handled once, not in every component.
 */

import { logEvent } from 'firebase/analytics';
import { getFirebaseAnalytics } from './firebase';

/** Cache the analytics instance after first resolution. */
let analyticsInstance = null;

async function getAnalyticsInstance() {
  if (analyticsInstance) return analyticsInstance;
  analyticsInstance = await getFirebaseAnalytics();
  return analyticsInstance;
}

/**
 * Log a page view event.
 * Called from the root layout on mount.
 *
 * @param {string} pagePath - e.g. '/'
 */
export async function trackPageView(pagePath) {
  const analytics = await getAnalyticsInstance();
  if (!analytics) return;
  logEvent(analytics, 'page_view', { page_path: pagePath });
}

/**
 * Log a chat message sent event.
 *
 * @param {string} language  - Selected language code
 * @param {boolean} isAuth   - Whether the user was authenticated
 */
export async function trackChatSent(language, isAuth) {
  const analytics = await getAnalyticsInstance();
  if (!analytics) return;
  logEvent(analytics, 'chat_message_sent', {
    language,
    authenticated: isAuth,
  });
}

/**
 * Log a language change event.
 *
 * @param {string} fromLang
 * @param {string} toLang
 */
export async function trackLanguageChange(fromLang, toLang) {
  const analytics = await getAnalyticsInstance();
  if (!analytics) return;
  logEvent(analytics, 'language_changed', { from: fromLang, to: toLang });
}

/**
 * Log a TTS playback event.
 *
 * @param {string} language
 */
export async function trackTTSPlayback(language) {
  const analytics = await getAnalyticsInstance();
  if (!analytics) return;
  logEvent(analytics, 'tts_played', { language });
}

/**
 * Log a timeline phase selection.
 *
 * @param {number} phaseId
 * @param {string} phaseTitle
 */
export async function trackTimelinePhase(phaseId, phaseTitle) {
  const analytics = await getAnalyticsInstance();
  if (!analytics) return;
  logEvent(analytics, 'timeline_phase_selected', {
    phase_id: phaseId,
    phase_title: phaseTitle,
  });
}
