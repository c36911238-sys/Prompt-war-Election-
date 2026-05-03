/**
 * Firebase Remote Config integration.
 *
 * Allows election phase data to be updated from the Firebase Console
 * without redeploying the application.
 *
 * Remote Config keys:
 *   election_phases — JSON string matching the ELECTION_PHASES shape in lib/constants.js
 */

import { fetchAndActivate, getString, getRemoteConfig } from 'firebase/remote-config';
import { getFirebaseRemoteConfig } from './firebase';
import { ELECTION_PHASES } from './constants';

let activated = false;

/**
 * Fetch and activate the latest Remote Config values.
 * Safe to call multiple times — subsequent calls are no-ops.
 *
 * @returns {Promise<boolean>} true if new config was fetched & activated
 */
export async function bootstrapRemoteConfig() {
  if (activated) return false;
  const rc = getFirebaseRemoteConfig();
  if (!rc) return false;

  try {
    const updated = await fetchAndActivate(rc);
    activated = true;
    return updated;
  } catch (err) {
    console.warn('[RemoteConfig] fetchAndActivate failed:', err.message);
    return false;
  }
}

/**
 * Return election phases from Remote Config if available,
 * otherwise fall back to the static constant.
 *
 * @returns {Array} election phase objects
 */
export function getElectionPhases() {
  try {
    const rc = getFirebaseRemoteConfig();
    if (!rc || !activated) return ELECTION_PHASES;

    const raw = getString(rc, 'election_phases');
    if (!raw) return ELECTION_PHASES;

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // Malformed JSON or RC not available — use static fallback.
  }
  return ELECTION_PHASES;
}
