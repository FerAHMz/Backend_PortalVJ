const request = require('supertest');
const express = require('express');
const messageRoutes = require('../routes/messageRoutes');
const { verifyToken: _verifyToken } = require('../middlewares/authMiddleware');
const db = require('../database_cn');

// Mock the database
jest.mock('../database_cn');

// Create test app
const app = express();
app.use(express.json());

// Mock verifyToken middleware for testing
app.use('/api/messages', (req, res, next) => {
  // Mock user data
  req.user = {
    id: 1,
    rol: 'Maestro',
    role: 'Maestro'
  };
  next();
}, messageRoutes);

describe('Message API Tests', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    db.getPool = jest.fn().mockReturnValue({
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn()
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/messages/conversations', () => {
    it('should fetch conversations successfully', async () => {
      const mockConversations = [
        {
          subject: 'Test Subject',
          sender_id: 2,
          sender_role: 'Padre',
          recipient_id: 1,
          recipient_role: 'Maestro',
          content: 'Test message content',
          created_at: new Date(),
          read: false,
          sender_name: 'John',
          sender_lastname: 'Doe'
        }
      ];

      mockClient.query.mockResolvedValue({ rows: mockConversations });

      const response = await request(app)
        .get('/api/messages/conversations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.conversations).toEqual(mockConversations);
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/messages/conversations')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Error fetching conversations');
    });
  });

  describe('GET /api/messages/conversation', () => {
    it('should fetch conversation messages successfully', async () => {
      const mockMessages = [
        {
          id: 1,
          subject: 'Test Subject',
          sender_id: 1,
          sender_role: 'Maestro',
          recipient_id: 2,
          recipient_role: 'Padre',
          content: 'Hello',
          created_at: new Date(),
          read: true,
          sender_nombre: 'Jane',
          sender_apellido: 'Smith'
        },
        {
          id: 2,
          subject: 'Test Subject',
          sender_id: 2,
          sender_role: 'Padre',
          recipient_id: 1,
          recipient_role: 'Maestro',
          content: 'Hi there',
          created_at: new Date(),
          read: false,
          sender_nombre: 'John',
          sender_apellido: 'Doe'
        }
      ];

      // First call for getting messages, second call for marking as read
      mockClient.query
        .mockResolvedValueOnce({ rows: mockMessages })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/messages/conversation')
        .query({ subject: 'Test Subject' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.messages).toEqual(mockMessages);
      expect(mockClient.query).toHaveBeenCalledTimes(2); // One for messages, one for marking as read
    });

    it('should require subject parameter', async () => {
      const response = await request(app)
        .get('/api/messages/conversation')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('POST /api/messages', () => {
    it('should send a new message successfully', async () => {
      const newMessage = {
        recipient_id: 2,
        recipient_role: 'Padre',
        subject: 'New Subject',
        content: 'New message content'
      };

      const mockInsertResult = {
        rows: [{
          id: 1,
          sender_id: 1,
          sender_role: 'Maestro',
          ...newMessage,
          created_at: new Date(),
          read: false
        }]
      };

      mockClient.query.mockResolvedValue(mockInsertResult);

      const response = await request(app)
        .post('/api/messages')
        .send(newMessage)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toEqual(mockInsertResult.rows[0]);
    });

    it('should validate required fields', async () => {
      const incompleteMessage = {
        recipient_id: 2,
        subject: 'Test Subject'
        // Missing content and recipient_role
      };

      const response = await request(app)
        .post('/api/messages')
        .send(incompleteMessage)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('GET /api/messages/search-users', () => {
    it('should search users successfully', async () => {
      const mockUsers = [
        {
          id: 2,
          nombre: 'John',
          apellido: 'Doe',
          rol: 'Padre',
          email: 'john.doe@example.com'
        },
        {
          id: 3,
          nombre: 'Jane',
          apellido: 'Smith',
          rol: 'Maestro',
          email: 'jane.smith@example.com'
        }
      ];

      mockClient.query.mockResolvedValue({ rows: mockUsers });

      const response = await request(app)
        .get('/api/messages/search-users')
        .query({ query: 'John' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toEqual(mockUsers);
    });

    it('should return empty array for short queries', async () => {
      const response = await request(app)
        .get('/api/messages/search-users')
        .query({ query: 'J' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toEqual([]);
    });
  });

  describe('PATCH /api/messages/:messageId/read', () => {
    it('should mark message as read successfully', async () => {
      const mockUpdatedMessage = {
        id: 1,
        sender_id: 2,
        sender_role: 'Padre',
        recipient_id: 1,
        recipient_role: 'Maestro',
        subject: 'Test Subject',
        content: 'Test content',
        created_at: new Date(),
        read: true
      };

      mockClient.query.mockResolvedValue({ rows: [mockUpdatedMessage] });

      const response = await request(app)
        .patch('/api/messages/1/read')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toEqual(mockUpdatedMessage);
    });

    it('should handle non-existent messages', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .patch('/api/messages/999/read')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });
});
