const request = require('supertest');
const app = require('../app');

describe('User Controller Tests', () => {
  // Use global mockClient from setup.js
  const mockClient = global.mockClient;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  // Test Case 1: GET All Users - Success Scenario
  describe('GET /api/users', () => {
    test('should return all users with proper role ordering', async () => {
      // Arrange
      const mockUsers = [
        { id: 1, nombre: 'Admin', apellido: 'User', email: 'admin@test.com', telefono: '12345678', rol: 'SUP', rol_order: 1, activo: true },
        { id: 2, nombre: 'Director', apellido: 'Test', email: 'director@test.com', telefono: '09876543', rol: 'Director', rol_order: 2, activo: true },
        { id: 3, nombre: 'Teacher', apellido: 'Test', email: 'teacher@test.com', telefono: '11223344', rol: 'Maestro', rol_order: 4, activo: true }
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
      global.mockPool.connect.mockRejectedValueOnce(new Error('Database connection failed'));

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
        telefono: '12345678',
        password: 'securePassword123',
        rol: 'Maestro'
      };

      // Mock successful user creation queries
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // Email check - no duplicates
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Role ID lookup
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            nombre: 'John',
            apellido: 'Doe',
            email: 'john.doe@test.com',
            telefono: '12345678',
            rol: 'Maestro',
            activo: true
          }]
        }); // Insert user

      // Act
      const response = await request(app)
        .post('/api/users')
        .send(newUser)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('message', 'Usuario creado exitosamente');
      expect(response.body).toHaveProperty('userId', 1);
      expect(mockClient.query).toHaveBeenCalledTimes(3);
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
        telefono: '98765432',
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

      // Mock successful deletion (UPDATE query returns 1 row affected)
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: userId }],
        rowCount: 1
      });

      // Act
      const response = await request(app)
        .delete(`/api/users/${userId}`)
        .send({ rol: 'Maestro' })
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('message', 'Usuario desactivado exitosamente');
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });

    test('should return 404 for non-existent user', async () => {
      // Arrange
      const nonExistentUserId = 999;

      // Mock user not found (UPDATE query affects 0 rows)
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      // Act
      const response = await request(app)
        .delete(`/api/users/${nonExistentUserId}`)
        .send({ rol: 'Maestro' })
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
        .send({ rol: 'Maestro' })
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('error', 'Error al desactivar usuario');
    });
  });
});
