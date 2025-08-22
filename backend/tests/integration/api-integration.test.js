const request = require('supertest');
const express = require('express');
const chai = require('chai');
const expect = chai.expect;

describe('Portal Vanguardia Juvenil - API Integration Tests', function() {
  let app;

  before(function() {
    // Create a minimal Express app for testing core functionality
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Mock authentication middleware
    const mockAuth = (req, res, next) => {
      const token = req.headers.authorization;
      if (token === 'Bearer mock-token') {
        req.user = { id: 1, email: 'test@test.com', rol: 'SUP' };
        next();
      } else {
        res.status(401).json({ success: false, error: 'Unauthorized' });
      }
    };

    // Test routes
    app.post('/api/auth/login', (req, res) => {
      const { email, password } = req.body;
      if (email === 'test@test.com' && password === 'password123') {
        res.json({
          success: true,
          token: 'mock-token',
          user: { id: 1, email, rol: 'SUP' }
        });
      } else {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }
    });

    app.get('/api/users', mockAuth, (req, res) => {
      res.json({
        success: true,
        data: [
          { id: 1, email: 'user1@test.com', rol: 'Teacher' },
          { id: 2, email: 'user2@test.com', rol: 'Parent' }
        ]
      });
    });

    app.post('/api/users', mockAuth, (req, res) => {
      const { email, password, rol } = req.body;
      if (!email || !password || !rol) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }
      res.status(201).json({
        success: true,
        data: { id: 3, email, rol }
      });
    });

    app.get('/api/courses', mockAuth, (req, res) => {
      res.json({
        success: true,
        data: [
          { id: 1, name: 'Mathematics', grade: 'Grade 1' },
          { id: 2, name: 'Science', grade: 'Grade 2' }
        ]
      });
    });

    app.get('/api/payments', mockAuth, (req, res) => {
      res.json({
        success: true,
        data: [
          { id: 1, amount: 100.00, status: 'paid', studentId: 1 },
          { id: 2, amount: 150.00, status: 'pending', studentId: 2 }
        ]
      });
    });

    app.post('/api/messages', mockAuth, (req, res) => {
      const { recipientId, subject, content } = req.body;
      if (!recipientId || !subject || !content) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }
      res.status(201).json({
        success: true,
        data: {
          id: 1,
          senderId: req.user.id,
          recipientId,
          subject,
          content,
          createdAt: new Date().toISOString()
        }
      });
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    });
  });

  describe('Authentication API', function() {
    it('should login with valid credentials', function(done) {
      request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
          password: 'password123'
        })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('token');
          expect(res.body).to.have.property('user');
          expect(res.body.user).to.have.property('email', 'test@test.com');
          done();
        });
    });

    it('should reject invalid credentials', function(done) {
      request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@test.com',
          password: 'wrongpassword'
        })
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', false);
          expect(res.body).to.have.property('error');
          done();
        });
    });

    it('should handle missing credentials', function(done) {
      request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com'
          // Missing password
        })
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', false);
          done();
        });
    });
  });

  describe('Users API', function() {
    it('should get users with valid token', function(done) {
      request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer mock-token')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('data');
          expect(res.body.data).to.be.an('array');
          expect(res.body.data).to.have.length.above(0);
          done();
        });
    });

    it('should reject unauthorized requests', function(done) {
      request(app)
        .get('/api/users')
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', false);
          expect(res.body).to.have.property('error', 'Unauthorized');
          done();
        });
    });

    it('should create a new user', function(done) {
      request(app)
        .post('/api/users')
        .set('Authorization', 'Bearer mock-token')
        .send({
          email: 'newuser@test.com',
          password: 'newpassword123',
          rol: 'Teacher'
        })
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('data');
          expect(res.body.data).to.have.property('email', 'newuser@test.com');
          expect(res.body.data).to.have.property('rol', 'Teacher');
          done();
        });
    });

    it('should validate required fields when creating user', function(done) {
      request(app)
        .post('/api/users')
        .set('Authorization', 'Bearer mock-token')
        .send({
          email: 'incomplete@test.com'
          // Missing password and rol
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', false);
          expect(res.body).to.have.property('error', 'Missing required fields');
          done();
        });
    });
  });

  describe('Courses API', function() {
    it('should get courses list', function(done) {
      request(app)
        .get('/api/courses')
        .set('Authorization', 'Bearer mock-token')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('data');
          expect(res.body.data).to.be.an('array');
          expect(res.body.data[0]).to.have.property('name');
          expect(res.body.data[0]).to.have.property('grade');
          done();
        });
    });

    it('should require authentication for courses', function(done) {
      request(app)
        .get('/api/courses')
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', false);
          done();
        });
    });
  });

  describe('Payments API', function() {
    it('should get payments list', function(done) {
      request(app)
        .get('/api/payments')
        .set('Authorization', 'Bearer mock-token')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('data');
          expect(res.body.data).to.be.an('array');
          expect(res.body.data[0]).to.have.property('amount');
          expect(res.body.data[0]).to.have.property('status');
          done();
        });
    });

    it('should require authentication for payments', function(done) {
      request(app)
        .get('/api/payments')
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', false);
          done();
        });
    });
  });

  describe('Messages API', function() {
    it('should create a new message', function(done) {
      request(app)
        .post('/api/messages')
        .set('Authorization', 'Bearer mock-token')
        .send({
          recipientId: 2,
          subject: 'Test Subject',
          content: 'This is a test message content'
        })
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('data');
          expect(res.body.data).to.have.property('subject', 'Test Subject');
          expect(res.body.data).to.have.property('content', 'This is a test message content');
          expect(res.body.data).to.have.property('senderId', 1);
          done();
        });
    });

    it('should validate required fields for messages', function(done) {
      request(app)
        .post('/api/messages')
        .set('Authorization', 'Bearer mock-token')
        .send({
          subject: 'Test Subject'
          // Missing recipientId and content
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', false);
          expect(res.body).to.have.property('error', 'Missing required fields');
          done();
        });
    });
  });

  describe('API Response Format Validation', function() {
    it('should maintain consistent success response format', function(done) {
      request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer mock-token')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success');
          expect(res.body).to.have.property('data');
          expect(typeof res.body.success).to.equal('boolean');
          expect(res.body.success).to.be.true;
          done();
        });
    });

    it('should maintain consistent error response format', function(done) {
      request(app)
        .get('/api/users')
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success');
          expect(res.body).to.have.property('error');
          expect(typeof res.body.success).to.equal('boolean');
          expect(res.body.success).to.be.false;
          expect(typeof res.body.error).to.equal('string');
          done();
        });
    });

    it('should return JSON content type', function(done) {
      request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer mock-token')
        .expect(200)
        .expect('Content-Type', /json/)
        .end(done);
    });
  });

  describe('HTTP Methods and Status Codes', function() {
    it('should handle GET requests properly', function(done) {
      request(app)
        .get('/api/courses')
        .set('Authorization', 'Bearer mock-token')
        .expect(200)
        .end(done);
    });

    it('should handle POST requests properly', function(done) {
      request(app)
        .post('/api/users')
        .set('Authorization', 'Bearer mock-token')
        .send({
          email: 'posttest@test.com',
          password: 'password123',
          rol: 'Parent'
        })
        .expect(201)
        .end(done);
    });

    it('should handle 404 for non-existent endpoints', function(done) {
      request(app)
        .get('/api/nonexistent')
        .set('Authorization', 'Bearer mock-token')
        .expect(404)
        .end(done);
    });
  });
});
