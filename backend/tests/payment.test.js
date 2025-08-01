const request = require('supertest');
const app = require('../app');
const db = require('../database_cn');

// Mock the database connection
jest.mock('../database_cn', () => ({
  getPool: jest.fn(() => ({
    connect: jest.fn(),
    query: jest.fn()
  }))
}));

describe('Payment Controller Tests', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    db.getPool.mockReturnValue({
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn()
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test Case 1: GET All Payments - Data Retrieval and Sorting
  describe('GET /api/payments', () => {
    test('should return all payments ordered by creation date', async () => {
      // Arrange
      const mockPayments = [
        {
          id: 1,
          amount: 150.00,
          user_id: 101,
          description: 'Mensualidad Enero',
          created_at: '2025-01-15T10:30:00Z'
        },
        {
          id: 2,
          amount: 200.50,
          user_id: 102,
          description: 'Matrícula 2025',
          created_at: '2025-01-10T09:15:00Z'
        }
      ];

      db.getPool().query.mockResolvedValueOnce({ rows: mockPayments });

      // Act
      const response = await request(app)
        .get('/api/payments')
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('payments');
      expect(response.body.payments).toHaveLength(2);
      expect(response.body.payments[0]).toHaveProperty('amount', 150.00);
      expect(response.body.payments[0]).toHaveProperty('description', 'Mensualidad Enero');
      expect(db.getPool().query).toHaveBeenCalledWith(
        'SELECT * FROM payments ORDER BY created_at DESC'
      );
    });

    test('should return empty array when no payments exist', async () => {
      // Arrange
      db.getPool().query.mockResolvedValueOnce({ rows: [] });

      // Act
      const response = await request(app)
        .get('/api/payments')
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.payments).toHaveLength(0);
      expect(Array.isArray(response.body.payments)).toBe(true);
    });

    test('should handle database errors when fetching payments', async () => {
      // Arrange
      db.getPool().query.mockRejectedValueOnce(new Error('Database connection failed'));

      // Act
      const response = await request(app)
        .get('/api/payments')
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Internal Server Error');
    });
  });

  // Test Case 2: POST Create Payment - Input Validation and Data Persistence
  describe('POST /api/payments', () => {
    test('should create a new payment successfully with valid data', async () => {
      // Arrange
      const newPayment = {
        amount: 275.50,
        userId: 205,
        description: 'Mensualidad Febrero 2025'
      };

      db.getPool().query.mockResolvedValueOnce({ rows: [] }); // Successful insert

      // Act
      const response = await request(app)
        .post('/api/payments')
        .send(newPayment)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Payment created successfully');
      expect(db.getPool().query).toHaveBeenCalledWith(
        'INSERT INTO payments (amount, user_id, description, created_at)\n       VALUES ($1, $2, $3, NOW())',
        [275.50, 205, 'Mensualidad Febrero 2025']
      );
    });

    test('should return 400 error when amount is missing', async () => {
      // Arrange
      const incompletePayment = {
        userId: 205,
        description: 'Mensualidad Febrero 2025'
        // Missing amount
      };

      // Act
      const response = await request(app)
        .post('/api/payments')
        .send(incompletePayment)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Missing required fields');
      expect(db.getPool().query).not.toHaveBeenCalled();
    });

    test('should return 400 error when userId is missing', async () => {
      // Arrange
      const incompletePayment = {
        amount: 275.50,
        description: 'Mensualidad Febrero 2025'
        // Missing userId
      };

      // Act
      const response = await request(app)
        .post('/api/payments')
        .send(incompletePayment)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Missing required fields');
    });

    test('should return 400 error when description is missing', async () => {
      // Arrange
      const incompletePayment = {
        amount: 275.50,
        userId: 205
        // Missing description
      };

      // Act
      const response = await request(app)
        .post('/api/payments')
        .send(incompletePayment)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Missing required fields');
    });

    test('should handle database errors during payment creation', async () => {
      // Arrange
      const validPayment = {
        amount: 100.00,
        userId: 150,
        description: 'Test Payment'
      };

      db.getPool().query.mockRejectedValueOnce(new Error('Database insert failed'));

      // Act
      const response = await request(app)
        .post('/api/payments')
        .send(validPayment)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Internal Server Error');
    });
  });

  // Test Case 3: Edge Cases and Data Validation
  describe('Payment Data Validation and Edge Cases', () => {
    test('should handle negative payment amounts', async () => {
      // Arrange
      const negativePayment = {
        amount: -50.00,
        userId: 123,
        description: 'Refund Payment'
      };

      db.getPool().query.mockResolvedValueOnce({ rows: [] });

      // Act
      const response = await request(app)
        .post('/api/payments')
        .send(negativePayment)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(db.getPool().query).toHaveBeenCalledWith(
        expect.any(String),
        [-50.00, 123, 'Refund Payment']
      );
    });

    test('should handle zero payment amounts', async () => {
      // Arrange
      const zeroPayment = {
        amount: 0.00,
        userId: 456,
        description: 'Zero Amount Test'
      };

      db.getPool().query.mockResolvedValueOnce({ rows: [] });

      // Act
      const response = await request(app)
        .post('/api/payments')
        .send(zeroPayment)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(db.getPool().query).toHaveBeenCalledWith(
        expect.any(String),
        [0.00, 456, 'Zero Amount Test']
      );
    });

    test('should handle large payment amounts', async () => {
      // Arrange
      const largePayment = {
        amount: 999999.99,
        userId: 789,
        description: 'Large Payment Test'
      };

      db.getPool().query.mockResolvedValueOnce({ rows: [] });

      // Act
      const response = await request(app)
        .post('/api/payments')
        .send(largePayment)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(db.getPool().query).toHaveBeenCalledWith(
        expect.any(String),
        [999999.99, 789, 'Large Payment Test']
      );
    });

    test('should handle long description strings', async () => {
      // Arrange
      const longDescription = 'A'.repeat(500); // 500 character description
      const paymentWithLongDesc = {
        amount: 125.75,
        userId: 321,
        description: longDescription
      };

      db.getPool().query.mockResolvedValueOnce({ rows: [] });

      // Act
      const response = await request(app)
        .post('/api/payments')
        .send(paymentWithLongDesc)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(db.getPool().query).toHaveBeenCalledWith(
        expect.any(String),
        [125.75, 321, longDescription]
      );
    });

    test('should handle special characters in description', async () => {
      // Arrange
      const specialCharPayment = {
        amount: 99.99,
        userId: 654,
        description: 'Pago con carácteres especiales: áéíóú ñ @#$%^&*()'
      };

      db.getPool().query.mockResolvedValueOnce({ rows: [] });

      // Act
      const response = await request(app)
        .post('/api/payments')
        .send(specialCharPayment)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Payment created successfully');
    });
  });
});
