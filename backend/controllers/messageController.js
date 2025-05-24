const db = require('../database_cn');

// List conversations for a user
exports.getConversations = async (req, res) => {
  const { id, rol } = req.user; // Extract user ID and role from the token
  let client;

  try {
    client = await db.getPool().connect();

    const query = `
      SELECT 
        DISTINCT ON (sender_id, sender_role) sender_id, sender_role, 
        recipient_id, recipient_role, subject, content, created_at, read
      FROM messages
      WHERE recipient_id = $1 AND recipient_role = $2
      ORDER BY sender_id, sender_role, created_at DESC
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
  const { otherId, otherRole, subject } = req.query;
  const userId = req.user.id;
  const userRole = req.user.rol;

  let client;

  try {
    client = await db.getPool().connect();

    const query = `
      SELECT id, sender_id, sender_role, recipient_id, recipient_role, subject, content, created_at, read
      FROM messages
      WHERE subject = $1 AND (
        (sender_id = $2 AND sender_role = $3 AND recipient_id = $4 AND recipient_role = $5) OR
        (sender_id = $4 AND sender_role = $5 AND recipient_id = $2 AND recipient_role = $3)
      )
      ORDER BY created_at ASC
    `;

    const result = await client.query(query, [subject, userId, userRole, otherId, otherRole]);

    res.json({ success: true, messages: result.rows });
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    res.status(500).json({ success: false, error: 'Error fetching conversation messages' });
  } finally {
    if (client) client.release();
  }
};

// Send a new message
exports.sendMessage = async (req, res) => {
  const userId = req.user.id;
  const role = req.user.rol;
  const { recipient_id, recipient_role, subject, content } = req.body;
  try {
    const result = await db.getPool().query(
      `INSERT INTO messages (sender_id, sender_role, recipient_id, recipient_role, subject, content)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, role, recipient_id, recipient_role, subject, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error sending message' });
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  const userId = req.user.id;
  const role = req.user.rol;
  const { conversationId } = req.body;
  try {
    await db.getPool().query(
      `UPDATE messages SET read = TRUE WHERE id = $1 AND recipient_id = $2 AND recipient_role = $3`,
      [conversationId, userId, role]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error marking as read' });
  }
};

// Get messages for a user
exports.getMessages = async (req, res) => {
  const { id, rol } = req.user; // Extract user ID and role from the token
  let client;

  try {
    client = await db.getPool().connect();

    const query = `
      SELECT 
        id, sender_id, sender_role, recipient_id, recipient_role, 
        subject, content, created_at, read
      FROM messages
      WHERE recipient_id = $1 AND recipient_role = $2
      ORDER BY created_at DESC
    `;

    const result = await client.query(query, [id, rol]);

    res.json({ success: true, messages: result.rows });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, error: 'Error fetching messages' });
  } finally {
    if (client) client.release();
  }
};
