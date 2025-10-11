const request = require('supertest');
const express = require('express');
const inscripcionController = require('../controllers/inscripcionController');
const db = require('../database_cn');

// Mock the database
const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

const mockPool = {
  query: jest.fn(),
  connect: jest.fn(() => Promise.resolve(mockClient))
};

jest.mock('../database_cn', () => ({
  query: jest.fn(),
  getPool: jest.fn(() => mockPool)
}));

// Mock middleware
const mockAuth = (req, res, next) => next();
const mockIsSup = (req, res, next) => next();

// Create test app with controller
const app = express();
app.use(express.json());

// Add mock routes
app.get('/api/superuser/grados-secciones', mockAuth, mockIsSup, inscripcionController.getGradosYSecciones);
app.post('/api/superuser/inscripciones', mockAuth, mockIsSup, inscripcionController.createInscripcion);
app.get('/api/superuser/inscripciones', mockAuth, mockIsSup, inscripcionController.getInscripciones);
app.get('/api/superuser/inscripciones/:id', mockAuth, mockIsSup, inscripcionController.getInscripcionById);
app.put('/api/superuser/inscripciones/:id', mockAuth, mockIsSup, inscripcionController.updateInscripcion);
app.delete('/api/superuser/inscripciones/:id', mockAuth, mockIsSup, inscripcionController.deleteInscripcion);

