const db = require('../database_cn');

// Create a new payment
const createPayment = async (req, res) => {
  const { amount, userId, description } = req.body;

  if (!amount || !userId || !description) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    await db.getPool().query(
      `INSERT INTO payments (amount, user_id, description, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [amount, userId, description]
    );
    res.status(201).json({ success: true, message: 'Payment created successfully' });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// Fetch all payments
const getPayments = async (req, res) => {
  try {
    const result = await db.getPool().query(`SELECT * FROM payments ORDER BY created_at DESC`);
    res.json({ success: true, payments: result.rows });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

module.exports = {
  createPayment,
  getPayments,
};
