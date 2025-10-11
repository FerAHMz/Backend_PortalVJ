const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const messageController = require('../controllers/messageController');
const db = require('../database_cn');

// Protect all message routes
router.use(verifyToken);

// Role validation middleware
const validateMessageRole = async (req, res, next) => {
  try {
    const { rol: userRole } = req.user;

    if (!userRole) {
      return res.status(403).json({
        success: false,
        error: 'No se pudo verificar el rol del usuario'
      });
    }

    const allowedRoles = ['Maestro', 'Padre', 'Administrativo', 'Director'];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `Rol no válido para el sistema de mensajes: ${userRole}`
      });
    }

    next();
  } catch (error) {
    console.error('Error in validateMessageRole:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al verificar permisos'
    });
  }
};

// Get all conversations for the authenticated user
router.get('/conversations', validateMessageRole, messageController.getConversations);

// Get messages in a specific conversation
router.get('/conversation', validateMessageRole, messageController.getConversationMessages);

// Send a new message
router.post('/', validateMessageRole, messageController.sendMessage);

// Add message to existing conversation
router.post('/conversation', validateMessageRole, async (req, res) => {
  const { subject, content } = req.body;
  const { id: senderId, rol: senderRole } = req.user;

  if (!subject || !content) {
    return res.status(400).json({
      success: false,
      error: 'Subject and content are required'
    });
  }

  try {
    // Get the last message in the conversation to determine recipient
    const lastMessageQuery = `
      SELECT sender_id, sender_role, recipient_id, recipient_role
      FROM messages
      WHERE subject = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const lastMessageResult = await db.getPool().query(lastMessageQuery, [subject]);

    if (!lastMessageResult || lastMessageResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    const lastMessage = lastMessageResult.rows[0];

    // Determine recipient based on who the current user is
    let recipientId, recipientRole;
    if (senderId === lastMessage.sender_id && senderRole === lastMessage.sender_role) {
      recipientId = lastMessage.recipient_id;
      recipientRole = lastMessage.recipient_role;
    } else {
      recipientId = lastMessage.sender_id;
      recipientRole = lastMessage.sender_role;
    }

    // Send the message using the controller
    req.body = {
      recipient_id: recipientId,
      recipient_role: recipientRole,
      subject,
      content
    };

    return messageController.sendMessage(req, res);
  } catch (error) {
    console.error('Error adding message to conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Error al agregar mensaje a la conversación'
    });
  }
});

// Search users
router.get('/search-users', validateMessageRole, messageController.searchUsers);

// Mark message as read
router.patch('/:messageId/read', validateMessageRole, messageController.markAsRead);

// Get all messages for user (for compatibility)
router.get('/messages', validateMessageRole, messageController.getMessages);

// Alias for conversations (for compatibility)
router.get('/', validateMessageRole, messageController.getConversations);

module.exports = router;
