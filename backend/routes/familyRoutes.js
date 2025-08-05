const express = require('express');
const router = express.Router();
const { verifyToken, isSup } = require('../middlewares/authMiddleware');
const {
  getAllFamilies,
  getAvailableParents,
  getAvailableStudents,
  getStudentsByParent,
  createFamily,
  deleteFamily,
  updateFamily,
  getFamilyStatistics
} = require('../controllers/familyController');

// Todas las rutas requieren autenticación de superusuario
router.use(verifyToken, isSup);

// Obtener todas las familias
router.get('/', getAllFamilies);

// Obtener padres disponibles
router.get('/parents/available', getAvailableParents);

// Obtener estudiantes disponibles (sin padre asignado)
router.get('/students/available', getAvailableStudents);

// Obtener hijos de un padre específico
router.get('/parent/:parentId/students', getStudentsByParent);

// Obtener estadísticas de familias
router.get('/statistics', getFamilyStatistics);

// Crear nueva relación familiar
router.post('/', createFamily);

// Actualizar relación familiar
router.put('/:id', updateFamily);

// Eliminar relación familiar
router.delete('/:id', deleteFamily);

module.exports = router;
