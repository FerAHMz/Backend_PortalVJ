const express = require('express');
const router = express.Router();
const {
  getNetAverages,
  getTaskGrades,
  updateGrade
} = require('../controllers/gradeController');
const { verifyToken, isTeacher } = require('../middlewares/authMiddleware');

router.get('/:courseId/grades', 
  verifyToken,
  isTeacher,
  getNetAverages
);

router.get('/:courseId/tasks/:taskId/grades',
  verifyToken,
  isTeacher,
  getTaskGrades
);

router.put('/:courseId/tasks/:taskId/grades/:studentId',
  verifyToken,
  isTeacher,
  updateGrade
);

module.exports = router;