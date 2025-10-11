const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');
const {
  getAllUsers,
  createUser,
  deleteUser
} = require('../controllers/userController');

// Get all users
router.get('/', verifyToken, isAdmin, getAllUsers);

// Create new user  
router.post('/', verifyToken, isAdmin, createUser);

// Delete user
router.delete('/:id', verifyToken, isAdmin, deleteUser);

module.exports = router;