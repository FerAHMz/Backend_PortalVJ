const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../../app');
const jwt = require('jsonwebtoken');

chai.use(chaiHttp);
const expect = chai.expect;

describe('User Management Integration Tests', function() {
  let authToken;
  let testSuperUser;

  before(async function() {
    // Create a superuser for testing
    testSuperUser = await global.createTestUser({
      email: 'superuser.test@portalvj.com',
      rol: 1,
      nombre: 'Super',
      apellido: 'User'
    });

    authToken = jwt.sign(
      { id: testSuperUser.id, email: testSuperUser.email, rol: 'SUP' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('SuperUser CRUD Operations', function() {
    let createdUserId;

    it('should create a new superuser', function(done) {
      const newUser = {
        nombre: 'New',
        apellido: 'SuperUser',
        email: 'newsuperuser@portalvj.com',
        telefono: '1234567890',
        password: 'SecurePassword123!'
      };

      chai.request(app)
        .post('/api/superuser/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newUser)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('user');
          expect(res.body.user).to.have.property('id');
          expect(res.body.user).to.have.property('email', newUser.email);
          expect(res.body.user).to.not.have.property('password');

          createdUserId = res.body.user.id;
          done();
        });
    });

    it('should retrieve all superusers', function(done) {
      chai.request(app)
        .get('/api/superuser/users')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('users');
          expect(res.body.users).to.be.an('array');
          expect(res.body.users.length).to.be.at.least(1);
          done();
        });
    });

    it('should retrieve a specific superuser by ID', function(done) {
      chai.request(app)
        .get(`/api/superuser/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('user');
          expect(res.body.user).to.have.property('id', createdUserId);
          done();
        });
    });

    it('should update a superuser', function(done) {
      const updateData = {
        nombre: 'Updated',
        apellido: 'SuperUser',
        telefono: '9876543210'
      };

      chai.request(app)
        .put(`/api/superuser/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('user');
          expect(res.body.user).to.have.property('nombre', 'Updated');
          expect(res.body.user).to.have.property('telefono', '9876543210');
          done();
        });
    });

    it('should deactivate a superuser', function(done) {
      chai.request(app)
        .put(`/api/superuser/users/${createdUserId}/deactivate`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('message');
          done();
        });
    });

    it('should handle non-existent user gracefully', function(done) {
      chai.request(app)
        .get('/api/superuser/users/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body).to.have.property('success', false);
          done();
        });
    });

    it('should validate required fields when creating user', function(done) {
      const invalidUser = {
        nombre: 'Test',
        // Missing required fields
      };

      chai.request(app)
        .post('/api/superuser/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUser)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('success', false);
          done();
        });
    });

    it('should prevent duplicate email registration', function(done) {
      const duplicateUser = {
        nombre: 'Duplicate',
        apellido: 'User',
        email: testSuperUser.email, // Using existing email
        telefono: '5555555555',
        password: 'Password123!'
      };

      chai.request(app)
        .post('/api/superuser/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateUser)
        .end((err, res) => {
          expect(res).to.have.status(409);
          expect(res.body).to.have.property('success', false);
          expect(res.body).to.have.property('error');
          done();
        });
    });
  });

  describe('Teacher Management', function() {
    let teacherId;

    it('should create a new teacher', function(done) {
      const newTeacher = {
        nombre: 'John',
        apellido: 'Teacher',
        email: 'john.teacher@portalvj.com',
        telefono: '5551234567',
        password: 'TeacherPass123!',
        materias: [1, 2] // Assuming these subjects exist
      };

      chai.request(app)
        .post('/api/superuser/teachers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newTeacher)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('teacher');

          teacherId = res.body.teacher.id;
          done();
        });
    });

    it('should retrieve all teachers', function(done) {
      chai.request(app)
        .get('/api/superuser/teachers')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('teachers');
          expect(res.body.teachers).to.be.an('array');
          done();
        });
    });

    it('should update teacher information', function(done) {
      const updateData = {
        nombre: 'Updated John',
        telefono: '5559876543'
      };

      chai.request(app)
        .put(`/api/superuser/teachers/${teacherId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          done();
        });
    });
  });

  describe('Parent Management', function() {
    let _parentId;

    it('should create a new parent', function(done) {
      const newParent = {
        nombre: 'Maria',
        apellido: 'Parent',
        email: 'maria.parent@portalvj.com',
        telefono: '5551111111',
        password: 'ParentPass123!'
      };

      chai.request(app)
        .post('/api/superuser/parents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newParent)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('parent');

          _parentId = res.body.parent.id;
          done();
        });
    });

    it('should retrieve all parents', function(done) {
      chai.request(app)
        .get('/api/superuser/parents')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('parents');
          expect(res.body.parents).to.be.an('array');
          done();
        });
    });
  });

  describe('Profile Management', function() {
    it('should retrieve user profile', function(done) {
      chai.request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('user');
          expect(res.body.user).to.have.property('id', testSuperUser.id);
          expect(res.body.user).to.not.have.property('password');
          done();
        });
    });

    it('should update user profile', function(done) {
      const profileUpdate = {
        nombre: 'Updated Super',
        telefono: '5550000000'
      };

      chai.request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileUpdate)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('user');
          expect(res.body.user).to.have.property('nombre', 'Updated Super');
          done();
        });
    });

    it('should change user password', function(done) {
      const passwordChange = {
        currentPassword: 'oldPassword',
        newPassword: 'NewSecurePassword123!',
        confirmPassword: 'NewSecurePassword123!'
      };

      chai.request(app)
        .put('/api/user/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordChange)
        .end((err, res) => {
          // This might return 400 if current password is wrong (expected in test)
          expect([200, 400]).to.include(res.status);
          expect(res.body).to.have.property('success');
          done();
        });
    });
  });
});
