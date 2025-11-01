const express = require('express');
const router = express.Router();
const { verifyToken, isDirector } = require('../middlewares/authMiddleware');
const {
  getGradosDelDirector,
  getCursosPorGrado,
  getAllTeachers,
  getAllStudents,
  getAllParents,
  createTeacher,
  updateTeacher,
  activateTeacher,
  deactivateTeacher,
  getAcademicReport,
  getAttendanceReport,
  getPlanningReport,
  getAcademicStatistics,
  getAttendanceStatistics,
  getPlanningStatistics
} = require('../controllers/directorController');

const {
  getPlanningObservations,
  createPlanningObservation,
  updatePlanningObservation,
  deletePlanningObservation,
  updatePlanningEstado,
  getPlanificationFiles,
  downloadPlanificationFile
} = require('../controllers/coursePlanningController');

router.get('/grados', verifyToken, isDirector, getGradosDelDirector);
router.get('/grados/:gradoId/cursos', verifyToken, isDirector, getCursosPorGrado);

// Staff Management Routes
router.get('/teachers', verifyToken, isDirector, getAllTeachers);
router.get('/students', verifyToken, isDirector, getAllStudents);
router.get('/parents', verifyToken, isDirector, getAllParents);
router.post('/teachers', verifyToken, isDirector, createTeacher);
router.put('/teachers/:id', verifyToken, isDirector, updateTeacher);
router.patch('/teachers/:id/activate', verifyToken, isDirector, activateTeacher);
router.patch('/teachers/:id/deactivate', verifyToken, isDirector, deactivateTeacher);

// Report Routes for PDF generation
router.get('/reports/academic', verifyToken, isDirector, getAcademicReport);
router.get('/reports/attendance', verifyToken, isDirector, getAttendanceReport);
router.get('/reports/planning', verifyToken, isDirector, getPlanningReport);

// Statistics Routes (existing)
router.get('/statistics/academic', verifyToken, isDirector, getAcademicStatistics);
router.get('/statistics/attendance', verifyToken, isDirector, getAttendanceStatistics);
router.get('/statistics/planning', verifyToken, isDirector, getPlanningStatistics);

// Crud de observaciones de planificación

router.get('/courses/:courseId/planning/:planId/observations', verifyToken, getPlanningObservations);
router.post('/courses/:courseId/planning/:planId/observations', verifyToken, createPlanningObservation);
router.put('/courses/:courseId/planning/:planId/observations/:id', verifyToken, updatePlanningObservation);
router.delete('/courses/:courseId/planning/:planId/observations/:id', verifyToken, deletePlanningObservation);

// Ruta para actualizar el estado de una planificación
router.put('/courses/:courseId/planning/:planId/estado', verifyToken, isDirector, updatePlanningEstado);

// 📁 File Routes for Planifications (Director access)
// Get all files for a planification
router.get('/planning/:planificationId/files', verifyToken, isDirector, getPlanificationFiles);

// Download/Get download URL for a specific file
router.get('/planning/files/:fileId/download', verifyToken, isDirector, downloadPlanificationFile);

module.exports = router;
