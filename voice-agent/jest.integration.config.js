/**
 * Jest Configuration for Integration Tests
 * 
 * Specialized configuration for running integration tests with appropriate
 * timeouts, setup, and reporting for the Voice Agent system.
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/__tests__/integration/**/*.test.ts'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/integration/setup.ts'
  ],
  
  // TypeScript support
  preset: 'ts-jest',
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Test timeouts (integration tests need more time)
  testTimeout: 30000, // 30 seconds per test
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/services/**/*.ts',
    'src/components/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/__tests__/**/*'
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  // Thresholds for integration tests (more lenient than unit tests)
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-reports',
        outputName: 'integration-test-results.xml',
        suiteName: 'Voice Agent Integration Tests'
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: 'test-reports',
        filename: 'integration-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Voice Agent Integration Test Report'
      }
    ]
  ],
  
  // Global setup and teardown
  globalSetup: '<rootDir>/src/__tests__/integration/global-setup.ts',
  globalTeardown: '<rootDir>/src/__tests__/integration/global-teardown.ts',
  
  // Verbose output for integration tests
  verbose: true,
  
  // Don't clear mocks between tests (integration tests may need persistent state)
  clearMocks: false,
  restoreMocks: false,
  
  // Transform configuration
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-voice|react-native-tts)/)'
  ],
  
  // Mock configuration for React Native
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native$': 'react-native-web',
    '^react-native-voice$': '<rootDir>/src/__tests__/__mocks__/react-native-voice.ts',
    '^react-native-tts$': '<rootDir>/src/__tests__/__mocks__/react-native-tts.ts'
  },
  
  // Setup for React Native environment
  setupFiles: [
    '<rootDir>/src/__tests__/setup/react-native-mock.ts'
  ],
  
  // Test result processor for custom reporting
  testResultsProcessor: '<rootDir>/src/__tests__/integration/test-results-processor.ts',
  
  // Maximum worker processes for integration tests
  maxWorkers: 2, // Limit concurrency for integration tests
  
  // Bail on first test failure (optional, for faster feedback)
  bail: false,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Detect open handles (useful for debugging)
  detectOpenHandles: true,
  
  // Cache configuration
  cache: false, // Disable cache for integration tests to ensure fresh runs
  
  // Watch mode configuration (for development)
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/test-reports/'
  ],
  
  // Custom test sequencer for integration tests
  testSequencer: '<rootDir>/src/__tests__/integration/test-sequencer.ts',
  
  // Environment variables for tests
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },
  
  // Globals available in tests
  globals: {
    'ts-jest': {
      tsconfig: {
        compilerOptions: {
          module: 'commonjs',
          target: 'es2018',
          lib: ['es2018', 'dom'],
          allowJs: true,
          skipLibCheck: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          forceConsistentCasingInFileNames: true,
          moduleResolution: 'node',
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx'
        }
      }
    },
    // Test configuration constants
    TEST_CONFIG: {
      MOCK_API_BASE_URL: 'https://mock-api.test.com',
      DEFAULT_TIMEOUT: 5000,
      VOICE_CONFIDENCE_THRESHOLD: 0.7,
      MAX_RETRY_ATTEMPTS: 3
    }
  }
};