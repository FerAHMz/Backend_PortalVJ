const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const { 
    getTeacherCourses,
    getCourseGrades,
    getCourseTasks,
    createTask,
    registerGrade,
    getStudentsByCourse
} = require('../controllers/teacherController');

router.get('/:teacherId/courses', verifyToken, getTeacherCourses);

router.get('/courses/:courseId/grades', verifyToken, getCourseGrades);
router.get('/courses/:courseId/tasks', verifyToken, getCourseTasks);
router.post('/courses/:courseId/tasks', verifyToken, createTask);
router.post('/courses/:courseId/grades', verifyToken, registerGrade);
router.get('/courses/:courseId/students', verifyToken, getStudentsByCourse);

module.exports = router;