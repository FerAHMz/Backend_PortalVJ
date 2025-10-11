const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app');
const jwt = require('jsonwebtoken');

chai.use(chaiHttp);
const expect = chai.expect;

describe('End-to-End Workflow Integration Tests', function() {
  let superUserToken;
  let teacherToken;
  let parentToken;
  let testSuperUser;
  let testTeacher;
  let testParent;
  let testStudent;
  let testCourse;
  let testGrade;

  before(async function() {
    this.timeout(20000);
    console.log('Setting up complete workflow test environment...');

    // Create core test data
    await setupTestEnvironment();
  });

  async function setupTestEnvironment() {
    // Create SuperUser
    testSuperUser = await global.createTestUser({
      email: 'workflow.super@portalvj.com',
      rol: 1,
      nombre: 'Workflow',
      apellido: 'SuperUser'
    });

    // Create Teacher
    testTeacher = await global.createTestUser({
      email: 'workflow.teacher@portalvj.com',
      rol: 3,
      nombre: 'Workflow',
      apellido: 'Teacher'
    });

    // Create Parent
    testParent = await global.createTestUser({
      email: 'workflow.parent@portalvj.com',
      rol: 4,
      nombre: 'Workflow',
      apellido: 'Parent'
    });

    // Generate tokens
    superUserToken = jwt.sign(
      { id: testSuperUser.id, email: testSuperUser.email, rol: 'SUP' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    teacherToken = jwt.sign(
      { id: testTeacher.id, email: testTeacher.email, rol: 'Maestro' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    parentToken = jwt.sign(
      { id: testParent.id, email: testParent.email, rol: 'Padre' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create supporting data
    const gradeQuery = 'INSERT INTO Grados (grado) VALUES ($1) RETURNING *';
    const gradeResult = await global.testDb.query(gradeQuery, ['Workflow Grade']);
    testGrade = gradeResult.rows[0];

    const studentQuery = `
      INSERT INTO Estudiantes (nombre, apellido, codigo_estudiante, activo, padre_id)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `;
    const studentResult = await global.testDb.query(studentQuery, [
      'Workflow', 'Student', 'WF001', true, testParent.id
    ]);
    testStudent = studentResult.rows[0];
  }

  describe('Complete Academic Year Workflow', function() {
    it('should complete the full academic setup workflow', async function() {
      this.timeout(15000);

      // Step 1: SuperUser creates a course
      const courseCreation = await new Promise((resolve, reject) => {
        const courseData = {
          nombre: 'Workflow Mathematics',
          descripcion: 'Complete workflow test course',
          grado_id: testGrade.id,
          maestro_id: testTeacher.id,
          periodo_academico: '2025-1',
          horario: 'Lunes 10:00-11:30, Miércoles 10:00-11:30',
          aula: 'WF-101'
        };

        chai.request(app)
          .post('/api/courses')
          .set('Authorization', `Bearer ${superUserToken}`)
          .send(courseData)
          .end((err, res) => {
            if (err) reject(err);
            expect(res).to.have.status(201);
            expect(res.body.success).to.be.true;
            testCourse = res.body.course;
            resolve(res.body);
          });
      });

      expect(courseCreation.success).to.be.true;
      expect(testCourse).to.have.property('id');

      // Step 2: Enroll student in course
      const enrollment = await new Promise((resolve, reject) => {
        const enrollmentData = {
          estudiante_id: testStudent.id,
          curso_id: testCourse.id,
          fecha_inscripcion: new Date().toISOString().split('T')[0]
        };

        chai.request(app)
          .post('/api/courses/enrollment')
          .set('Authorization', `Bearer ${superUserToken}`)
          .send(enrollmentData)
          .end((err, res) => {
            if (err) reject(err);
            expect(res).to.have.status(201);
            expect(res.body.success).to.be.true;
            resolve(res.body);
          });
      });

      expect(enrollment.success).to.be.true;

      // Step 3: Teacher creates an assignment
      const assignment = await new Promise((resolve, reject) => {
        const assignmentData = {
          curso_id: testCourse.id,
          nombre: 'Workflow Assignment 1',
          descripcion: 'First assignment in workflow',
          fecha_asignacion: new Date().toISOString().split('T')[0],
          fecha_entrega: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          puntos_maximos: 100
        };

        chai.request(app)
          .post('/api/courses/assignments')
          .set('Authorization', `Bearer ${teacherToken}`)
          .send(assignmentData)
          .end((err, res) => {
            if (err) reject(err);
            expect(res).to.have.status(201);
            expect(res.body.success).to.be.true;
            resolve(res.body);
          });
      });

      const assignmentId = assignment.assignment.id;

      // Step 4: Teacher records attendance
      const attendance = await new Promise((resolve, reject) => {
        const attendanceData = {
          curso_id: testCourse.id,
          estudiante_id: testStudent.id,
          fecha: new Date().toISOString().split('T')[0],
          presente: true,
          comentarios: 'Present and engaged'
        };

        chai.request(app)
          .post('/api/courses/attendance')
          .set('Authorization', `Bearer ${teacherToken}`)
          .send(attendanceData)
          .end((err, res) => {
            if (err) reject(err);
            expect(res).to.have.status(201);
            expect(res.body.success).to.be.true;
            resolve(res.body);
          });
      });

      expect(attendance.success).to.be.true;

      // Step 5: Teacher submits grade
      const grade = await new Promise((resolve, reject) => {
        const gradeData = {
          estudiante_id: testStudent.id,
          tarea_id: assignmentId,
          calificacion: 88,
          comentarios: 'Excellent work on the workflow assignment'
        };

        chai.request(app)
          .post('/api/courses/grades')
          .set('Authorization', `Bearer ${teacherToken}`)
          .send(gradeData)
          .end((err, res) => {
            if (err) reject(err);
            expect(res).to.have.status(201);
            expect(res.body.success).to.be.true;
            resolve(res.body);
          });
      });

      expect(grade.success).to.be.true;
      expect(grade.grade.calificacion).to.equal(88);

      // Step 6: Process student payment
      const payment = await new Promise((resolve, reject) => {
        const paymentData = {
          estudiante_id: testStudent.id,
          monto: 200.00,
          tipo_pago: 'Mensualidad',
          fecha_pago: new Date().toISOString().split('T')[0],
          metodo_pago: 'Transferencia',
          descripcion: 'Workflow payment test'
        };

        chai.request(app)
          .post('/api/payments')
          .set('Authorization', `Bearer ${superUserToken}`)
          .send(paymentData)
          .end((err, res) => {
            if (err) reject(err);
            expect(res).to.have.status(201);
            expect(res.body.success).to.be.true;
            resolve(res.body);
          });
      });

      expect(payment.success).to.be.true;
      expect(payment.payment.monto).to.equal(200.00);

      // Step 7: Teacher sends message to parent about progress
      const message = await new Promise((resolve, reject) => {
        const messageData = {
          recipient_id: testParent.id,
          recipient_role: 'Padre',
          subject: 'Excelente progreso de su hijo',
          message: 'Su hijo ha demostrado un excelente rendimiento en el curso de matemáticas. Obtuvo 88 puntos en la primera tarea.',
          priority: 'normal'
        };

        chai.request(app)
          .post('/api/messages')
          .set('Authorization', `Bearer ${teacherToken}`)
          .send(messageData)
          .end((err, res) => {
            if (err) reject(err);
            expect(res).to.have.status(201);
            expect(res.body.success).to.be.true;
            resolve(res.body);
          });
      });

      expect(message.success).to.be.true;
      expect(message.message.subject).to.contain('progreso');
    });

    it('should verify complete data integrity after workflow', function(done) {
      this.timeout(10000);

      // Verify all components were created correctly
      Promise.all([
        // Check course exists
        new Promise((resolve) => {
          chai.request(app)
            .get(`/api/courses/${testCourse.id}`)
            .set('Authorization', `Bearer ${superUserToken}`)
            .end((err, res) => {
              expect(res).to.have.status(200);
              expect(res.body.success).to.be.true;
              resolve();
            });
        }),

        // Check student is enrolled
        new Promise((resolve) => {
          chai.request(app)
            .get(`/api/courses/${testCourse.id}/students`)
            .set('Authorization', `Bearer ${teacherToken}`)
            .end((err, res) => {
              expect(res).to.have.status(200);
              expect(res.body.success).to.be.true;
              const studentFound = res.body.students.find(s => s.id === testStudent.id);
              expect(studentFound).to.exist;
              resolve();
            });
        }),

        // Check payment was recorded
        new Promise((resolve) => {
          chai.request(app)
            .get(`/api/payments/student/${testStudent.id}`)
            .set('Authorization', `Bearer ${superUserToken}`)
            .end((err, res) => {
              expect(res).to.have.status(200);
              expect(res.body.success).to.be.true;
              expect(res.body.payments).to.be.an('array');
              expect(res.body.payments.length).to.be.at.least(1);
              resolve();
            });
        }),

        // Check message was sent
        new Promise((resolve) => {
          chai.request(app)
            .get('/api/messages/conversations')
            .set('Authorization', `Bearer ${parentToken}`)
            .end((err, res) => {
              expect(res).to.have.status(200);
              expect(res.body.success).to.be.true;
              expect(res.body.conversations).to.be.an('array');
              expect(res.body.conversations.length).to.be.at.least(1);
              resolve();
            });
        })
      ]).then(() => {
        done();
      }).catch(done);
    });
  });

  describe('Error Handling and Edge Cases', function() {
    it('should handle cascade operations correctly', function(done) {
      // Test that related data is handled properly when primary entities change
      chai.request(app)
        .put(`/api/courses/${testCourse.id}`)
        .set('Authorization', `Bearer ${superUserToken}`)
        .send({
          nombre: 'Updated Workflow Mathematics',
          descripcion: 'Updated course description'
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.success).to.be.true;
          expect(res.body.course.nombre).to.equal('Updated Workflow Mathematics');
          done();
        });
    });

    it('should maintain referential integrity', function(done) {
      // Try to delete a course that has enrollments - should fail or handle gracefully
      chai.request(app)
        .delete(`/api/courses/${testCourse.id}`)
        .set('Authorization', `Bearer ${superUserToken}`)
        .end((err, res) => {
          // Should either prevent deletion or handle it gracefully
          expect([400, 409, 422]).to.include(res.status);
          expect(res.body.success).to.be.false;
          done();
        });
    });

    it('should handle concurrent operations', async function() {
      this.timeout(10000);

      // Simulate concurrent grade submissions
      const concurrentGrades = [];
      for (let i = 0; i < 3; i++) {
        concurrentGrades.push(
          new Promise((resolve, _reject) => {
            const gradeData = {
              estudiante_id: testStudent.id,
              tarea_id: 999, // Non-existent assignment
              calificacion: 80 + i,
              comentarios: `Concurrent test ${i}`
            };

            chai.request(app)
              .post('/api/courses/grades')
              .set('Authorization', `Bearer ${teacherToken}`)
              .send(gradeData)
              .end((err, res) => {
                // Should fail gracefully
                expect(res).to.have.status(400);
                resolve();
              });
          })
        );
      }

      await Promise.all(concurrentGrades);
    });

    it('should validate business rules across subsystems', function(done) {
      // Test complex business rule: student cannot be enrolled in overlapping courses
      const overlappingCourseData = {
        nombre: 'Overlapping Course',
        descripcion: 'This should conflict with existing course',
        grado_id: testGrade.id,
        maestro_id: testTeacher.id,
        periodo_academico: '2025-1',
        horario: 'Lunes 10:00-11:30', // Same as workflow course
        aula: 'WF-102'
      };

      chai.request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${superUserToken}`)
        .send(overlappingCourseData)
        .end((err, res) => {
          // Should detect scheduling conflict
          expect(res).to.have.status(409);
          expect(res.body.success).to.be.false;
          expect(res.body.error).to.contain('conflict');
          done();
        });
    });
  });

  describe('Performance and Load Testing', function() {
    it('should handle bulk operations efficiently', function(done) {
      this.timeout(15000);

      // Create multiple payments in bulk
      const bulkPayments = [];
      for (let i = 0; i < 10; i++) {
        bulkPayments.push({
          estudiante_id: testStudent.id,
          monto: 50.00 + i,
          tipo_pago: 'Cuota',
          fecha_pago: new Date().toISOString().split('T')[0],
          metodo_pago: 'Efectivo',
          descripcion: `Bulk payment ${i + 1}`
        });
      }

      const startTime = Date.now();

      chai.request(app)
        .post('/api/payments/bulk')
        .set('Authorization', `Bearer ${superUserToken}`)
        .send({ payments: bulkPayments })
        .end((err, res) => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;

          expect(res).to.have.status(201);
          expect(res.body.success).to.be.true;
          expect(res.body.created).to.be.an('array');
          expect(res.body.created.length).to.equal(10);

          // Performance assertion - should complete within reasonable time
          expect(responseTime).to.be.below(5000); // 5 seconds

          console.log(`Bulk payment operation took ${responseTime}ms`);
          done();
        });
    });

    it('should generate complex reports efficiently', function(done) {
      this.timeout(10000);

      const startTime = Date.now();

      chai.request(app)
        .get('/api/reports/comprehensive')
        .set('Authorization', `Bearer ${superUserToken}`)
        .query({
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          includeGrades: true,
          includeAttendance: true,
          includePayments: true
        })
        .end((err, res) => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;

          expect(res).to.have.status(200);
          expect(res.body.success).to.be.true;

          // Performance assertion
          expect(responseTime).to.be.below(8000); // 8 seconds

          console.log(`Comprehensive report generation took ${responseTime}ms`);
          done();
        });
    });
  });

  describe('Security and Authorization Flow', function() {
    it('should prevent unauthorized cross-role data access', function(done) {
      // Parent trying to access all payments (should be restricted)
      chai.request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer ${parentToken}`)
        .end((err, res) => {
          expect(res).to.have.status(403);
          expect(res.body.success).to.be.false;
          done();
        });
    });

    it('should enforce data isolation between users', function(done) {
      // Teacher trying to access grades for courses they don't teach
      chai.request(app)
        .get('/api/courses/999/students/1/grades')
        .set('Authorization', `Bearer ${teacherToken}`)
        .end((err, res) => {
          expect(res).to.have.status(403);
          expect(res.body.success).to.be.false;
          done();
        });
    });

    it('should validate token expiration handling', function(done) {
      // Create an expired token
      const expiredToken = jwt.sign(
        { id: testTeacher.id, email: testTeacher.email, rol: 'Maestro' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Already expired
      );

      chai.request(app)
        .get('/api/courses')
        .set('Authorization', `Bearer ${expiredToken}`)
        .end((err, res) => {
          expect(res).to.have.status(401);
          expect(res.body.success).to.be.false;
          done();
        });
    });
  });
});