describe('Inscripciones Controller Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.query.mockClear();
    mockClient.release.mockClear();
  });

  describe('GET /api/superuser/grados-secciones', () => {
    it('debería obtener todos los grados y secciones disponibles', async () => {
      const mockGradosData = [
        {
          id_grado_seccion: 1,
          id_grado: 1,
          grado: '1er Grado',
          id_seccion: 1,
          seccion: 'A',
          display_name: '1er Grado - A',
          capacidad_maxima: 30,
          activo: true
        }
      ];

      const mockPoolQuery = jest.fn().mockResolvedValue({ rows: mockGradosData });
      db.getPool.mockReturnValue({ query: mockPoolQuery });

      const response = await request(app)
        .get('/api/superuser/grados-secciones')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toEqual(mockGradosData);
    });
  });

  describe('POST /api/superuser/inscripciones', () => {
    it('debería crear una nueva inscripción', async () => {
      const inscripcionData = {
        carnet: 'TEST999',
        nombre: 'Estudiante',
        apellido: 'De Prueba',
        fecha_nacimiento: '2010-01-01',
        id_grado_seccion: 1,
        sire: 'TEST001',
        correo_padres: 'padres.test@email.com'
      };

      // Mock transaction BEGIN
      mockClient.query.mockResolvedValueOnce({});
      // Mock grado-seccion exists check
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // Mock existing inscription check (no existing)
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Mock create inscription
      mockClient.query.mockResolvedValueOnce({ rows: [{ id_inscripcion: 1 }] });
      // Mock transaction COMMIT
      mockClient.query.mockResolvedValueOnce({});

      const response = await request(app)
        .post('/api/superuser/inscripciones')
        .send(inscripcionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Inscripción creada exitosamente');
      expect(response.body.data.id_inscripcion).toBe(1);
    });

    it('debería fallar al crear inscripción sin campos requeridos', async () => {
      const inscripcionData = {
        // Missing required fields
        nombre: 'Estudiante'
      };

      const response = await request(app)
        .post('/api/superuser/inscripciones')
        .send(inscripcionData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('requerido');
    });

    it('debería fallar al crear inscripción duplicada', async () => {
      const inscripcionData = {
        carnet: 'TEST999',
        nombre: 'Otro',
        apellido: 'Estudiante',
        fecha_nacimiento: '2010-01-01',
        id_grado_seccion: 1,
        sire: 'TEST002',
        correo_padres: 'test@email.com'
      };

      // Mock transaction BEGIN
      mockClient.query.mockResolvedValueOnce({});
      // Mock grado-seccion exists check
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // Mock duplicate check - simulate existing inscription
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{ 
          id_inscripcion: 1, 
          estado_inscripcion: 'inscrito' 
        }] 
      });

      const response = await request(app)
        .post('/api/superuser/inscripciones')
        .send(inscripcionData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Ya existe una inscripción activa');
    });
  });

  describe('GET /api/superuser/inscripciones', () => {
    it('debería obtener todas las inscripciones', async () => {
      const mockInscripciones = [
        {
          id_inscripcion: 1,
          carnet: 'TEST999',
          nombres: 'Estudiante',
          apellidos: 'De Prueba',
          grado_seccion_display: '1er Grado - A'
        }
      ];

      db.query.mockResolvedValue({ rows: mockInscripciones });

      const response = await request(app)
        .get('/api/superuser/inscripciones')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toEqual(mockInscripciones);
    });
  });

  describe('GET /api/superuser/inscripciones/:id', () => {
    it('debería obtener una inscripción por ID', async () => {
      const mockInscripcion = {
        id_inscripcion: 1,
        carnet: 'TEST999',
        nombres: 'Estudiante',
        apellidos: 'De Prueba'
      };

      db.query.mockResolvedValue({ rows: [mockInscripcion] });

      const response = await request(app)
        .get('/api/superuser/inscripciones/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id_inscripcion).toBe(1);
      expect(response.body.data.carnet).toBe('TEST999');
    });

    it('debería retornar 404 para ID inexistente', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/superuser/inscripciones/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Inscripción no encontrada');
    });
  });

  describe('PUT /api/superuser/inscripciones/:id', () => {
    it('debería actualizar una inscripción', async () => {
      const updateData = {
        correo_padres: 'nuevo.correo@email.com',
        sire: 'SIRE_ACTUALIZADO'
      };

      // Mock finding the inscription
      db.query.mockResolvedValueOnce({ rows: [{ id_inscripcion: 1 }] });
      // Mock update success
      db.query.mockResolvedValueOnce({ rows: [{ ...updateData, id_inscripcion: 1 }] });

      const response = await request(app)
        .put('/api/superuser/inscripciones/1')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Inscripción actualizada exitosamente');
    });

    it('debería retornar 404 para ID inexistente', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put('/api/superuser/inscripciones/99999')
        .send({ correo_padres: 'test@email.com' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Inscripción no encontrada');
    });
  });

  describe('POST /api/superuser/inscripciones/:id/convertir-estudiante', () => {
    it('debería convertir inscripción a estudiante activo', async () => {
      const response = await request(app)
        .post(`/api/superuser/inscripciones/${testInscripcionId}/convertir-estudiante`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Estudiante activado exitosamente');
      expect(response.body.data.carnet).toBe('TEST999');
    });

    it('debería fallar al convertir inscripción inexistente', async () => {
      const response = await request(app)
        .post('/api/superuser/inscripciones/99999/convertir-estudiante')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/superuser/inscripciones/:id', () => {
    it('debería eliminar una inscripción', async () => {
      const response = await request(app)
        .delete(`/api/superuser/inscripciones/${testInscripcionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Inscripción eliminada exitosamente');

      // Verificar que la inscripción está marcada como eliminada
      const _checkResponse = await request(app)
        .get(`/api/superuser/inscripciones/${testInscripcionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /api/superuser/inscripciones/upload-excel', () => {
    it('debería rechazar archivos que no sean Excel', async () => {
      const _response = await request(app)
        .post('/api/superuser/inscripciones/upload-excel')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('excelFile', Buffer.from('not an excel file'), 'test.txt')
        .expect(400);
    });

    it('debería rechazar cuando no se proporciona archivo', async () => {
      const response = await request(app)
        .post('/api/superuser/inscripciones/upload-excel')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No se proporcionó archivo Excel');
    });
  });
});
