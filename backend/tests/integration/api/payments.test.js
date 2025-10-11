const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../../app');
const jwt = require('jsonwebtoken');

chai.use(chaiHttp);
const expect = chai.expect;

describe('Payment System Integration Tests', function() {
  let authToken;
  let testSuperUser;
  let testStudent;
  let testPayment;

  before(async function() {
    this.timeout(10000);

    // Create test superuser
    testSuperUser = await global.createTestUser({
      email: 'payment.admin@portalvj.com',
      rol: 1,
      nombre: 'Payment',
      apellido: 'Admin'
    });

    authToken = jwt.sign(
      { id: testSuperUser.id, email: testSuperUser.email, rol: 'SUP' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create test student for payments
    const studentQuery = `
      INSERT INTO Estudiantes (nombre, apellido, codigo_estudiante, activo)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const studentResult = await global.testDb.query(studentQuery, [
      'Test', 'Student', 'TS001', true
    ]);
    testStudent = studentResult.rows[0];
  });

  describe('Payment Creation and Management', function() {
    it('should create a new payment record', function(done) {
      const paymentData = {
        estudiante_id: testStudent.id,
        monto: 150.00,
        tipo_pago: 'Mensualidad',
        fecha_pago: new Date().toISOString().split('T')[0],
        metodo_pago: 'Efectivo',
        descripcion: 'Pago de mensualidad marzo 2025'
      };

      chai.request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('payment');
          expect(res.body.payment).to.have.property('id');
          expect(res.body.payment).to.have.property('monto', 150.00);
          expect(res.body.payment).to.have.property('tipo_pago', 'Mensualidad');

          testPayment = res.body.payment;
          done();
        });
    });

    it('should retrieve all payments', function(done) {
      chai.request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('payments');
          expect(res.body.payments).to.be.an('array');
          expect(res.body.payments.length).to.be.at.least(1);
          done();
        });
    });

    it('should retrieve payments for specific student', function(done) {
      chai.request(app)
        .get(`/api/payments/student/${testStudent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('payments');
          expect(res.body.payments).to.be.an('array');

          // Should find the payment we created
          const studentPayment = res.body.payments.find(p => p.id === testPayment.id);
          expect(studentPayment).to.exist;
          done();
        });
    });

    it('should update payment information', function(done) {
      const updateData = {
        monto: 175.00,
        descripcion: 'Pago de mensualidad marzo 2025 - Actualizado'
      };

      chai.request(app)
        .put(`/api/payments/${testPayment.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('payment');
          expect(res.body.payment).to.have.property('monto', 175.00);
          done();
        });
    });

    it('should validate payment amount is positive', function(done) {
      const invalidPayment = {
        estudiante_id: testStudent.id,
        monto: -50.00, // Invalid negative amount
        tipo_pago: 'Mensualidad',
        fecha_pago: new Date().toISOString().split('T')[0],
        metodo_pago: 'Efectivo'
      };

      chai.request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPayment)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('success', false);
          expect(res.body).to.have.property('error');
          done();
        });
    });

    it('should validate required fields', function(done) {
      const incompletePayment = {
        monto: 100.00,
        tipo_pago: 'Mensualidad'
        // Missing estudiante_id and other required fields
      };

      chai.request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompletePayment)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('success', false);
          done();
        });
    });
  });

  describe('Payment Reports and Analytics', function() {
    it('should generate payment summary report', function(done) {
      chai.request(app)
        .get('/api/payments/reports/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2025-01-01',
          endDate: '2025-12-31'
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('summary');
          expect(res.body.summary).to.have.property('totalAmount');
          expect(res.body.summary).to.have.property('totalPayments');
          expect(res.body.summary).to.have.property('byType');
          done();
        });
    });

    it('should retrieve payments by date range', function(done) {
      const today = new Date().toISOString().split('T')[0];

      chai.request(app)
        .get('/api/payments/range')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: today,
          endDate: today
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('payments');
          expect(res.body.payments).to.be.an('array');
          done();
        });
    });

    it('should retrieve payments by payment type', function(done) {
      chai.request(app)
        .get('/api/payments/type/Mensualidad')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('payments');
          expect(res.body.payments).to.be.an('array');

          // All payments should be of type 'Mensualidad'
          res.body.payments.forEach(payment => {
            expect(payment).to.have.property('tipo_pago', 'Mensualidad');
          });
          done();
        });
    });

    it('should retrieve outstanding payments', function(done) {
      chai.request(app)
        .get('/api/payments/outstanding')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('outstanding');
          expect(res.body.outstanding).to.be.an('array');
          done();
        });
    });
  });

  describe('Bulk Payment Operations', function() {
    it('should handle bulk payment creation', function(done) {
      const bulkPayments = [
        {
          estudiante_id: testStudent.id,
          monto: 100.00,
          tipo_pago: 'Inscripción',
          fecha_pago: new Date().toISOString().split('T')[0],
          metodo_pago: 'Transferencia',
          descripcion: 'Pago bulk 1'
        },
        {
          estudiante_id: testStudent.id,
          monto: 150.00,
          tipo_pago: 'Mensualidad',
          fecha_pago: new Date().toISOString().split('T')[0],
          metodo_pago: 'Cheque',
          descripcion: 'Pago bulk 2'
        }
      ];

      chai.request(app)
        .post('/api/payments/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ payments: bulkPayments })
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('created');
          expect(res.body.created).to.be.an('array');
          expect(res.body.created.length).to.equal(2);
          done();
        });
    });

    it('should validate all payments in bulk operation', function(done) {
      const invalidBulkPayments = [
        {
          estudiante_id: testStudent.id,
          monto: 100.00,
          tipo_pago: 'Inscripción',
          fecha_pago: new Date().toISOString().split('T')[0],
          metodo_pago: 'Transferencia'
        },
        {
          // Invalid payment - missing required fields
          monto: -50.00,
          tipo_pago: 'Mensualidad'
        }
      ];

      chai.request(app)
        .post('/api/payments/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ payments: invalidBulkPayments })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('success', false);
          expect(res.body).to.have.property('errors');
          expect(res.body.errors).to.be.an('array');
          done();
        });
    });
  });

  describe('Payment Search and Filtering', function() {
    it('should search payments by student name', function(done) {
      chai.request(app)
        .get('/api/payments/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ studentName: 'Test Student' })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('payments');
          expect(res.body.payments).to.be.an('array');
          done();
        });
    });

    it('should filter payments by payment method', function(done) {
      chai.request(app)
        .get('/api/payments/filter')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ metodo_pago: 'Efectivo' })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('payments');
          expect(res.body.payments).to.be.an('array');

          // All returned payments should be cash payments
          res.body.payments.forEach(payment => {
            expect(payment).to.have.property('metodo_pago', 'Efectivo');
          });
          done();
        });
    });
  });

  describe('Payment Deletion and Soft Delete', function() {
    let tempPaymentId;

    before(async function() {
      // Create a temporary payment for deletion tests
      const paymentQuery = `
        INSERT INTO Pagos (estudiante_id, monto, tipo_pago, fecha_pago, metodo_pago, descripcion)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const result = await global.testDb.query(paymentQuery, [
        testStudent.id, 50.00, 'Test', new Date().toISOString().split('T')[0], 'Efectivo', 'Test payment for deletion'
      ]);
      tempPaymentId = result.rows[0].id;
    });

    it('should soft delete a payment', function(done) {
      chai.request(app)
        .delete(`/api/payments/${tempPaymentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('message');
          done();
        });
    });

    it('should not retrieve soft deleted payments by default', function(done) {
      chai.request(app)
        .get(`/api/payments/${tempPaymentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body).to.have.property('success', false);
          done();
        });
    });

    it('should handle deletion of non-existent payment', function(done) {
      chai.request(app)
        .delete('/api/payments/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body).to.have.property('success', false);
          done();
        });
    });
  });
});
