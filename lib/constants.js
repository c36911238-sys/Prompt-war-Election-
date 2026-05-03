/**
 * Application-wide constants.
 * Centralising data here keeps components lean and makes
 * content changes trivially easy.
 */

/**
 * Ordered election phases used as fallback when Firebase
 * Remote Config is unavailable.
 * Structure: { id: number, title: string, icon: string, description: string }
 * @type {ReadonlyArray<{id: number, title: string, icon: string, description: string}>}
 */
export const ELECTION_PHASES = Object.freeze([
  Object.freeze({
    id: 1,
    title: 'Voter Registration',
    icon: 'how_to_reg',
    description:
      'Ensure you are registered to vote before the deadline. Check your eligibility and register online or in person.',
  }),
  Object.freeze({
    id: 2,
    title: 'Candidate Nomination',
    icon: 'person_add',
    description:
      'Candidates file their nomination papers, which are scrutinised. The final list of candidates is then published.',
  }),
  Object.freeze({
    id: 3,
    title: 'Campaigning',
    icon: 'campaign',
    description:
      'Candidates hold rallies, debates, and advertise to present their manifestos to the public. Campaigning ends 48 hours before voting.',
  }),
  Object.freeze({
    id: 4,
    title: 'Voting Day',
    icon: 'how_to_vote',
    description:
      'Registered voters cast their ballots at designated polling stations. Remember to bring valid ID.',
  }),
  Object.freeze({
    id: 5,
    title: 'Counting & Results',
    icon: 'analytics',
    description:
      'Votes are counted securely and transparently. The candidate with the highest number of votes is declared the winner.',
  }),
]);

/**
 * Languages available in the chat assistant.
 * Structure: { code: string, label: string, ttsCode: string }
 * @type {ReadonlyArray<{code: string, label: string, ttsCode: string}>}
 */
export const SUPPORTED_LANGUAGES = Object.freeze([
  Object.freeze({ code: 'en', label: 'English', ttsCode: 'en-US' }),
  Object.freeze({ code: 'es', label: 'Español', ttsCode: 'es-ES' }),
  Object.freeze({ code: 'hi', label: 'हिंदी', ttsCode: 'hi-IN' }),
  Object.freeze({ code: 'fr', label: 'Français', ttsCode: 'fr-FR' }),
]);

/** Response cache TTL in milliseconds (5 minutes). */
export const CACHE_TTL_MS = 5 * 60 * 1000;
