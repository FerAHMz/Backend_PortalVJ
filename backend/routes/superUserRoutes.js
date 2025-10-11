const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  activateUser
} = require('../controllers/userController');
const inscripcionController = require('../controllers/inscripcionController');
const { verifyToken, isSup } = require('../middlewares/authMiddleware');

// Rutas de usuarios
router.get('/', verifyToken, isSup, getAllUsers);
router.post('/', verifyToken, isSup, createUser);
router.put('/:id', verifyToken, isSup, updateUser);
router.put('/:id/activate', verifyToken, isSup, activateUser);
router.delete('/:id', verifyToken, isSup, deleteUser);

// Rutas para gestión de inscripciones
// Obtener grados y secciones disponibles
router.get('/grados-secciones', verifyToken, isSup, inscripcionController.getGradosYSecciones);

// CRUD de inscripciones
router.get('/inscripciones', verifyToken, isSup, inscripcionController.getInscripciones);
router.get('/inscripciones/:id', verifyToken, isSup, inscripcionController.getInscripcionById);
router.post('/inscripciones', verifyToken, isSup, inscripcionController.createInscripcion);
router.put('/inscripciones/:id', verifyToken, isSup, inscripcionController.updateInscripcion);
router.delete('/inscripciones/:id', verifyToken, isSup, inscripcionController.deleteInscripcion);

// Convertir inscripción a estudiante activo
router.post('/inscripciones/:id/convertir-estudiante', verifyToken, isSup, inscripcionController.convertirAEstudiante);

// Carga masiva de inscripciones desde Excel
router.post('/inscripciones/upload-excel', verifyToken, isSup, inscripcionController.uploadMiddleware, inscripcionController.processExcelFile);

module.exports = router;
