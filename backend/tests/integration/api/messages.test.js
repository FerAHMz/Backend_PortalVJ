const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../../../app');
const jwt = require('jsonwebtoken');

chai.use(chaiHttp);
const expect = chai.expect;

describe('Messaging System Integration Tests', function() {
  let teacherToken;
  let parentToken;
  let testTeacher;
  let testParent;
  let conversationId;

  beforeAll(async () => {
    jest.setTimeout(10000);

    // Create test teacher
    testTeacher = await global.createTestUser({
      email: 'teacher.msg@portalvj.com',
      rol: 3, // Teacher role
      nombre: 'Teacher',
      apellido: 'Messages'
    });

    // Create test parent
    testParent = await global.createTestUser({
      email: 'parent.msg@portalvj.com',
      rol: 4, // Parent role
      nombre: 'Parent',
      apellido: 'Messages'
    });

    // Generate tokens
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
  });

  describe('Message Creation and Sending', function() {
    it('should allow teacher to send message to parent', function(done) {
      const messageData = {
        recipient_id: testParent.id,
        recipient_role: 'Padre',
        subject: 'Progreso del estudiante',
        message: 'Su hijo ha mostrado excelente progreso en matemáticas.',
        priority: 'normal'
      };

      chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(messageData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('message');
          expect(res.body.message).to.have.property('id');
          expect(res.body.message).to.have.property('subject', messageData.subject);
          expect(res.body.message).to.have.property('sender_id', testTeacher.id);
          expect(res.body.message).to.have.property('recipient_id', testParent.id);

          conversationId = res.body.message.conversation_id;
          done();
        });
    });

    it('should allow parent to reply to teacher', function(done) {
      const replyData = {
        recipient_id: testTeacher.id,
        recipient_role: 'Maestro',
        subject: 'Re: Progreso del estudiante',
        message: 'Gracias por la información. Me alegra saber del progreso.',
        priority: 'normal',
        conversation_id: conversationId
      };

      chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${parentToken}`)
        .send(replyData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('message');
          expect(res.body.message).to.have.property('conversation_id', conversationId);
          done();
        });
    });

    it('should validate message content is not empty', function(done) {
      const invalidMessage = {
        recipient_id: testParent.id,
        recipient_role: 'Padre',
        subject: 'Test',
        message: '', // Empty message
        priority: 'normal'
      };

      chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(invalidMessage)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('success', false);
          expect(res.body).to.have.property('error');
          done();
        });
    });

    it('should validate recipient exists', function(done) {
      const messageData = {
        recipient_id: 99999, // Non-existent recipient
        recipient_role: 'Padre',
        subject: 'Test Message',
        message: 'This should fail',
        priority: 'normal'
      };

      chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(messageData)
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body).to.have.property('success', false);
          done();
        });
    });

    it('should prevent messaging between unauthorized roles', function(done) {
      // Try to create a superuser token
      const supToken = jwt.sign(
        { id: 1, email: 'sup@test.com', rol: 'SUP' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const messageData = {
        recipient_id: testParent.id,
        recipient_role: 'Padre',
        subject: 'Unauthorized message',
        message: 'This should not be allowed',
        priority: 'normal'
      };

      chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${supToken}`)
        .send(messageData)
        .end((err, res) => {
          expect(res).to.have.status(403);
          expect(res.body).to.have.property('success', false);
          done();
        });
    });
  });

  describe('Message Retrieval and Conversations', function() {
    it('should retrieve all conversations for teacher', function(done) {
      chai.request(app)
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${teacherToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('conversations');
          expect(res.body.conversations).to.be.an('array');
          expect(res.body.conversations.length).to.be.at.least(1);
          done();
        });
    });

    it('should retrieve all conversations for parent', function(done) {
      chai.request(app)
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${parentToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('conversations');
          expect(res.body.conversations).to.be.an('array');
          expect(res.body.conversations.length).to.be.at.least(1);
          done();
        });
    });

    it('should retrieve messages in a specific conversation', function(done) {
      chai.request(app)
        .get(`/api/messages/conversation/${conversationId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('messages');
          expect(res.body.messages).to.be.an('array');
          expect(res.body.messages.length).to.be.at.least(2); // Original message + reply
          done();
        });
    });

    it('should retrieve unread messages count', function(done) {
      chai.request(app)
        .get('/api/messages/unread/count')
        .set('Authorization', `Bearer ${parentToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('count');
          expect(res.body.count).to.be.a('number');
          done();
        });
    });

    it('should retrieve unread messages list', function(done) {
      chai.request(app)
        .get('/api/messages/unread')
        .set('Authorization', `Bearer ${parentToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('messages');
          expect(res.body.messages).to.be.an('array');
          done();
        });
    });

    it('should prevent access to unauthorized conversation', function(done) {
      // Create another user's conversation ID (simulated)
      const unauthorizedConversationId = conversationId + 'unauthorized';

      chai.request(app)
        .get(`/api/messages/conversation/${unauthorizedConversationId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .end((err, res) => {
          expect(res).to.have.status(403);
          expect(res.body).to.have.property('success', false);
          done();
        });
    });
  });

  describe('Message Status Management', function() {
    let messageId;

    beforeAll(async () => {
      // Create a test message to work with
      const messageQuery = `
        INSERT INTO Mensajes (sender_id, sender_role, recipient_id, recipient_role, subject, message, conversation_id, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *
      `;
      const result = await global.testDb.query(messageQuery, [
        testTeacher.id, 'Maestro', testParent.id, 'Padre',
        'Test Status Message', 'This is a test message for status testing',
        conversationId, false
      ]);
      messageId = result.rows[0].id;
    });

    it('should mark message as read', function(done) {
      chai.request(app)
        .put(`/api/messages/${messageId}/read`)
        .set('Authorization', `Bearer ${parentToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('message', 'Message marked as read');
          done();
        });
    });

    it('should mark message as unread', function(done) {
      chai.request(app)
        .put(`/api/messages/${messageId}/unread`)
        .set('Authorization', `Bearer ${parentToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('message', 'Message marked as unread');
          done();
        });
    });

    it('should mark all messages in conversation as read', function(done) {
      chai.request(app)
        .put(`/api/messages/conversation/${conversationId}/read`)
        .set('Authorization', `Bearer ${parentToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('message');
          done();
        });
    });

    it('should prevent unauthorized status changes', function(done) {
      chai.request(app)
        .put(`/api/messages/${messageId}/read`)
        .set('Authorization', `Bearer ${teacherToken}`) // Teacher trying to mark parent's message
        .end((err, res) => {
          expect(res).to.have.status(403);
          expect(res.body).to.have.property('success', false);
          done();
        });
    });
  });

  describe('Message Search and Filtering', function() {
    it('should search messages by subject', function(done) {
      chai.request(app)
        .get('/api/messages/search')
        .set('Authorization', `Bearer ${teacherToken}`)
        .query({ subject: 'Progreso' })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('messages');
          expect(res.body.messages).to.be.an('array');
          done();
        });
    });

    it('should search messages by content', function(done) {
      chai.request(app)
        .get('/api/messages/search')
        .set('Authorization', `Bearer ${parentToken}`)
        .query({ content: 'matemáticas' })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('messages');
          expect(res.body.messages).to.be.an('array');
          done();
        });
    });

    it('should filter messages by priority', function(done) {
      chai.request(app)
        .get('/api/messages/filter')
        .set('Authorization', `Bearer ${teacherToken}`)
        .query({ priority: 'normal' })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('messages');
          expect(res.body.messages).to.be.an('array');
          done();
        });
    });

    it('should filter messages by date range', function(done) {
      const today = new Date().toISOString().split('T')[0];

      chai.request(app)
        .get('/api/messages/filter')
        .set('Authorization', `Bearer ${parentToken}`)
        .query({
          startDate: today,
          endDate: today
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('messages');
          expect(res.body.messages).to.be.an('array');
          done();
        });
    });
  });

  describe('Message Deletion and Archive', function() {
    let testMessageId;

    beforeAll(async () => {
      // Create a message for deletion testing
      const messageQuery = `
        INSERT INTO Mensajes (sender_id, sender_role, recipient_id, recipient_role, subject, message, conversation_id, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *
      `;
      const result = await global.testDb.query(messageQuery, [
        testTeacher.id, 'Maestro', testParent.id, 'Padre',
        'Message for Deletion', 'This message will be deleted',
        conversationId, false
      ]);
      testMessageId = result.rows[0].id;
    });

    it('should soft delete a message', function(done) {
      chai.request(app)
        .delete(`/api/messages/${testMessageId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('message', 'Message deleted successfully');
          done();
        });
    });

    it('should not retrieve deleted message', function(done) {
      chai.request(app)
        .get(`/api/messages/${testMessageId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body).to.have.property('success', false);
          done();
        });
    });

    it('should archive a conversation', function(done) {
      chai.request(app)
        .put(`/api/messages/conversation/${conversationId}/archive`)
        .set('Authorization', `Bearer ${parentToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('message');
          done();
        });
    });

    it('should prevent unauthorized deletion', function(done) {
      chai.request(app)
        .delete(`/api/messages/${testMessageId}`)
        .set('Authorization', `Bearer ${parentToken}`) // Parent trying to delete teacher's message
        .end((err, res) => {
          expect(res).to.have.status(403);
          expect(res.body).to.have.property('success', false);
          done();
        });
    });
  });
});
