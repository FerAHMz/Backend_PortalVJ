const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const { getTeacherCourses } = require('../controllers/teacherController');

router.get('/:teacherId/courses', verifyToken, getTeacherCourses);

module.exports = router;