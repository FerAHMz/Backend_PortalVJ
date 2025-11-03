/**
 * Rutas para el sistema de promoción de estudiantes
 */
const express = require('express');
const router = express.Router();
const gradePromotionController = require('../controllers/gradePromotionController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

/**
 * GET /api/promotions/simulate
 * Simular promociones sin ejecutar cambios
 * Query params: trimestreId (required), notaMinima (optional, default 60)
 */
router.get('/simulate', gradePromotionController.simularPromociones);

/**
 * POST /api/promotions/execute
 * Ejecutar promociones reales con auditoría
 * Body: { trimestreId, cicloEscolar, notaMinima?, observaciones? }
 * Solo directores y super usuarios
 */
router.post('/execute', gradePromotionController.ejecutarPromociones);

/**
 * GET /api/promotions/students/status
 * Obtener estado actual de estudiantes con sus promedios
 * Query params: grado (optional)
 */
router.get('/students/status', gradePromotionController.obtenerEstadoEstudiantes);

/**
 * GET /api/promotions/history
 * Obtener historial de promociones
 * Query params: cicloEscolar?, trimestreId?, estadoPromocion?, limit?, offset?
 */
router.get('/history', gradePromotionController.obtenerHistorialPromociones);

/**
 * GET /api/promotions/students/:carnetEstudiante/average
 * Obtener promedios detallados de un estudiante específico
 * Params: carnetEstudiante
 * Query params: trimestreId (optional)
 */
router.get('/students/:carnetEstudiante/average', gradePromotionController.obtenerPromedioPorEstudiante);

module.exports = router;