const request = require('supertest');

// Mock paymentControllers before importing app
jest.mock('../controllers/paymentControllers', () => ({
  upload: jest.fn((req, res, callback) => callback()),
  uploadPayments: jest.fn()
}));

// Mock paymentController before importing app
jest.mock('../controllers/paymentController', () => ({
  createPayment: jest.fn(),
  getPayments: jest.fn()
}));

const app = require('../app');
const db = require('../database_cn');

// Mock del pool de base de datos
jest.mock('../database_cn');

// Mock del middleware de autenticación
jest.mock('../middlewares/authMiddleware', () => ({
  verifyToken: jest.fn((req, res, next) => {
    req.user = { id: 1, rol: 'SUP' };
    next();
  }),
  isAdmin: jest.fn((req, res, next) => next()),
  isSup: jest.fn((req, res, next) => next())
}));

describe('Family Controller', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    db.getPool.mockReturnValue({
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(mockClient)
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/superuser/families', () => {
    it('should fetch all families successfully', async () => {
      const mockFamilies = [
        {
          id: 1,
          id_padre: 1,
          carnet_estudiante: 123456,
          padre_nombre: 'Juan',
          padre_apellido: 'Pérez',
          padre_email: 'juan@email.com',
          padre_telefono: '12345678',
          estudiante_nombre: 'Ana',
          estudiante_apellido: 'Pérez',
          estudiante_grado: '1er Grado'
        }
      ];

      db.getPool().query.mockResolvedValue({ rows: mockFamilies });

      const response = await request(app)
        .get('/api/superuser/families')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        id: 1,
        padre_nombre: 'Juan',
        estudiante_nombre: 'Ana'
      });
    });

    it('should handle database errors', async () => {
      db.getPool().query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/superuser/families')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Error al obtener las familias');
    });
  });

  describe('GET /api/superuser/families/parents/available', () => {
    it('should fetch available parents successfully', async () => {
      const mockParents = [
        {
          id: 1,
          nombre: 'Juan',
          apellido: 'Pérez',
          email: 'juan@email.com',
          telefono: '12345678'
        }
      ];

      db.getPool().query.mockResolvedValue({ rows: mockParents });

      const response = await request(app)
        .get('/api/superuser/families/parents/available')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].nombre).toBe('Juan');
    });
  });

  describe('GET /api/superuser/families/students/available', () => {
    it('should fetch available students successfully', async () => {
      const mockStudents = [
        {
          carnet: 123456,
          nombre: 'María',
          apellido: 'González',
          grado: '2do Grado'
        }
      ];

      db.getPool().query.mockResolvedValue({ rows: mockStudents });

      const response = await request(app)
        .get('/api/superuser/families/students/available')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].carnet).toBe(123456);
    });
  });

  describe('POST /api/superuser/families', () => {
    it('should create family relationship successfully', async () => {
      const familyData = {
        id_padre: 1,
        carnet_estudiante: 123456
      };

      // Mock para verificar padre existe
      db.getPool().query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Parent check
        .mockResolvedValueOnce({ rows: [{ carnet: 123456 }] }) // Student check
        .mockResolvedValueOnce({ rows: [] }) // Existing family check
        .mockResolvedValueOnce({ rows: [{ id: 1, ...familyData }] }); // Create family

      const response = await request(app)
        .post('/api/superuser/families')
        .send(familyData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Relación familiar creada exitosamente');
      expect(response.body.data).toMatchObject(familyData);
    });

    it('should return 404 when parent not found', async () => {
      const familyData = {
        id_padre: 999,
        carnet_estudiante: 123456
      };

      db.getPool().query.mockResolvedValueOnce({ rows: [] }); // Parent not found

      const response = await request(app)
        .post('/api/superuser/families')
        .send(familyData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Padre no encontrado o inactivo');
    });

    it('should return 404 when student not found', async () => {
      const familyData = {
        id_padre: 1,
        carnet_estudiante: 999999
      };

      db.getPool().query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Parent exists
        .mockResolvedValueOnce({ rows: [] }); // Student not found

      const response = await request(app)
        .post('/api/superuser/families')
        .send(familyData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Estudiante no encontrado');
    });

    it('should return 400 when student already has a parent', async () => {
      const familyData = {
        id_padre: 1,
        carnet_estudiante: 123456
      };

      db.getPool().query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Parent exists
        .mockResolvedValueOnce({ rows: [{ carnet: 123456 }] }) // Student exists
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Student already has parent

      const response = await request(app)
        .post('/api/superuser/families')
        .send(familyData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('El estudiante ya tiene un padre asignado');
    });
  });

  describe('DELETE /api/superuser/families/:id', () => {
    it('should delete family relationship successfully', async () => {
      db.getPool().query.mockResolvedValue({
        rows: [{ id: 1, id_padre: 1, carnet_estudiante: 123456 }]
      });

      const response = await request(app)
        .delete('/api/superuser/families/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Relación familiar eliminada exitosamente');
    });

    it('should return 404 when family relationship not found', async () => {
      db.getPool().query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .delete('/api/superuser/families/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Relación familiar no encontrada');
    });
  });

  describe('PUT /api/superuser/families/:id', () => {
    it('should update family relationship successfully', async () => {
      const updateData = { id_padre: 2 };

      db.getPool().query
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // New parent exists
        .mockResolvedValueOnce({ rows: [{ id: 1, id_padre: 2, carnet_estudiante: 123456 }] }); // Update successful

      const response = await request(app)
        .put('/api/superuser/families/1')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Relación familiar actualizada exitosamente');
      expect(response.body.data.id_padre).toBe(2);
    });

    it('should return 404 when new parent not found', async () => {
      const updateData = { id_padre: 999 };

      db.getPool().query.mockResolvedValueOnce({ rows: [] }); // Parent not found

      const response = await request(app)
        .put('/api/superuser/families/1')
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Padre no encontrado o inactivo');
    });
  });

  describe('GET /api/superuser/families/statistics', () => {
    it('should fetch family statistics successfully', async () => {
      const mockStats = {
        total_padres_con_hijos: '5',
        total_estudiantes_asignados: '8',
        total_padres_activos: '10',
        total_estudiantes: '15'
      };

      const mockStudentsWithoutParent = {
        estudiantes_sin_padre: '7'
      };

      db.getPool().query
        .mockResolvedValueOnce({ rows: [mockStats] })
        .mockResolvedValueOnce({ rows: [mockStudentsWithoutParent] });

      const response = await request(app)
        .get('/api/superuser/families/statistics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        total_padres_con_hijos: '5',
        total_estudiantes_asignados: '8',
        estudiantes_sin_padre: '7'
      });
    });
  });

  describe('GET /api/superuser/families/parent/:parentId/students', () => {
    it('should fetch students by parent successfully', async () => {
      const mockStudents = [
        {
          carnet: 123456,
          nombre: 'Ana',
          apellido: 'Pérez',
          grado: '1er Grado',
          familia_id: 1
        }
      ];

      db.getPool().query.mockResolvedValue({ rows: mockStudents });

      const response = await request(app)
        .get('/api/superuser/families/parent/1/students')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].nombre).toBe('Ana');
    });
  });
});
