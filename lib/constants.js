/**
 * Application-wide constants.
 * Centralising data here keeps components lean and makes
 * content changes trivially easy.
 */

/** Ordered election phases used by the Timeline component (fallback). */
export const ELECTION_PHASES = [
  {
    id: 1,
    title: 'Voter Registration',
    icon: 'how_to_reg',
    description:
      'Ensure you are registered to vote before the deadline. Check your eligibility and register online or in person.',
  },
  {
    id: 2,
    title: 'Candidate Nomination',
    icon: 'person_add',
    description:
      'Candidates file their nomination papers, which are scrutinised. The final list of candidates is then published.',
  },
  {
    id: 3,
    title: 'Campaigning',
    icon: 'campaign',
    description:
      'Candidates hold rallies, debates, and advertise to present their manifestos to the public. Campaigning ends 48 hours before voting.',
  },
  {
    id: 4,
    title: 'Voting Day',
    icon: 'how_to_vote',
    description:
      'Registered voters cast their ballots at designated polling stations. Remember to bring valid ID.',
  },
  {
    id: 5,
    title: 'Counting & Results',
    icon: 'analytics',
    description:
      'Votes are counted securely and transparently. The candidate with the highest number of votes is declared the winner.',
  },
];

/** Languages available in the chat assistant. */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', ttsCode: 'en-US' },
  { code: 'es', label: 'Español', ttsCode: 'es-ES' },
  { code: 'hi', label: 'हिंदी', ttsCode: 'hi-IN' },
  { code: 'fr', label: 'Français', ttsCode: 'fr-FR' },
];

/** Response cache TTL in milliseconds (5 minutes). */
export const CACHE_TTL_MS = 5 * 60 * 1000;
