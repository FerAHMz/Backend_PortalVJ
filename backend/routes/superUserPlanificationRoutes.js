const express = require('express');
const router = express.Router();
const { verifyToken, isSup } = require('../middlewares/authMiddleware');
const {
  getAllPlanificationsByGrade,
  getPlanificationDetailById,
  getPlanificationsStatistics,
  getPlanificationsBySpecificGrade
} = require('../controllers/superUserPlanificationController');

// All routes require superuser authentication
router.use(verifyToken, isSup);

// Get all planifications grouped by grade
router.get('/by-grade', getAllPlanificationsByGrade);

// Get planifications statistics 
router.get('/statistics', getPlanificationsStatistics);

// Get planifications by specific grade
router.get('/grade/:gradeId', getPlanificationsBySpecificGrade);

// Get detailed planification by ID
router.get('/:planificationId/detail', getPlanificationDetailById);

module.exports = router;
