const request = require('supertest');
const express = require('express');
const chai = require('chai');
const expect = chai.expect;

describe('Portal Vanguardia Juvenil - File Upload Integration Tests', function() {
  let app;
  let mockToken;
  let mockPlanificationId;

  before(function() {
    // Create Express app with file upload functionality
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    mockToken = 'Bearer mock-teacher-token';
    mockPlanificationId = 1;

    // Mock authentication middleware
    const mockAuth = (req, res, next) => {
      const token = req.headers.authorization;
      if (token === mockToken) {
        req.user = { id: 1, email: 'teacher@test.com', rol: 'Teacher' };
        next();
      } else {
        res.status(401).json({ success: false, error: 'Unauthorized' });
      }
    };

    // Mock file upload endpoints
    app.post('/api/teacher/planning/:planificationId/upload', mockAuth, (req, res) => {
      const { planificationId } = req.params;
      
      // Simulate file validation
      if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
        return res.status(400).json({
          success: false,
          message: 'No se ha proporcionado ningún archivo'
        });
      }

      // Mock successful upload
      res.status(201).json({
        success: true,
        message: 'Archivo subido correctamente',
        file: {
          id: 1,
          planification_id: parseInt(planificationId),
          file_name: 'planifications/1640995200000-test-document.pdf',
          original_name: 'test-document.pdf',
          file_url: 'https://portal-vanguardia-files.accountid.r2.cloudflarestorage.com/planifications/1640995200000-test-document.pdf',
          file_size: 1024000,
          mime_type: 'application/pdf',
          description: 'Test planification document',
          uploaded_by: 1,
          uploaded_at: new Date().toISOString()
        }
      });
    });

    app.get('/api/teacher/planning/:planificationId/files', mockAuth, (req, res) => {
      const { planificationId } = req.params;
      
      res.json({
        success: true,
        files: [
          {
            id: 1,
            planification_id: parseInt(planificationId),
            file_name: 'planifications/1640995200000-document1.pdf',
            original_name: 'document1.pdf',
            file_url: 'https://example.com/file1.pdf',
            file_size: 1024000,
            mime_type: 'application/pdf',
            description: 'First document',
            uploaded_by: 1,
            uploaded_at: '2024-01-01T10:00:00Z',
            uploaded_by_email: 'teacher@test.com'
          },
          {
            id: 2,
            planification_id: parseInt(planificationId),
            file_name: 'planifications/1640995300000-document2.docx',
            original_name: 'document2.docx',
            file_url: 'https://example.com/file2.docx',
            file_size: 2048000,
            mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            description: 'Second document',
            uploaded_by: 1,
            uploaded_at: '2024-01-01T11:00:00Z',
            uploaded_by_email: 'teacher@test.com'
          }
        ]
      });
    });

    app.delete('/api/teacher/planning/files/:fileId', mockAuth, (req, res) => {
      const { fileId } = req.params;
      
      if (fileId === '999') {
        return res.status(404).json({
          success: false,
          message: 'Archivo no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Archivo eliminado correctamente'
      });
    });

    app.get('/api/teacher/planning/files/:fileId/download', mockAuth, (req, res) => {
      const { fileId } = req.params;
      
      if (fileId === '999') {
        return res.status(404).json({
          success: false,
          message: 'Archivo no encontrado'
        });
      }

      res.json({
        success: true,
        downloadUrl: 'https://example.com/presigned-url-for-download',
        fileName: 'test-document.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf'
      });
    });

    // Mock validation endpoints
    app.post('/api/teacher/planning/:planificationId/upload/validate', mockAuth, (req, res) => {
      const { fileType, fileSize } = req.body;
      
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!allowedTypes.includes(fileType)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de archivo no válido. Solo se permiten archivos PDF, DOC y DOCX.'
        });
      }

      if (fileSize > maxSize) {
        return res.status(400).json({
          success: false,
          message: 'El archivo es demasiado grande. Tamaño máximo: 10MB.'
        });
      }

      res.json({
        success: true,
        message: 'Archivo válido'
      });
    });
  });

  describe('File Upload Functionality', function() {
    it('should upload a planification file successfully', function(done) {
      request(app)
        .post(`/api/teacher/planning/${mockPlanificationId}/upload`)
        .set('Authorization', mockToken)
        .set('Content-Type', 'multipart/form-data')
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('message', 'Archivo subido correctamente');
          expect(res.body).to.have.property('file');
          expect(res.body.file).to.have.property('planification_id', mockPlanificationId);
          expect(res.body.file).to.have.property('original_name');
          expect(res.body.file).to.have.property('file_url');
          done();
        });
    });

    it('should reject upload without authentication', function(done) {
      request(app)
        .post(`/api/teacher/planning/${mockPlanificationId}/upload`)
        .set('Content-Type', 'multipart/form-data')
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', false);
          expect(res.body).to.have.property('error', 'Unauthorized');
          done();
        });
    });

    it('should reject upload without file', function(done) {
      request(app)
        .post(`/api/teacher/planning/${mockPlanificationId}/upload`)
        .set('Authorization', mockToken)
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', false);
          expect(res.body).to.have.property('message', 'No se ha proporcionado ningún archivo');
          done();
        });
    });
  });

  describe('File Listing Functionality', function() {
    it('should get files for a planification', function(done) {
      request(app)
        .get(`/api/teacher/planning/${mockPlanificationId}/files`)
        .set('Authorization', mockToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('files');
          expect(res.body.files).to.be.an('array');
          expect(res.body.files).to.have.length.above(0);
          
          const file = res.body.files[0];
          expect(file).to.have.property('id');
          expect(file).to.have.property('original_name');
          expect(file).to.have.property('file_url');
          expect(file).to.have.property('mime_type');
          expect(file).to.have.property('uploaded_by_email');
          done();
        });
    });

    it('should require authentication for file listing', function(done) {
      request(app)
        .get(`/api/teacher/planning/${mockPlanificationId}/files`)
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', false);
          done();
        });
    });
  });

  describe('File Deletion Functionality', function() {
    it('should delete a file successfully', function(done) {
      request(app)
        .delete('/api/teacher/planning/files/1')
        .set('Authorization', mockToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('message', 'Archivo eliminado correctamente');
          done();
        });
    });

    it('should handle file not found for deletion', function(done) {
      request(app)
        .delete('/api/teacher/planning/files/999')
        .set('Authorization', mockToken)
        .expect(404)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', false);
          expect(res.body).to.have.property('message', 'Archivo no encontrado');
          done();
        });
    });

    it('should require authentication for file deletion', function(done) {
      request(app)
        .delete('/api/teacher/planning/files/1')
        .expect(401)
        .end(done);
    });
  });

  describe('File Download Functionality', function() {
    it('should generate download URL successfully', function(done) {
      request(app)
        .get('/api/teacher/planning/files/1/download')
        .set('Authorization', mockToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('downloadUrl');
          expect(res.body).to.have.property('fileName');
          expect(res.body).to.have.property('fileSize');
          expect(res.body).to.have.property('mimeType');
          expect(res.body.downloadUrl).to.include('https://');
          done();
        });
    });

    it('should handle file not found for download', function(done) {
      request(app)
        .get('/api/teacher/planning/files/999/download')
        .set('Authorization', mockToken)
        .expect(404)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', false);
          expect(res.body).to.have.property('message', 'Archivo no encontrado');
          done();
        });
    });

    it('should require authentication for download', function(done) {
      request(app)
        .get('/api/teacher/planning/files/1/download')
        .expect(401)
        .end(done);
    });
  });

  describe('File Validation', function() {
    it('should accept valid PDF files', function(done) {
      request(app)
        .post(`/api/teacher/planning/${mockPlanificationId}/upload/validate`)
        .set('Authorization', mockToken)
        .send({
          fileType: 'application/pdf',
          fileSize: 5 * 1024 * 1024 // 5MB
        })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('message', 'Archivo válido');
          done();
        });
    });

    it('should accept valid DOCX files', function(done) {
      request(app)
        .post(`/api/teacher/planning/${mockPlanificationId}/upload/validate`)
        .set('Authorization', mockToken)
        .send({
          fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          fileSize: 3 * 1024 * 1024 // 3MB
        })
        .expect(200)
        .end(done);
    });

    it('should reject invalid file types', function(done) {
      request(app)
        .post(`/api/teacher/planning/${mockPlanificationId}/upload/validate`)
        .set('Authorization', mockToken)
        .send({
          fileType: 'image/jpeg',
          fileSize: 1 * 1024 * 1024
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', false);
          expect(res.body.message).to.include('Tipo de archivo no válido');
          done();
        });
    });

    it('should reject files that are too large', function(done) {
      request(app)
        .post(`/api/teacher/planning/${mockPlanificationId}/upload/validate`)
        .set('Authorization', mockToken)
        .send({
          fileType: 'application/pdf',
          fileSize: 15 * 1024 * 1024 // 15MB (over 10MB limit)
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', false);
          expect(res.body.message).to.include('demasiado grande');
          done();
        });
    });
  });

  describe('API Response Structure Validation', function() {
    it('should maintain consistent success response format for uploads', function(done) {
      request(app)
        .post(`/api/teacher/planning/${mockPlanificationId}/upload`)
        .set('Authorization', mockToken)
        .set('Content-Type', 'multipart/form-data')
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success');
          expect(res.body).to.have.property('message');
          expect(res.body).to.have.property('file');
          expect(typeof res.body.success).to.equal('boolean');
          expect(res.body.success).to.be.true;
          done();
        });
    });

    it('should maintain consistent error response format', function(done) {
      request(app)
        .post(`/api/teacher/planning/${mockPlanificationId}/upload`)
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success');
          expect(res.body).to.have.property('message');
          expect(typeof res.body.success).to.equal('boolean');
          expect(res.body.success).to.be.false;
          done();
        });
    });

    it('should return proper JSON content type', function(done) {
      request(app)
        .get(`/api/teacher/planning/${mockPlanificationId}/files`)
        .set('Authorization', mockToken)
        .expect(200)
        .expect('Content-Type', /json/)
        .end(done);
    });
  });
});
