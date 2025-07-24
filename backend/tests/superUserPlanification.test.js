const request = require('supertest');
const express = require('express');
const superUserPlanificationRoutes = require('../routes/superUserPlanificationRoutes');
const { verifyToken, isSup } = require('../middlewares/authMiddleware');
const db = require('../database_cn');

// Mock the database
jest.mock('../database_cn');

// Mock the middlewares
jest.mock('../middlewares/authMiddleware', () => ({
  verifyToken: jest.fn((req, res, next) => {
    req.user = { id: 1, rol: 'SUP', role: 'SUP' };
    next();
  }),
  isSup: jest.fn((req, res, next) => next())
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/api/superuser/planifications', superUserPlanificationRoutes);

describe('SuperUser Planifications API Tests', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    db.getPool = jest.fn().mockReturnValue({
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn()
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/superuser/planifications/by-grade', () => {
    it('should fetch all planifications grouped by grade successfully', async () => {
      const mockPlanifications = [
        {
          grado_id: 1,
          grado_nombre: '1er Grado',
          planificacion_id: 1,
          mes: 'enero',
          ciclo_escolar: '2024',
          estado: 'aceptada',
          curso_id: 1,
          materia_nombre: 'Matemáticas',
          maestro_nombre: 'Juan',
          maestro_apellido: 'Pérez',
          maestro_id: 1,
          total_tareas: '5',
          total_puntos: '50.0'
        },
        {
          grado_id: 1,
          grado_nombre: '1er Grado',
          planificacion_id: 2,
          mes: 'febrero',
          ciclo_escolar: '2024',
          estado: 'en revision',
          curso_id: 2,
          materia_nombre: 'Español',
          maestro_nombre: 'María',
          maestro_apellido: 'García',
          maestro_id: 2,
          total_tareas: '3',
          total_puntos: '30.0'
        }
      ];

      mockClient.query.mockResolvedValue({ rows: mockPlanifications });

      const response = await request(app)
        .get('/api/superuser/planifications/by-grade')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1); // One grade group
      expect(response.body.data[0].grado_nombre).toBe('1er Grado');
      expect(response.body.data[0].planificaciones).toHaveLength(2);
      expect(response.body.total_grados).toBe(1);
      expect(response.body.total_planificaciones).toBe(2);
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/superuser/planifications/by-grade')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Error al obtener las planificaciones por grado');
    });
  });

  describe('GET /api/superuser/planifications/statistics', () => {
    it('should fetch planifications statistics successfully', async () => {
      const mockGeneralStats = [
        {
          total_planificaciones: '10',
          en_revision: '3',
          aceptadas: '5',
          rechazadas: '2',
          total_grados_con_planificaciones: '3',
          total_maestros_con_planificaciones: '8',
          ciclo_escolar: '2024'
        }
      ];

      const mockGradeStats = [
        {
          grado_nombre: '1er Grado',
          total_planificaciones: '4',
          en_revision: '1',
          aceptadas: '2',
          rechazadas: '1'
        },
        {
          grado_nombre: '2do Grado',
          total_planificaciones: '3',
          en_revision: '1',
          aceptadas: '2',
          rechazadas: '0'
        }
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: mockGeneralStats })
        .mockResolvedValueOnce({ rows: mockGradeStats });

      const response = await request(app)
        .get('/api/superuser/planifications/statistics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.general_statistics).toEqual(mockGeneralStats);
      expect(response.body.data.grade_statistics).toEqual(mockGradeStats);
    });
  });

  describe('GET /api/superuser/planifications/grade/:gradeId', () => {
    it('should fetch planifications by specific grade successfully', async () => {
      const mockPlanifications = [
        {
          planificacion_id: 1,
          mes: 'enero',
          ciclo_escolar: '2024',
          estado: 'aceptada',
          curso_id: 1,
          materia_nombre: 'Matemáticas',
          maestro_nombre: 'Juan',
          maestro_apellido: 'Pérez',
          maestro_id: 1,
          grado_nombre: '1er Grado',
          total_tareas: '5',
          total_puntos: '50.0'
        }
      ];

      mockClient.query.mockResolvedValue({ rows: mockPlanifications });

      const response = await request(app)
        .get('/api/superuser/planifications/grade/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.grado_nombre).toBe('1er Grado');
      expect(response.body.data.planificaciones).toHaveLength(1);
      expect(response.body.data.total_planificaciones).toBe(1);
    });

    it('should return 404 when no planifications found for grade', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/superuser/planifications/grade/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No se encontraron planificaciones para este grado');
    });
  });

  describe('GET /api/superuser/planifications/:planificationId/detail', () => {
    it('should fetch detailed planification successfully', async () => {
      const mockPlanification = {
        planificacion_id: 1,
        mes: 'enero',
        ciclo_escolar: '2024',
        estado: 'aceptada',
        curso_id: 1,
        materia_nombre: 'Matemáticas',
        maestro_nombre: 'Juan',
        maestro_apellido: 'Pérez',
        maestro_id: 1,
        grado_nombre: '1er Grado',
        grado_id: 1
      };

      const mockTasks = [
        {
          id: 1,
          tema_tarea: 'Suma y resta',
          puntos_tarea: '10.0'
        },
        {
          id: 2,
          tema_tarea: 'Multiplicación',
          puntos_tarea: '15.0'
        }
      ];

      const mockReviews = [
        {
          id: 1,
          observaciones: 'Excelente planificación',
          fecha: new Date('2024-01-15'),
          director_nombre: 'Carlos',
          director_apellido: 'López'
        }
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockPlanification] })
        .mockResolvedValueOnce({ rows: mockTasks })
        .mockResolvedValueOnce({ rows: mockReviews });

      const response = await request(app)
        .get('/api/superuser/planifications/1/detail')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.planificacion_id).toBe(1);
      expect(response.body.data.tareas).toHaveLength(2);
      expect(response.body.data.revisiones).toHaveLength(1);
      expect(response.body.data.estadisticas.total_tareas).toBe(2);
      expect(response.body.data.estadisticas.total_puntos).toBe(25);
    });

    it('should return 404 when planification not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/superuser/planifications/999/detail')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Planificación no encontrada');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication', () => {
      expect(verifyToken).toHaveBeenCalled();
    });

    it('should require superuser role', () => {
      expect(isSup).toHaveBeenCalled();
    });
  });
});
