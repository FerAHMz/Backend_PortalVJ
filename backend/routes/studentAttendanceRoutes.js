const express = require('express');
const { getStudentAttendance, getStudentAttendanceSummary } = require('../controllers/studentAttendanceController');
const { verifyToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(verifyToken);

// Ruta para obtener asistencia de un estudiante específico (para padres)
router.get('/:studentCarnet/attendance', getStudentAttendance);

// Ruta para obtener resumen de asistencia de un estudiante
router.get('/:studentCarnet/attendance/summary', getStudentAttendanceSummary);

module.exports = router;
