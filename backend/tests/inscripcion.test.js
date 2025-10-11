const request = require('supertest');
const app = require('../app');
const pool = require('../database_cn');

describe('Inscripciones API', () => {
  let authToken;
  let testInscripcionId;

  beforeAll(async () => {
    // Configurar autenticación para los tests
    const loginResponse = await request(app)
      .post('/api/users/login')
      .send({
        email: 'superuser@test.com',
        password: 'password123'
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    if (testInscripcionId) {
      await pool.query('DELETE FROM Inscripciones WHERE id_inscripcion = $1', [testInscripcionId]);
    }

    // Cerrar conexión de base de datos
    await pool.end();
  });

  describe('GET /api/superuser/grados-secciones', () => {
    it('debería obtener todos los grados y secciones disponibles', async () => {
      const response = await request(app)
        .get('/api/superuser/grados-secciones')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        const gradoSeccion = response.body.data[0];
        expect(gradoSeccion).toHaveProperty('id_grado_seccion');
        expect(gradoSeccion).toHaveProperty('grado_nombre');
        expect(gradoSeccion).toHaveProperty('seccion_nombre');
        expect(gradoSeccion).toHaveProperty('display_name');
      }
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

      const response = await request(app)
        .post('/api/superuser/inscripciones')
        .set('Authorization', `Bearer ${authToken}`)
        .send(inscripcionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Inscripción creada exitosamente');
      expect(response.body.data.id_inscripcion).toBeDefined();

      testInscripcionId = response.body.data.id_inscripcion;
    });

    it('debería fallar al crear inscripción sin campos requeridos', async () => {
      const inscripcionData = {
        nombres: 'Estudiante',
        apellidos: 'Incompleto'
        // Faltan campos requeridos
      };

      const response = await request(app)
        .post('/api/superuser/inscripciones')
        .set('Authorization', `Bearer ${authToken}`)
        .send(inscripcionData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Campos requeridos');
    });

    it('debería fallar al crear inscripción duplicada', async () => {
      const inscripcionData = {
        carnet: 'TEST999', // Mismo carnet que en el primer test
        nombre: 'Otro',
        apellido: 'Estudiante',
        fecha_nacimiento: '2010-01-01',
        id_grado_seccion: 1
      };

      const response = await request(app)
        .post('/api/superuser/inscripciones')
        .set('Authorization', `Bearer ${authToken}`)
        .send(inscripcionData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Ya existe una inscripción activa');
    });
  });

  describe('GET /api/superuser/inscripciones', () => {
    it('debería obtener todas las inscripciones', async () => {
      const response = await request(app)
        .get('/api/superuser/inscripciones')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        // Verificar estructura de los datos
        const inscripcion = response.body.data[0];
        expect(inscripcion).toHaveProperty('id_inscripcion');
        expect(inscripcion).toHaveProperty('carnet');
        expect(inscripcion).toHaveProperty('nombres');
        expect(inscripcion).toHaveProperty('apellidos');
        expect(inscripcion).toHaveProperty('grado_seccion_display');
      }
    });
  });

  describe('GET /api/superuser/inscripciones/:id', () => {
    it('debería obtener una inscripción por ID', async () => {
      const response = await request(app)
        .get(`/api/superuser/inscripciones/${testInscripcionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id_inscripcion).toBe(testInscripcionId);
      expect(response.body.data.carnet).toBe('TEST999');
    });

    it('debería retornar 404 para ID inexistente', async () => {
      const response = await request(app)
        .get('/api/superuser/inscripciones/99999')
        .set('Authorization', `Bearer ${authToken}`)
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

      const response = await request(app)
        .put(`/api/superuser/inscripciones/${testInscripcionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Inscripción actualizada exitosamente');
      expect(response.body.data.correo_padres).toBe(updateData.correo_padres);
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
