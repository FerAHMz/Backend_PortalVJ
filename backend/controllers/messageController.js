const db = require('../database_cn');

// List conversations for a user
exports.getConversations = async (req, res) => {
  const { id, rol } = req.user; // Extract user ID and role from the token
  let client;

  try {
    client = await db.getPool().connect();

    // Get all conversations where user is either sender or recipient
    // Group by subject and get the latest message for each conversation
    const query = `
      WITH user_messages AS (
        SELECT m.*, 
               COALESCE(ms.nombre, ps.nombre) as sender_name,
               COALESCE(ms.apellido, ps.apellido) as sender_lastname,
               COALESCE(mr.nombre, pr.nombre) as recipient_name,
               COALESCE(mr.apellido, pr.apellido) as recipient_lastname
        FROM messages m
        LEFT JOIN maestros ms ON (m.sender_id = ms.id AND m.sender_role = 'Maestro')
        LEFT JOIN padres ps ON (m.sender_id = ps.id AND m.sender_role = 'Padre')
        LEFT JOIN maestros mr ON (m.recipient_id = mr.id AND m.recipient_role = 'Maestro')
        LEFT JOIN padres pr ON (m.recipient_id = pr.id AND m.recipient_role = 'Padre')
        WHERE (m.sender_id = $1 AND m.sender_role = $2) 
           OR (m.recipient_id = $1 AND m.recipient_role = $2)
      ),
      latest_messages AS (
        SELECT DISTINCT ON (subject) 
               subject, sender_id, sender_role, recipient_id, recipient_role, 
               content, created_at, read, sender_name, sender_lastname, 
               recipient_name, recipient_lastname
        FROM user_messages
        ORDER BY subject, created_at DESC
      )
      SELECT * FROM latest_messages
      ORDER BY created_at DESC
    `;

    const result = await client.query(query, [id, rol]);

    res.json({ success: true, conversations: result.rows });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ success: false, error: 'Error fetching conversations' });
  } finally {
    if (client) client.release();
  }
};

// Get all messages in a conversation
exports.getConversationMessages = async (req, res) => {
  const { subject } = req.query;
  const userId = req.user.id;
  const userRole = req.user.rol;

  if (!subject) {
    return res.status(400).json({
      success: false,
      error: 'Subject parameter is required'
    });
  }

  let client;

  try {
    client = await db.getPool().connect();

    const query = `
      SELECT m.id, m.sender_id, m.sender_role, m.recipient_id, m.recipient_role, 
             m.subject, m.content, m.created_at, m.read,
             COALESCE(ms.nombre, ps.nombre) as sender_nombre,
             COALESCE(ms.apellido, ps.apellido) as sender_apellido,
             COALESCE(mr.nombre, pr.nombre) as recipient_nombre,
             COALESCE(mr.apellido, pr.apellido) as recipient_apellido
      FROM messages m
      LEFT JOIN maestros ms ON (m.sender_id = ms.id AND m.sender_role = 'Maestro')
      LEFT JOIN padres ps ON (m.sender_id = ps.id AND m.sender_role = 'Padre')
      LEFT JOIN maestros mr ON (m.recipient_id = mr.id AND m.recipient_role = 'Maestro')
      LEFT JOIN padres pr ON (m.recipient_id = pr.id AND m.recipient_role = 'Padre')
      WHERE m.subject = $1 AND (
        (m.sender_id = $2 AND m.sender_role = $3) OR
        (m.recipient_id = $2 AND m.recipient_role = $3)
      )
      ORDER BY m.created_at ASC
    `;

    const result = await client.query(query, [subject, userId, userRole]);

    // Mark messages as read for the current user
    if (result.rows.length > 0) {
      const markReadQuery = `
        UPDATE messages 
        SET read = true 
        WHERE subject = $1 AND recipient_id = $2 AND recipient_role = $3 AND read = false
      `;
      await client.query(markReadQuery, [subject, userId, userRole]);
    }

    res.json({ success: true, messages: result.rows });
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    res.status(500).json({ success: false, error: 'Error fetching conversation messages' });
  } finally {
    if (client) client.release();
  }
};

