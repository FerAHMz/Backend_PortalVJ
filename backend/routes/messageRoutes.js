const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const db = require('../database_cn');
const messageController = require('../controllers/messageController');

// Protect all message routes
router.use(verifyToken);

const verifyMessageAccess = async (req, res, next) => {
  try {
    const { id: userId, rol: userRole } = req.user;
    console.log('User from request:', req.user); // Debug log

    if (!userRole) {
      console.log('No user role found in request'); // Debug log
      return res.status(403).json({
        success: false,
        error: 'No se pudo verificar el rol del usuario'
      });
    }

    // Normalize roles
    const normalizeRole = (role) => {
      if (!role) return '';
      role = role.toString().toLowerCase();
      // Map numeric roles if needed
      const roleMap = {
        '3': 'maestro',
        '4': 'padre'
        // Add other role mappings if needed
      };
      return roleMap[role] || role;
    };

    const senderRole = normalizeRole(userRole);
    const recipientRole = normalizeRole(req.body.recipient_role);

    console.log('Normalized roles:', { senderRole, recipientRole }); // Debug log

    const allowedRoles = ['maestro', 'padre', 'administrativo', 'director'];

    if (!allowedRoles.includes(senderRole)) {
      console.log('Invalid sender role:', senderRole); // Debug log
      return res.status(403).json({
        success: false,
        error: `Rol de remitente no válido: ${senderRole}`
      });
    }

    if (recipientRole && !allowedRoles.includes(recipientRole)) {
      console.log('Invalid recipient role:', recipientRole); // Debug log
      return res.status(403).json({
        success: false,
        error: `Rol de destinatario no válido: ${recipientRole}`
      });
    }

    // Add the normalized roles to the request
    req.normalizedRoles = {
      senderRole,
      recipientRole
    };

    next();
  } catch (error) {
    console.error('Error in verifyMessageAccess:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al verificar permisos'
    });
  }
};


