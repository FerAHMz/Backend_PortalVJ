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

describe('Course Controller Tests', () => {
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

  // Test Case 1: GET All Courses - Success and Error Scenarios
  describe('GET /api/courses', () => {
    test('should return all courses with teacher and subject information', async () => {
      // Arrange
      const mockCourses = [
        {
          id: 1,
          materia: 'Matemáticas',
          grado: 'Primero',
          seccion: 'A',
          nombre_maestro: 'Carlos',
          apellido_maestro: 'González'
        },
        {
          id: 2,
          materia: 'Ciencias Naturales',
          grado: 'Segundo',
          seccion: 'B',
          nombre_maestro: 'María',
          apellido_maestro: 'Rodríguez'
        }
      ];

      mockClient.query.mockResolvedValueOnce({ rows: mockCourses });

      // Act
      const response = await request(app)
        .get('/api/courses')
        .expect(200);

      // Assert
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('materia', 'Matemáticas');
      expect(response.body[0]).toHaveProperty('nombre_maestro', 'Carlos');
      expect(response.body[1]).toHaveProperty('materia', 'Ciencias Naturales');
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    test('should handle database errors when fetching courses', async () => {
      // Arrange
      mockClient.query.mockRejectedValueOnce(new Error('Database query failed'));

      // Act
      const response = await request(app)
        .get('/api/courses')
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('error', 'Error al obtener los cursos');
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    test('should return empty array when no courses exist', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      // Act
      const response = await request(app)
        .get('/api/courses')
        .expect(200);

      // Assert
      expect(response.body).toHaveLength(0);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // Test Case 2: POST Create Course - Validation and Business Logic
  describe('POST /api/courses', () => {
    test('should create a new course successfully', async () => {
      // Arrange
      const newCourse = {
        id_maestro: 1,
        id_materia: 2,
        id_grado_seccion: 3
      };

      // Mock successful validation and creation
      mockClient.query
        .mockResolvedValueOnce({ command: 'BEGIN' }) // Transaction start
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Teacher exists
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // Subject exists
        .mockResolvedValueOnce({ rows: [{ id: 3 }] }) // Grade-section exists
        .mockResolvedValueOnce({ rows: [] }) // Course doesn't exist
        .mockResolvedValueOnce({ rows: [{ id: 100 }] }) // Course created
        .mockResolvedValueOnce({ command: 'COMMIT' }); // Transaction commit

      // Act
      const response = await request(app)
        .post('/api/courses')
        .send(newCourse)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('message', 'Curso creado exitosamente');
      expect(response.body).toHaveProperty('courseId', 100);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should return 400 error for missing required fields', async () => {
      // Arrange
      const incompleteCourse = {
        id_maestro: 1,
        id_materia: 2
        // Missing id_grado_seccion
      };

      // Act
      const response = await request(app)
        .post('/api/courses')
        .send(incompleteCourse)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('error', 'Todos los campos son requeridos');
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    test('should return 400 error when teacher does not exist', async () => {
      // Arrange
      const courseWithInvalidTeacher = {
        id_maestro: 999,
        id_materia: 2,
        id_grado_seccion: 3
      };

      mockClient.query
        .mockResolvedValueOnce({ command: 'BEGIN' })
        .mockResolvedValueOnce({ rows: [] }) // Teacher doesn't exist
        .mockResolvedValueOnce({ command: 'ROLLBACK' });

      // Act
      const response = await request(app)
        .post('/api/courses')
        .send(courseWithInvalidTeacher)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('error', 'El maestro no existe');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should return 400 error for duplicate course', async () => {
      // Arrange
      const duplicateCourse = {
        id_maestro: 1,
        id_materia: 2,
        id_grado_seccion: 3
      };

      mockClient.query
        .mockResolvedValueOnce({ command: 'BEGIN' })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Teacher exists
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // Subject exists
        .mockResolvedValueOnce({ rows: [{ id: 3 }] }) // Grade-section exists
        .mockResolvedValueOnce({ rows: [{ id: 50 }] }) // Course already exists
        .mockResolvedValueOnce({ command: 'ROLLBACK' });

      // Act
      const response = await request(app)
        .post('/api/courses')
        .send(duplicateCourse)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('error', 'El curso ya existe para este maestro, materia y grado-sección');
    });
  });

  // Test Case 3: PUT Update Course - Data Integrity and Authorization
  describe('PUT /api/courses/:id', () => {
    test('should update course successfully', async () => {
      // Arrange
      const courseId = 1;
      const updateData = {
        id_maestro: 2,
        id_materia: 3,
        id_grado_seccion: 4
      };

      mockClient.query
        .mockResolvedValueOnce({ command: 'BEGIN' })
        .mockResolvedValueOnce({ rows: [{ id: courseId }] }) // Course exists
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // New teacher exists
        .mockResolvedValueOnce({ rows: [{ id: 3 }] }) // New subject exists
        .mockResolvedValueOnce({ rows: [{ id: 4 }] }) // New grade-section exists
        .mockResolvedValueOnce({ rows: [] }) // No duplicate with new data
        .mockResolvedValueOnce({ rowCount: 1 }) // Update successful
        .mockResolvedValueOnce({ command: 'COMMIT' });

      // Act
      const response = await request(app)
        .put(`/api/courses/${courseId}`)
        .send(updateData)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('message', 'Curso actualizado exitosamente');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should return 404 for non-existent course', async () => {
      // Arrange
      const nonExistentCourseId = 999;
      const updateData = {
        id_maestro: 1,
        id_materia: 2,
        id_grado_seccion: 3
      };

      mockClient.query
        .mockResolvedValueOnce({ command: 'BEGIN' })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Teacher exists
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // Subject exists
        .mockResolvedValueOnce({ rows: [{ id: 3 }] }) // Grade section exists
        .mockResolvedValueOnce({ rows: [] }) // Course doesn't exist (UPDATE returns 0 rows)
        .mockResolvedValueOnce({ command: 'ROLLBACK' });

      // Act
      const response = await request(app)
        .put(`/api/courses/${nonExistentCourseId}`)
        .send(updateData)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('error', 'Curso no encontrado');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should handle transaction rollback on database error', async () => {
      // Arrange
      const courseId = 1;
      const updateData = {
        id_maestro: 1,
        id_materia: 2,
        id_grado_seccion: 3
      };

      mockClient.query
        .mockResolvedValueOnce({ command: 'BEGIN' })
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({ command: 'ROLLBACK' });

      // Act
      const response = await request(app)
        .put(`/api/courses/${courseId}`)
        .send(updateData)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('error', 'Error al actualizar el curso');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});
