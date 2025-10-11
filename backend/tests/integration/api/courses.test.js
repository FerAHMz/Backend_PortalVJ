const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../../../app');
const jwt = require('jsonwebtoken');

chai.use(chaiHttp);
const expect = chai.expect;

describe('Course & Academic Management Integration Tests', function() {
  let authToken;
  let teacherToken;
  let testSuperUser;
  let testTeacher;
  let testCourse;
  let testStudent;
  let testGrade;

  beforeAll(async () => {
    jest.setTimeout(15000);

    // Create test superuser
    testSuperUser = await global.createTestUser({
      email: 'academic.admin@portalvj.com',
      rol: 1,
      nombre: 'Academic',
      apellido: 'Admin'
    });

    // Create test teacher
    testTeacher = await global.createTestUser({
      email: 'course.teacher@portalvj.com',
      rol: 3,
      nombre: 'Course',
      apellido: 'Teacher'
    });

    // Generate tokens
    authToken = jwt.sign(
      { id: testSuperUser.id, email: testSuperUser.email, rol: 'SUP' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    teacherToken = jwt.sign(
      { id: testTeacher.id, email: testTeacher.email, rol: 'Maestro' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create test student
    const studentQuery = `
      INSERT INTO Estudiantes (nombre, apellido, codigo_estudiante, activo)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const studentResult = await global.testDb.query(studentQuery, [
      'Test', 'Student', 'CS001', true
    ]);
    testStudent = studentResult.rows[0];

    // Create test grade
    const gradeQuery = `
      INSERT INTO Grados (grado)
      VALUES ($1)
      RETURNING *
    `;
    const gradeResult = await global.testDb.query(gradeQuery, ['Test Grade']);
    testGrade = gradeResult.rows[0];
  });

  describe('Course Management', function() {
    it('should create a new course', function(done) {
      const courseData = {
        nombre: 'Mathematics Advanced',
        descripcion: 'Advanced mathematics course for grade 10',
        grado_id: testGrade.id,
        maestro_id: testTeacher.id,
        periodo_academico: '2025-1',
        horario: 'Lunes 8:00-9:30, Miércoles 8:00-9:30',
        aula: 'A-101'
      };

      chai.request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(courseData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('course');
          expect(res.body.course).to.have.property('id');
          expect(res.body.course).to.have.property('nombre', courseData.nombre);
          expect(res.body.course).to.have.property('maestro_id', testTeacher.id);

          testCourse = res.body.course;
          done();
        });
    });

    it('should retrieve all courses', function(done) {
      chai.request(app)
        .get('/api/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('courses');
          expect(res.body.courses).to.be.an('array');
          expect(res.body.courses.length).to.be.at.least(1);
          done();
        });
    });

    it('should retrieve courses by teacher', function(done) {
      chai.request(app)
        .get(`/api/courses/teacher/${testTeacher.id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('courses');
          expect(res.body.courses).to.be.an('array');

          // Should find the course we created
          const teacherCourse = res.body.courses.find(c => c.id === testCourse.id);
          expect(teacherCourse).to.exist;
          done();
        });
    });

    it('should retrieve courses by grade', function(done) {
      chai.request(app)
        .get(`/api/courses/grade/${testGrade.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('courses');
          expect(res.body.courses).to.be.an('array');
          done();
        });
    });

    it('should update course information', function(done) {
      const updateData = {
        nombre: 'Mathematics Advanced - Updated',
        descripcion: 'Updated course description',
        aula: 'B-201'
      };

      chai.request(app)
        .put(`/api/courses/${testCourse.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('course');
          expect(res.body.course).to.have.property('nombre', updateData.nombre);
          expect(res.body.course).to.have.property('aula', updateData.aula);
          done();
        });
    });

    it('should validate required fields when creating course', function(done) {
      const invalidCourse = {
        nombre: 'Incomplete Course',
        // Missing required fields
      };

      chai.request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidCourse)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('success', false);
          expect(res.body).to.have.property('error');
          done();
        });
    });

    it('should prevent duplicate course names in same grade and period', function(done) {
      const duplicateCourse = {
        nombre: 'Mathematics Advanced - Updated', // Same name as updated course
        descripcion: 'Duplicate course',
        grado_id: testGrade.id,
        maestro_id: testTeacher.id,
        periodo_academico: '2025-1', // Same period
        horario: 'Different schedule',
        aula: 'C-101'
      };

      chai.request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateCourse)
        .end((err, res) => {
          expect(res).to.have.status(409);
          expect(res.body).to.have.property('success', false);
          expect(res.body).to.have.property('error');
          done();
        });
    });
  });

  describe('Student Enrollment', function() {
    it('should enroll student in course', function(done) {
      const enrollmentData = {
        estudiante_id: testStudent.id,
        curso_id: testCourse.id,
        fecha_inscripcion: new Date().toISOString().split('T')[0]
      };

      chai.request(app)
        .post('/api/courses/enrollment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(enrollmentData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('enrollment');
          expect(res.body.enrollment).to.have.property('estudiante_id', testStudent.id);
          expect(res.body.enrollment).to.have.property('curso_id', testCourse.id);
          done();
        });
    });

    it('should retrieve students enrolled in course', function(done) {
      chai.request(app)
        .get(`/api/courses/${testCourse.id}/students`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('students');
          expect(res.body.students).to.be.an('array');
          expect(res.body.students.length).to.be.at.least(1);

          const enrolledStudent = res.body.students.find(s => s.id === testStudent.id);
          expect(enrolledStudent).to.exist;
          done();
        });
    });

    it('should retrieve courses for student', function(done) {
      chai.request(app)
        .get(`/api/students/${testStudent.id}/courses`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('courses');
          expect(res.body.courses).to.be.an('array');

          const studentCourse = res.body.courses.find(c => c.id === testCourse.id);
          expect(studentCourse).to.exist;
          done();
        });
    });

    it('should prevent duplicate enrollment', function(done) {
      const duplicateEnrollment = {
        estudiante_id: testStudent.id,
        curso_id: testCourse.id,
        fecha_inscripcion: new Date().toISOString().split('T')[0]
      };

      chai.request(app)
        .post('/api/courses/enrollment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateEnrollment)
        .end((err, res) => {
          expect(res).to.have.status(409);
          expect(res.body).to.have.property('success', false);
          expect(res.body).to.have.property('error');
          done();
        });
    });

    it('should unenroll student from course', function(done) {
      chai.request(app)
        .delete(`/api/courses/${testCourse.id}/students/${testStudent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('message');
          done();
        });
    });
  });

  describe('Grade and Assignment Management', function() {
    let assignmentId;

    before(async function() {
      // Re-enroll student for grade testing
      await global.testDb.query(
        'INSERT INTO Inscripciones (estudiante_id, curso_id, fecha_inscripcion) VALUES ($1, $2, $3)',
        [testStudent.id, testCourse.id, new Date().toISOString().split('T')[0]]
      );
    });

    it('should create an assignment', function(done) {
      const assignmentData = {
        curso_id: testCourse.id,
        nombre: 'Math Quiz 1',
        descripcion: 'Basic algebra quiz',
        fecha_asignacion: new Date().toISOString().split('T')[0],
        fecha_entrega: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        puntos_maximos: 100
      };

      chai.request(app)
        .post('/api/courses/assignments')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(assignmentData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('assignment');
          expect(res.body.assignment).to.have.property('id');
          expect(res.body.assignment).to.have.property('nombre', assignmentData.nombre);

          assignmentId = res.body.assignment.id;
          done();
        });
    });

    it('should submit grade for assignment', function(done) {
      const gradeData = {
        estudiante_id: testStudent.id,
        tarea_id: assignmentId,
        calificacion: 85,
        comentarios: 'Good work, but needs improvement in problem 3'
      };

      chai.request(app)
        .post('/api/courses/grades')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(gradeData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('grade');
          expect(res.body.grade).to.have.property('calificacion', 85);
          expect(res.body.grade).to.have.property('comentarios', gradeData.comentarios);
          done();
        });
    });

    it('should retrieve student grades for course', function(done) {
      chai.request(app)
        .get(`/api/courses/${testCourse.id}/students/${testStudent.id}/grades`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('grades');
          expect(res.body.grades).to.be.an('array');
          expect(res.body.grades.length).to.be.at.least(1);

          const submittedGrade = res.body.grades.find(g => g.tarea_id === assignmentId);
          expect(submittedGrade).to.exist;
          expect(submittedGrade).to.have.property('calificacion', 85);
          done();
        });
    });

    it('should calculate course average for student', function(done) {
      chai.request(app)
        .get(`/api/courses/${testCourse.id}/students/${testStudent.id}/average`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('average');
          expect(res.body.average).to.be.a('number');
          expect(res.body.average).to.equal(85); // Only one grade so far
          done();
        });
    });

    it('should validate grade is within valid range', function(done) {
      const invalidGrade = {
        estudiante_id: testStudent.id,
        tarea_id: assignmentId,
        calificacion: 150, // Invalid - over 100
        comentarios: 'Invalid grade'
      };

      chai.request(app)
        .post('/api/courses/grades')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(invalidGrade)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('success', false);
          expect(res.body).to.have.property('error');
          done();
        });
    });

    it('should update existing grade', function(done) {
      const gradeUpdate = {
        calificacion: 90,
        comentarios: 'Revised grade after review'
      };

      chai.request(app)
        .put(`/api/courses/grades/student/${testStudent.id}/assignment/${assignmentId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(gradeUpdate)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('grade');
          expect(res.body.grade).to.have.property('calificacion', 90);
          done();
        });
    });
  });

  describe('Attendance Management', function() {
    it('should record student attendance', function(done) {
      const attendanceData = {
        curso_id: testCourse.id,
        estudiante_id: testStudent.id,
        fecha: new Date().toISOString().split('T')[0],
        presente: true,
        comentarios: 'On time and participated actively'
      };

      chai.request(app)
        .post('/api/courses/attendance')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(attendanceData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('attendance');
          expect(res.body.attendance).to.have.property('presente', true);
          done();
        });
    });

    it('should retrieve attendance for course', function(done) {
      chai.request(app)
        .get(`/api/courses/${testCourse.id}/attendance`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .query({ fecha: new Date().toISOString().split('T')[0] })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('attendance');
          expect(res.body.attendance).to.be.an('array');

          const studentAttendance = res.body.attendance.find(a => a.estudiante_id === testStudent.id);
          expect(studentAttendance).to.exist;
          expect(studentAttendance).to.have.property('presente', true);
          done();
        });
    });

    it('should retrieve student attendance history', function(done) {
      chai.request(app)
        .get(`/api/students/${testStudent.id}/attendance`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('attendance');
          expect(res.body.attendance).to.be.an('array');
          done();
        });
    });

    it('should calculate attendance percentage', function(done) {
      chai.request(app)
        .get(`/api/courses/${testCourse.id}/students/${testStudent.id}/attendance-rate`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('attendanceRate');
          expect(res.body.attendanceRate).to.be.a('number');
          expect(res.body.attendanceRate).to.be.at.least(0);
          expect(res.body.attendanceRate).to.be.at.most(100);
          done();
        });
    });
  });

  describe('Course Planning and Scheduling', function() {
    it('should create course schedule', function(done) {
      const scheduleData = {
        curso_id: testCourse.id,
        dia_semana: 'Lunes',
        hora_inicio: '08:00',
        hora_fin: '09:30',
        aula: 'A-101'
      };

      chai.request(app)
        .post('/api/courses/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scheduleData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('schedule');
          expect(res.body.schedule).to.have.property('dia_semana', 'Lunes');
          expect(res.body.schedule).to.have.property('hora_inicio', '08:00');
          done();
        });
    });

    it('should detect schedule conflicts', function(done) {
      const conflictingSchedule = {
        curso_id: testCourse.id,
        dia_semana: 'Lunes',
        hora_inicio: '08:30', // Overlaps with existing schedule
        hora_fin: '10:00',
        aula: 'A-101'
      };

      chai.request(app)
        .post('/api/courses/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send(conflictingSchedule)
        .end((err, res) => {
          expect(res).to.have.status(409);
          expect(res.body).to.have.property('success', false);
          expect(res.body).to.have.property('error');
          done();
        });
    });

    it('should retrieve weekly schedule', function(done) {
      chai.request(app)
        .get('/api/courses/schedule/weekly')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('schedule');
          expect(res.body.schedule).to.be.an('object');
          done();
        });
    });
  });

  describe('Course Reporting', function() {
    it('should generate course performance report', function(done) {
      chai.request(app)
        .get(`/api/courses/${testCourse.id}/reports/performance`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('report');
          expect(res.body.report).to.have.property('courseInfo');
          expect(res.body.report).to.have.property('statistics');
          expect(res.body.report).to.have.property('studentPerformance');
          done();
        });
    });

    it('should generate attendance summary report', function(done) {
      chai.request(app)
        .get(`/api/courses/${testCourse.id}/reports/attendance`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('report');
          expect(res.body.report).to.have.property('summary');
          expect(res.body.report).to.have.property('details');
          done();
        });
    });
  });
});
