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

  const remoteConfig = getFirebaseRemoteConfig();
  if (!remoteConfig) return false;

  try {
    const didUpdate  = await fetchAndActivate(remoteConfig);
    configActivated  = true;
    return didUpdate;
  } catch (remoteConfigError) {
    console.warn('[RemoteConfig] fetchAndActivate failed:', remoteConfigError.message);
    return false;
  }
}

/**
 * Fetches election phases from Firebase Remote Config.
 * Returns null on failure — callers must fall back to
 * the ELECTION_PHASES constant.
 *
 * @returns {Array|null} Election phase objects, or null when unavailable
 */
export function getElectionPhases() {
  const remoteConfig = getFirebaseRemoteConfig();

  if (!remoteConfig || !configActivated) return ELECTION_PHASES;

  try {
    const rawConfigValue = getString(remoteConfig, 'election_phases');
    const parsedPhases   = rawConfigValue ? JSON.parse(rawConfigValue) : null;

    if (Array.isArray(parsedPhases) && parsedPhases.length > 0) return parsedPhases;
  } catch {
    // Malformed JSON — fall back to static data.
  }

  return ELECTION_PHASES;
}
