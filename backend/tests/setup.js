// Test setup file to configure global test environment
// This file runs before all tests

// Mock the authentication middleware for all tests
jest.mock('../middlewares/authMiddleware', () => ({
  verifyToken: (req, res, next) => {
    // Mock user data for testing
    req.user = {
      id: 1,
      email: 'test@example.com',
      rol: 'SUP',
      nombre: 'Test User'
    };
    next();
  },
  isAdmin: (req, res, next) => {
    next();
  },
  isSup: (req, res, next) => {
    next();
  },
  isTeacher: (req, res, next) => {
    next();
  },
  isParent: (req, res, next) => {
    next();
  }
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';

// Global test configuration
global.console = {
  ...console,
  // Suppress console.log in tests unless needed
  log: jest.fn(),
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};
