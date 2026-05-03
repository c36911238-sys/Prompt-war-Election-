/**
 * Firebase Remote Config integration.
 *
 * Allows election phase data to be updated from the Firebase Console
 * without redeploying the application.
 *
 * Expected Remote Config key:
 *   election_phases — JSON array matching the ElectionPhase shape in lib/constants.js
 */

import { fetchAndActivate, getString } from 'firebase/remote-config';
import { getFirebaseRemoteConfig } from './firebase';
import { ELECTION_PHASES } from './constants';

let configActivated = false;

/**
 * Fetch and activate the latest Remote Config values.
 * Idempotent — subsequent calls return immediately once activated.
 *
 * @returns {Promise<boolean>} true if new config was fetched and activated
 */
export async function bootstrapRemoteConfig() {
  if (configActivated) return false;

  const rc = getFirebaseRemoteConfig();
  if (!rc) return false;

  try {
    const didUpdate = await fetchAndActivate(rc);
    configActivated = true;
    return didUpdate;
  } catch (err) {
    console.warn('[RemoteConfig] fetchAndActivate failed:', err.message);
    return false;
  }
}

/**
 * Return election phases from Remote Config when available,
 * falling back to the static constant otherwise.
 *
 * @returns {import('./constants').ElectionPhase[]} Election phase objects
 */
export function getElectionPhases() {
  const rc = getFirebaseRemoteConfig();

  if (!rc || !configActivated) return ELECTION_PHASES;

  try {
    const raw    = getString(rc, 'election_phases');
    const parsed = raw ? JSON.parse(raw) : null;

    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // Malformed JSON — fall back to static data.
  }

  return ELECTION_PHASES;
}
