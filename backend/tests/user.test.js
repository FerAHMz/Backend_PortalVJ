const request = require('supertest');
const app = require('../app');
const db = require('../database_cn');

// Mock the database connection
jest.mock('../database_cn', () => ({
  getPool: jest.fn(() => ({
    connect: jest.fn(),
    query: jest.fn()
  }))
}));

describe('User Controller Tests', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    db.getPool.mockReturnValue({
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn()
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test Case 1: GET All Users - Success Scenario
  describe('GET /api/users', () => {
    test('should return all users with proper role ordering', async () => {
      // Arrange
      const mockUsers = [
        { id: 1, nombre: 'Admin', apellido: 'User', email: 'admin@test.com', telefono: '1234567890', rol: 'SUP', rol_order: 1, activo: true },
        { id: 2, nombre: 'Director', apellido: 'Test', email: 'director@test.com', telefono: '0987654321', rol: 'Director', rol_order: 2, activo: true },
        { id: 3, nombre: 'Teacher', apellido: 'Test', email: 'teacher@test.com', telefono: '1122334455', rol: 'Maestro', rol_order: 4, activo: true }
      ];

      mockClient.query.mockResolvedValueOnce({ rows: mockUsers });

      // Act
      const response = await request(app)
        .get('/api/users')
        .expect(200);

      // Assert
      expect(response.body).toHaveLength(3);
      expect(response.body[0].rol).toBe('SUP');
      expect(response.body[1].rol).toBe('Director');
      expect(response.body[2].rol).toBe('Maestro');
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    test('should handle database connection errors', async () => {
      // Arrange
      db.getPool().connect.mockRejectedValueOnce(new Error('Database connection failed'));

      // Act
      const response = await request(app)
        .get('/api/users')
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('error', 'Error interno del servidor');
    });
  });

  // Test Case 2: POST Create User - Validation and Success
  describe('POST /api/users', () => {
    test('should create a new user successfully', async () => {
      // Arrange
      const newUser = {
        nombre: 'John',
        apellido: 'Doe',
        email: 'john.doe@test.com',
        telefono: '1234567890',
        password: 'securePassword123',
        rol: 'Maestro'
      };

      // Mock successful user creation queries
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // Email check - no duplicates
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert user

      // Act
      const response = await request(app)
        .post('/api/users')
        .send(newUser)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('message', 'Usuario creado exitosamente');
      expect(response.body).toHaveProperty('userId', 1);
      expect(mockClient.query).toHaveBeenCalledTimes(2);
    });

    test('should return 400 error for missing required fields', async () => {
      // Arrange
      const incompleteUser = {
        nombre: 'John',
        apellido: 'Doe'
        // Missing email, telefono, password, rol
      };

      // Act
      const response = await request(app)
        .post('/api/users')
        .send(incompleteUser)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('error', 'Todos los campos son requeridos');
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    test('should return 400 error for duplicate email', async () => {
      // Arrange
      const duplicateUser = {
        nombre: 'Jane',
        apellido: 'Smith',
        email: 'existing@test.com',
        telefono: '9876543210',
        password: 'password123',
        rol: 'Padre'
      };

      // Mock email already exists
      mockClient.query.mockResolvedValueOnce({ rows: [{ email: 'existing@test.com' }] });

      // Act
      const response = await request(app)
        .post('/api/users')
        .send(duplicateUser)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('error', 'El email ya está registrado');
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });
  });

  // Test Case 3: DELETE User - Authorization and Success
  describe('DELETE /api/users/:id', () => {
    test('should delete user successfully', async () => {
      // Arrange
      const userId = 5;

      // Mock user exists and successful deletion
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: userId, nombre: 'Test User' }] }) // User exists check
        .mockResolvedValueOnce({ rowCount: 1 }); // Successful deletion

      // Act
      const response = await request(app)
        .delete(`/api/users/${userId}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('message', 'Usuario eliminado exitosamente');
      expect(mockClient.query).toHaveBeenCalledTimes(2);
    });

    test('should return 404 for non-existent user', async () => {
      // Arrange
      const nonExistentUserId = 999;

      // Mock user not found
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      // Act
      const response = await request(app)
        .delete(`/api/users/${nonExistentUserId}`)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('error', 'Usuario no encontrado');
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });

    test('should handle database errors during deletion', async () => {
      // Arrange
      const userId = 3;

      // Mock database error
      mockClient.query.mockRejectedValueOnce(new Error('Database deletion failed'));

      // Act
      const response = await request(app)
        .delete(`/api/users/${userId}`)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('error', 'Error interno del servidor');
    });
  });
});
