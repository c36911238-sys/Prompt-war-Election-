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

/**
 * Application limits and thresholds
 * Centralizes all numeric limits to prevent magic numbers
 * @type {ReadonlyObject}
 */
export const LIMITS = Object.freeze({
  // Text and message limits
  CHAT_MESSAGE_MAX: 1000,
  TTS_TEXT_MAX: 1000,
  
  // Cache configuration
  CACHE_SIZE_MAX: 100,
  CACHE_TTL_MS: 5 * 60 * 1000,
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX_CHAT: 10,
  RATE_LIMIT_MAX_TTS: 20,
  
  // Timeouts
  VERTEX_AI_TIMEOUT_MS: 25 * 1000, // 25 seconds
  TTS_TIMEOUT_MS: 10 * 1000, // 10 seconds
  TRANSLATE_TIMEOUT_MS: 15 * 1000, // 15 seconds
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_BASE_DELAY_MS: 1000, // 1 second base delay for exponential backoff
  
  // Security
  NONCE_BYTES: 16,
  REQUEST_ID_LENGTH: 36, // UUID length
  
  // UI Configuration
  FALLBACK_DELAY_MS: 800,
  ANIMATION_DURATION_MS: 300,
});

/**
 * HTTP status codes used throughout the application
 * @type {ReadonlyObject}
 */
export const HTTP_STATUS = Object.freeze({
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
});

/**
 * Error message templates for consistent error handling
 * @type {ReadonlyObject}
 */
export const ERROR_MESSAGES = Object.freeze({
  VALIDATION: {
    REQUIRED_FIELD: (field) => `${field} is required`,
    INVALID_FORMAT: (field) => `Invalid ${field} format`,
    TOO_LONG: (field, max) => `${field} too long. Maximum ${max} characters allowed`,
    TOO_SHORT: (field, min) => `${field} too short. Minimum ${min} characters required`,
  },
  RATE_LIMIT: {
    EXCEEDED: 'Too many requests. Please wait before trying again',
    TTS_EXCEEDED: 'Too many TTS requests. Please wait before trying again',
  },
  SERVICE: {
    UNAVAILABLE: (service) => `${service} service is temporarily unavailable. Please try again`,
    TIMEOUT: (service) => `${service} request timeout. Please try again`,
    CONFIGURATION_ERROR: (service) => `${service} service not configured properly`,
  },
  SECURITY: {
    CSRF_TOKEN_MISSING: 'CSRF token missing',
    INVALID_REQUEST: 'Invalid request',
    UNAUTHORIZED_ACCESS: 'Unauthorized access',
  },
});
