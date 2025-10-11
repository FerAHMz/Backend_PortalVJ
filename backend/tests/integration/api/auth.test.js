const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../../../app');

chai.use(chaiHttp);
const expect = chai.expect;

describe('Authentication & Authorization Integration Tests', function() {
  let _server;
  let _testUser;
  let authToken;

  beforeAll(async () => {
    jest.setTimeout(10000);
    // Create a test user for authentication
    _testUser = await global.createTestUser({
      email: 'auth.test@portalvj.com',
      password: '$2b$10$YourHashedPasswordHere',
      rol: 1 // SUP role
    });
  });

  describe('POST /login', function() {
    it('should login with valid credentials', function(done) {
      chai.request(app)
        .post('/login')
        .send({
          email: 'auth.test@portalvj.com',
          password: 'testPassword123'
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('token');
          expect(res.body).to.have.property('user');
          expect(res.body.user).to.have.property('id');
          expect(res.body.user).to.have.property('email', 'auth.test@portalvj.com');

          authToken = res.body.token;
          done();
        });
    });

    it('should reject invalid credentials', function(done) {
      chai.request(app)
        .post('/login')
        .send({
          email: 'auth.test@portalvj.com',
          password: 'wrongPassword'
        })
        .end((err, res) => {
          expect(res).to.have.status(401);
          expect(res.body).to.have.property('success', false);
          expect(res.body).to.have.property('error');
          done();
        });
    });

    it('should reject non-existent user', function(done) {
      chai.request(app)
        .post('/login')
        .send({
          email: 'nonexistent@portalvj.com',
          password: 'anyPassword'
        })
        .end((err, res) => {
          expect(res).to.have.status(401);
          expect(res.body).to.have.property('success', false);
          done();
        });
    });

    it('should validate required fields', function(done) {
      chai.request(app)
        .post('/login')
        .send({
          email: 'test@example.com'
          // Missing password
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          done();
        });
    });
  });

  describe('Protected Routes Authorization', function() {
    it('should allow access with valid token', function(done) {
      chai.request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.not.have.status(401);
          expect(res).to.not.have.status(403);
          done();
        });
    });

    it('should reject access without token', function(done) {
      chai.request(app)
        .get('/api/user/profile')
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });

    it('should reject access with invalid token', function(done) {
      chai.request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer invalidToken123')
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });

    it('should reject access with malformed token', function(done) {
      chai.request(app)
        .get('/api/user/profile')
        .set('Authorization', 'InvalidFormat token')
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });
  });

  describe('Role-Based Access Control', function() {
    let teacherToken;
    let _parentToken;

    before(async function() {
      // Create teacher user
      const teacherUser = await global.createTestUser({
        email: 'teacher.test@portalvj.com',
        rol: 3 // Teacher role
      });

      // Create parent user
      const parentUser = await global.createTestUser({
        email: 'parent.test@portalvj.com',
        rol: 4 // Parent role
      });

      // Get tokens for each role (simplified - in real scenario, would login)
      // For testing purposes, we'll create tokens directly
      const jwt = require('jsonwebtoken');
      teacherToken = jwt.sign(
        { id: teacherUser.id, email: teacherUser.email, rol: 'Maestro' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      _parentToken = jwt.sign(
        { id: parentUser.id, email: parentUser.email, rol: 'Padre' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('should allow superuser access to admin routes', function(done) {
      chai.request(app)
        .get('/api/superuser/families')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.not.have.status(403);
          done();
        });
    });

    it('should deny teacher access to admin routes', function(done) {
      chai.request(app)
        .get('/api/superuser/families')
        .set('Authorization', `Bearer ${teacherToken}`)
        .end((err, res) => {
          expect(res).to.have.status(403);
          done();
        });
    });

    it('should allow teacher access to teacher routes', function(done) {
      chai.request(app)
        .get('/api/courses')
        .set('Authorization', `Bearer ${teacherToken}`)
        .end((err, res) => {
          expect(res).to.not.have.status(403);
          done();
        });
    });
  });
});
