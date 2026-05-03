const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'app/**/*.{js,jsx}',
    'components/**/*.{js,jsx}',
    'lib/**/*.{js,jsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/*.config.{js,mjs}',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // Module name mapping for absolute imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  
  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.(test|spec).{js,jsx}',
    '**/*.(test|spec).{js,jsx}',
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  
  // Setup files
  setupFiles: ['<rootDir>/jest.polyfills.js'],
  
  // Test environment options
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
  
  // Verbose output for better debugging
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
