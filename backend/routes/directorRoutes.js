const express = require('express');
const router = express.Router();
const { verifyToken, isDirector } = require('../middlewares/authMiddleware');
const {
    getGradosDelDirector,
    getCursosPorGrado
} = require('../controllers/directorController');

const {
    getPlanningObservations,
    createPlanningObservation,
    updatePlanningObservation,
    deletePlanningObservation,
    updatePlanningEstado
} = require('../controllers/coursePlanningController');

router.get('/grados', verifyToken, isDirector, getGradosDelDirector);
router.get('/grados/:gradoId/cursos', verifyToken, isDirector, getCursosPorGrado);

// Crud de observaciones de planificación

router.get('/courses/:courseId/planning/:planId/observations', verifyToken, getPlanningObservations);
router.post('/courses/:courseId/planning/:planId/observations', verifyToken, createPlanningObservation);
router.put('/courses/:courseId/planning/:planId/observations/:id', verifyToken, updatePlanningObservation);
router.delete('/courses/:courseId/planning/:planId/observations/:id', verifyToken, deletePlanningObservation);

// Ruta para actualizar el estado de una planificación
router.put('/courses/:courseId/planning/:planId/estado', verifyToken, isDirector, updatePlanningEstado);

module.exports = router;