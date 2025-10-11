const chai = require('chai');
const chaiHttp = require('chai-http');
const { Pool } = require('pg');

// Configure Chai
chai.use(chaiHttp);
global.expect = chai.expect;
global.should = chai.should();

// Test database configuration
const testDbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'portalvj_db',
  password: process.env.DB_PASSWORD || 'admin123.',
  port: process.env.DB_PORT || 5432,
};

global.testDb = new Pool(testDbConfig);

// Global test utilities
global.createTestUser = async (userData = {}) => {
  const defaultUser = {
    nombre: 'Test',
    apellido: 'User',
    email: `test${Date.now()}@test.com`,
    telefono: `1234567${Math.floor(Math.random() * 1000)}`,
    password: '$2b$10$hashedPassword',
    rol: 2, // Assuming role 2 exists
    activo: true
  };

  const user = { ...defaultUser, ...userData };

  // Determine which table to use based on role
  let tableName = 'SuperUsuarios'; // Default
  if (user.rol === 3) tableName = 'Maestros';
  else if (user.rol === 4) tableName = 'Padres';
  else if (user.rol === 5) tableName = 'Directores';

  const query = `
    INSERT INTO ${tableName} (nombre, apellido, email, telefono, password, rol, activo)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const result = await global.testDb.query(query, [
    user.nombre, user.apellido, user.email, user.telefono, user.password, user.rol, user.activo
  ]);

  return result.rows[0];
};

global.cleanupTestData = async () => {
  try {
    // Clean up test data in reverse order of dependencies
    await global.testDb.query('DELETE FROM Mensajes WHERE id > 0');
    await global.testDb.query('DELETE FROM Pagos WHERE id > 0');
    await global.testDb.query('DELETE FROM Calificaciones WHERE id > 0');
    await global.testDb.query('DELETE FROM Asistencias WHERE id > 0');
    await global.testDb.query('DELETE FROM Inscripciones WHERE id > 0');
    await global.testDb.query('DELETE FROM Cursos WHERE id > 0');
    await global.testDb.query('DELETE FROM Maestros WHERE email LIKE \'%test%\'');
    await global.testDb.query('DELETE FROM Padres WHERE email LIKE \'%test%\'');
    await global.testDb.query('DELETE FROM SuperUsuarios WHERE email LIKE \'%test%\'');
    await global.testDb.query('DELETE FROM Directores WHERE email LIKE \'%test%\'');
  } catch (error) {
    console.warn('Cleanup warning:', error.message);
  }
};

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-mocha';

// Suppress console output during tests unless specified
if (!process.env.VERBOSE_TESTS) {
  console.log = () => {};
  console.warn = () => {};
}

// Global hooks
before(async function() {
  this.timeout(15000);
  console.log('Setting up integration test environment...');

  // Test database connection
  try {
    await global.testDb.query('SELECT NOW()');
    console.log('✓ Database connection established');
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    throw error;
  }
});

after(async function() {
  console.log('Cleaning up integration test environment...');
  await global.cleanupTestData();
  await global.testDb.end();
});

beforeEach(async function() {
  // Clean up before each test to ensure isolation
  await global.cleanupTestData();
});
