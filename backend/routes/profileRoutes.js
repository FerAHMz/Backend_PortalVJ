const express = require('express');
const router = express.Router();
const { getUserProfile } = require('../controllers/userController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Route to get current user's profile
router.get('/profile', verifyToken, getUserProfile);

module.exports = router;
