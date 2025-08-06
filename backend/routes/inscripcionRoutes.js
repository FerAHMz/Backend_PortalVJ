const express = require('express');
const router = express.Router();
const inscripcionController = require('../controllers/inscripcionController');
const authMiddleware = require('../middleware/authMiddleware');

// Middleware de autenticación para todas las rutas
router.use(authMiddleware);

// Ruta para obtener todas las inscripciones
router.get('/', inscripcionController.getInscripciones);

// Ruta para obtener una inscripción por ID
router.get('/:id', inscripcionController.getInscripcionById);

// Ruta para crear una nueva inscripción
router.post('/', inscripcionController.createInscripcion);

// Ruta para actualizar una inscripción
router.put('/:id', inscripcionController.updateInscripcion);

// Ruta para eliminar una inscripción (soft delete)
router.delete('/:id', inscripcionController.deleteInscripcion);

// Ruta para subir archivo Excel de inscripciones
router.post('/upload-excel', inscripcionController.uploadExcelInscripciones);

module.exports = router;
