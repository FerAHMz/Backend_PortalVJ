const express = require('express');
const router = express.Router();
const { 
    getAllUsers, 
    createUser, 
    updateUser, 
    deleteUser,
    activateUser 
} = require('../controllers/userController');
const { verifyToken, isSup } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, isSup, getAllUsers);
router.post('/', verifyToken, isSup, createUser);
router.put('/:id', verifyToken, isSup, updateUser);
router.put('/:id/activate', verifyToken, isSup, activateUser);
router.delete('/:id', verifyToken, isSup, deleteUser);

module.exports = router;