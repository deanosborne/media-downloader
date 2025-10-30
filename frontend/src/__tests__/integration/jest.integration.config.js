const path = require('path');

module.exports = {
  displayName: 'Integration Tests',
  rootDir: path.resolve(__dirname, '../../..'), // Points to frontend root
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/integration/jest.integration.setup.ts'],
  testMatch: [
    '<rootDir>/src/__tests__/integration/**/*.test.{ts,tsx}'
  ],
  testTimeout: 30000, // Longer timeout for integration tests
  maxWorkers: 1, // Run integration tests sequentially to avoid conflicts
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'ts-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/index.tsx',
    '!src/reportWebVitals.ts'
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ]
};