const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const db = require('../database_cn');

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

// Fetch a specific conversation by subject for the authenticated user
router.get('/conversation', verifyToken, async (req, res) => {
  const { subject } = req.query;
  const { id: userId, role: userRole } = req.user;

  if (!subject) {
    return res.status(400).json({ success: false, error: 'Subject is required' });
  }

  try {
    const result = await db.getPool().query(
      `SELECT sender_id, sender_role, recipient_id, recipient_role, subject, content, created_at, read
       FROM messages
       WHERE subject = $1
         AND ((sender_id = $2 AND sender_role = $3)
           OR (recipient_id = $2 AND recipient_role = $3))`,
      [subject, userId, userRole]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Conversation not found or access denied' });
    }

    res.json({ success: true, conversation: result.rows });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
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

// Create a new message
router.post('/', async (req, res) => {
  const { userType, userId, userName, subject, content } = req.body;

  if (!userType || (!userId && !userName) || !subject || !content) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  if (!['maestro', 'padre'].includes(userType.toLowerCase())) {
    return res.status(400).json({ success: false, error: 'Invalid user type' });
  }

  try {
    let recipient;
    if (userId) {
      // Find recipient by ID
      const result = await db.getPool().query(
        `SELECT id, 'Maestro' AS role FROM maestros WHERE id = $1
         UNION ALL
         SELECT id, 'Padre' AS role FROM padres WHERE id = $1`,
        [userId]
      );
      recipient = result.rows[0];
    } else if (userName) {
      // Find recipient by name
      const [firstName, lastName] = userName.split(' ');
      const result = await db.getPool().query(
        `SELECT id, 'Maestro' AS role FROM maestros WHERE nombre = $1 AND apellido = $2
         UNION ALL
         SELECT id, 'Padre' AS role FROM padres WHERE nombre = $1 AND apellido = $2`,
        [firstName, lastName]
      );
      recipient = result.rows[0];
    }

    if (!recipient) {
      return res.status(404).json({ success: false, error: 'Recipient not found' });
    }

    // Insert the new message
    const senderId = 1; // Replace with the actual sender ID (e.g., from the authenticated user)
    const senderRole = 'Maestro'; // Replace with the actual sender role
    const createdAt = new Date();

    await db.getPool().query(
      `INSERT INTO messages (sender_id, sender_role, recipient_id, recipient_role, subject, content, created_at, read)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [senderId, senderRole, recipient.id, recipient.role, subject, content, createdAt, false]
    );

    res.status(201).json({ success: true, message: 'Message created successfully' });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Add a message to an existing conversation
router.post('/conversation', async (req, res) => {
  const { subject, content } = req.body;

  if (!subject || !content) {
    return res.status(400).json({ success: false, error: 'Subject and content are required' });
  }

  try {
    // Retrieve sender and recipient details from the existing conversation
    const conversation = await db.getPool().query(
      `SELECT sender_id, sender_role, recipient_id, recipient_role
       FROM messages
       WHERE subject = $1
       LIMIT 1`,
      [subject]
    );

    if (conversation.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const { sender_id, sender_role, recipient_id, recipient_role } = conversation.rows[0];

    // Validate roles
    if (!['Maestro', 'Padre'].includes(sender_role) || !['Maestro', 'Padre'].includes(recipient_role)) {
      return res.status(400).json({ success: false, error: 'Invalid roles in conversation' });
    }

    // Insert the new message into the database
    const createdAt = new Date();
    await db.getPool().query(
      `INSERT INTO messages (sender_id, sender_role, recipient_id, recipient_role, subject, content, created_at, read)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [sender_id, sender_role, recipient_id, recipient_role, subject, content, createdAt, false]
    );

    res.status(201).json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

module.exports = router;