// Fetch all conversations for the authenticated user
router.get('/', verifyToken, async (req, res) => {
  const { id: userId, role: userRole } = req.user;

  try {
    const result = await db.getPool().query(
      `SELECT sender_id, sender_role, recipient_id, recipient_role, subject, content, created_at, read
       FROM messages
       WHERE (sender_id = $1 AND sender_role = $2)
          OR (recipient_id = $1 AND recipient_role = $2)
       ORDER BY created_at DESC`,
      [userId, userRole]
    );
    res.json({ success: true, conversations: result.rows });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.get('/conversation', verifyToken, async (req, res) => {
  const { subject } = req.query;
  const { id: userId, rol: userRole } = req.user;

  if (!subject) {
    return res.status(400).json({ success: false, error: 'Subject is required' });
  }

  try {
    // First, check if the conversation exists
    const conversationExists = await db.getPool().query(
      `SELECT COUNT(*) 
       FROM messages 
       WHERE subject = $1`,
      [subject]
    );

    if (parseInt(conversationExists.rows[0].count) === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Conversation not found',
        conversation: [] // Return empty array instead of 404
      });
    }

    // Get all messages in the conversation
    const result = await db.getPool().query(
      `SELECT m.*, 
              COALESCE(ms.nombre, ps.nombre) as sender_nombre,
              COALESCE(ms.apellido, ps.apellido) as sender_apellido,
              COALESCE(mr.nombre, pr.nombre) as recipient_nombre,
              COALESCE(mr.apellido, pr.apellido) as recipient_apellido
       FROM messages m
       LEFT JOIN maestros ms ON (m.sender_id = ms.id AND m.sender_role = 'Maestro')
       LEFT JOIN padres ps ON (m.sender_id = ps.id AND m.sender_role = 'Padre')
       LEFT JOIN maestros mr ON (m.recipient_id = mr.id AND m.recipient_role = 'Maestro')
       LEFT JOIN padres pr ON (m.recipient_id = pr.id AND m.recipient_role = 'Padre')
       WHERE m.subject = $1
         AND ((m.sender_id = $2 AND m.sender_role = $3)
           OR (m.recipient_id = $2 AND m.recipient_role = $3))
       ORDER BY m.created_at ASC`,
      [subject, userId, userRole]
    );

    res.json({ 
      success: true, 
      conversation: result.rows 
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal Server Error',
      details: error.message 
    });
  }
});

// Route to fetch messages for a user
router.get('/messages', verifyToken, async (req, res) => {
  try {
    await messageController.getMessages(req, res);
  } catch (error) {
    console.error('Error in /messages route:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/', verifyToken, verifyMessageAccess, async (req, res) => {
  try {
    const { id: senderId } = req.user;
    const { senderRole } = req.normalizedRoles;
    const { recipient_id, recipient_role, subject, content } = req.body;

    console.log('Creating message with:', {
      senderId,
      senderRole,
      recipient_id,
      recipient_role,
      subject
    });

    if (!recipient_id || !recipient_role || !subject || !content) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos son requeridos'
      });
    }

    const result = await db.getPool().query(
      `INSERT INTO messages 
       (sender_id, sender_role, recipient_id, recipient_role, subject, content, created_at, read)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), false)
       RETURNING *`,
      [senderId, senderRole, recipient_id, recipient_role, subject, content]
    );

    res.status(201).json({
      success: true,
      message: 'Mensaje enviado exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear el mensaje'
    });
  }
});


// Add a message to an existing conversation
router.post('/conversation', verifyToken, async (req, res) => {
  const { subject, content } = req.body;
  const { id: currentUserId, rol: currentUserRole } = req.user;

  if (!subject || !content) {
    return res.status(400).json({ success: false, error: 'Subject and content are required' });
  }

  try {
    const conversation = await db.getPool().query(
      `SELECT sender_id, sender_role, recipient_id, recipient_role
       FROM messages
       WHERE subject = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [subject]
    );

    if (conversation.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const lastMessage = conversation.rows[0];
    
    // Determine if current user was the sender or recipient of the last message
    let recipientId, recipientRole;
    if (currentUserId === lastMessage.sender_id && currentUserRole === lastMessage.sender_role) {
      recipientId = lastMessage.recipient_id;
      recipientRole = lastMessage.recipient_role;
    } else {
      recipientId = lastMessage.sender_id;
      recipientRole = lastMessage.sender_role;
    }

    const createdAt = new Date();
    await db.getPool().query(
      `INSERT INTO messages (sender_id, sender_role, recipient_id, recipient_role, subject, content, created_at, read)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [currentUserId, currentUserRole, recipientId, recipientRole, subject, content, createdAt, false]
    );

    res.status(201).json({ success: true, message: 'Message added to conversation successfully' });
  } catch (error) {
    console.error('Error adding message to conversation:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.get('/search-users', verifyToken, async (req, res) => {
  const { query } = req.query;
  const { id: currentUserId, rol: currentUserRole } = req.user;

  if (!query || query.length < 2) {
    return res.json({ success: true, users: [] });
  }

  try {
    const searchQuery = `
      SELECT id, nombre, apellido, rol, email
      FROM (
        SELECT id, nombre, apellido, 'Maestro' as rol, email 
        FROM maestros 
        WHERE (LOWER(nombre) LIKE LOWER($1) OR LOWER(apellido) LIKE LOWER($1))
        AND activo = true
        UNION ALL
        SELECT id, nombre, apellido, 'Padre' as rol, email 
        FROM padres
        WHERE (LOWER(nombre) LIKE LOWER($1) OR LOWER(apellido) LIKE LOWER($1))
        AND activo = true
      ) users
      WHERE users.id != $2
      LIMIT 10
    `;

    const result = await db.getPool().query(searchQuery, [
      `%${query}%`,
      currentUserId
    ]);

    // Filter results based on role permissions
    const filteredUsers = result.rows.filter(user => {
      // Convert roles to match the database values
      const currentRole = currentUserRole === 3 ? 'Maestro' : 'Padre';
      
      // Maestros can message Padres and other Maestros
      if (currentRole === 'Maestro') {
        return ['Padre', 'Maestro'].includes(user.rol);
      }
      // Padres can only message Maestros
      if (currentRole === 'Padre') {
        return user.rol === 'Maestro';
      }
      return false;
    });

    res.json({ success: true, users: filteredUsers });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ success: false, error: 'Error searching users' });
  }
});

// Mark a message as read
router.patch('/:messageId/read', messageController.markAsRead);

module.exports = router;