// Add new function to search users
exports.searchUsers = async (req, res) => {
  const { query } = req.query;
  const { id: currentUserId, rol: currentUserRole } = req.user;
  let client;

  try {
    client = await db.getPool().connect();
    const searchQuery = `
      SELECT id, nombre, apellido, rol, email
      FROM (
        SELECT id, nombre, apellido, 'Maestro' as rol, email 
        FROM maestros 
        WHERE id != $1 AND activo = true
        UNION ALL
        SELECT id, nombre, apellido, 'Padre' as rol, email 
        FROM padres
        WHERE activo = true
      ) users
      WHERE (LOWER(nombre) LIKE LOWER($2) OR LOWER(apellido) LIKE LOWER($2))
      LIMIT 10
    `;

    const result = await client.query(searchQuery, [
      currentUserId,
      `%${query}%`
    ]);

    // Filter results based on role permissions
    const filteredUsers = result.rows.filter(user => {
      // Maestros can message Padres and other Maestros
      if (currentUserRole === 'Maestro') {
        return ['Padre', 'Maestro'].includes(user.rol);
      }
      // Padres can only message Maestros
      if (currentUserRole === 'Padre') {
        return user.rol === 'Maestro';
      }
      // Directors and Admins can message anyone
      if (['Director', 'Administrativo'].includes(currentUserRole)) {
        return true;
      }
      return false;
    });

    res.json({ success: true, users: filteredUsers });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ success: false, error: 'Error searching users' });
  } finally {
    if (client) client.release();
  }
};

// Send a new message
exports.sendMessage = async (req, res) => {
  const { recipient_id, recipient_role, subject, content } = req.body;
  const { id: sender_id, rol: sender_role } = req.user;
  let client;

  try {
    client = await db.getPool().connect();

    const query = `
      INSERT INTO messages 
      (sender_id, sender_role, recipient_id, recipient_role, subject, content)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await client.query(query, [
      sender_id,
      sender_role,
      recipient_id,
      recipient_role,
      subject,
      content
    ]);

    res.json({ success: true, message: result.rows[0] });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, error: 'Error sending message' });
  } finally {
    if (client) client.release();
  }
};

// Mark a message as read
exports.markAsRead = async (req, res) => {
  const { messageId } = req.params;
  const { id: userId, rol: userRole } = req.user;
  let client;

  try {
    client = await db.getPool().connect();

    // Only mark as read if the user is the recipient
    const query = `
      UPDATE messages
      SET read = true
      WHERE id = $1 AND recipient_id = $2 AND recipient_role = $3
      RETURNING *
    `;

    const result = await client.query(query, [messageId, userId, userRole]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Message not found or unauthorized' });
    }

    res.json({ success: true, message: result.rows[0] });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ success: false, error: 'Error marking message as read' });
  } finally {
    if (client) client.release();
  }
};

// Get messages for a user
exports.getMessages = async (req, res) => {
  const { id: userId, rol: userRole } = req.user;
  let client;

  try {
    client = await db.getPool().connect();

    // Only get messages where user is sender or recipient
    const query = `
      SELECT 
        id, sender_id, sender_role, recipient_id, recipient_role,
        subject, content, created_at, read
      FROM messages
      WHERE (sender_id = $1 AND sender_role = $2)
         OR (recipient_id = $1 AND recipient_role = $2)
      ORDER BY created_at DESC
    `;

    const result = await client.query(query, [userId, userRole]);
    res.json({ success: true, messages: result.rows });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, error: 'Error fetching messages' });
  } finally {
    if (client) client.release();
  }
};

// Get a specific conversation
exports.getConversation = async (req, res) => {
  const { id: userId, rol: userRole } = req.user;
  const { conversationId } = req.params;
  let client;

  try {
    client = await db.getPool().connect();

    // Verify user is part of conversation
    const query = `
      SELECT * FROM messages 
      WHERE id = $1 
      AND (
        (sender_id = $2 AND sender_role = $3) OR 
        (recipient_id = $2 AND recipient_role = $3)
      )
    `;

    const result = await client.query(query, [conversationId, userId, userRole]);

    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para ver esta conversación'
      });
    }

    res.json({ success: true, conversation: result.rows });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ success: false, error: 'Error fetching conversation' });
  } finally {
    if (client) client.release();
  }
};
