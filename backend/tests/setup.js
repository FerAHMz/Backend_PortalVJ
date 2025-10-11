// Test setup file to configure global test environment
// This file runs before all tests

// Mock the authentication middleware for all tests
jest.mock('../middlewares/authMiddleware', () => ({
  verifyToken: (req, res, next) => {
    // Mock user data for testing
    req.user = {
      id: 1,
      email: 'test@example.com',
      rol: 'Maestro', // Changed to a valid role for message tests
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
  },
  isDirector: (req, res, next) => {
    next();
  }
}));

// Create mock objects
const mockClient = {
  query: jest.fn().mockResolvedValue({ rows: [] }),
  release: jest.fn()
};

const mockPool = {
  connect: jest.fn().mockResolvedValue(mockClient),
  query: jest.fn().mockResolvedValue({ rows: [] })
};

// Mock the database connection for all tests
jest.mock('../database_cn', () => ({
  getPool: jest.fn(() => mockPool),
  query: jest.fn().mockResolvedValue({ rows: [] }),
  end: jest.fn().mockResolvedValue(undefined)
}));

// Reset mocks before each test
beforeEach(() => {
  mockClient.query.mockClear();
  mockClient.release.mockClear();
  mockPool.connect.mockClear();
  mockPool.query.mockClear();
  
  // Reset to default behavior
  mockClient.query.mockResolvedValue({ rows: [] });
  mockPool.query.mockResolvedValue({ rows: [] });
});

// Export mock functions for use in tests
global.mockClient = mockClient;
global.mockPool = mockPool;

// Mock bcrypt to avoid Windows compatibility issues
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true)
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

// Mock global functions for integration tests
global.createTestUser = jest.fn().mockImplementation(async (userData = {}) => {
  const defaultUser = {
    id: Math.floor(Math.random() * 10000),
    nombre: 'Test',
    apellido: 'User',
    email: `test${Date.now()}@test.com`,
    telefono: `1234567${Math.floor(Math.random() * 1000)}`,
    password: '$2b$10$hashedPassword',
    rol: userData.rol || 1,
    activo: true
  };
  return { ...defaultUser, ...userData };
});

global.testDb = {
  query: jest.fn().mockResolvedValue({ rows: [] }),
  end: jest.fn().mockResolvedValue(undefined)
};

global.cleanupTestData = jest.fn().mockResolvedValue(undefined);
