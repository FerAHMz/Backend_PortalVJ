module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/uploads/',
    'jest.config.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000,
  maxWorkers: 1 // Para evitar conflictos con la base de datos
};
