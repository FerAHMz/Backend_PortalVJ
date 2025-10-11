const express = require('express');
const router = express.Router();
const { verifyToken, isSup } = require('../middlewares/authMiddleware');
const {
  getAllPlanificationsByGrade,
  getPlanificationDetailById,
  getPlanificationsStatistics,
  getPlanificationsBySpecificGrade
} = require('../controllers/superUserPlanificationController');
const {
  getPlanificationFiles,
  downloadPlanificationFile
} = require('../controllers/coursePlanningController');

// All routes require superuser authentication
router.use(verifyToken, isSup);

// Get all planifications grouped by grade
router.get('/by-grade', getAllPlanificationsByGrade);

// Get planifications statistics
router.get('/statistics', getPlanificationsStatistics);

// Get planifications by specific grade
router.get('/grade/:gradeId', getPlanificationsBySpecificGrade);

// Get detailed planification by ID (must come before /:planificationId/files)
router.get('/:planificationId/detail', getPlanificationDetailById);

// 📁 File Routes for Planifications (SuperUser access)
// Test route
router.get('/test-files', (req, res) => {
  console.log('Test files route hit!');
  res.json({ success: true, message: 'Test route working' });
});

// Get all files for a planification
router.get('/:planificationId/files', getPlanificationFiles);

// Download/Get download URL for a specific file
router.get('/files/:fileId/download', downloadPlanificationFile);

module.exports = router;
