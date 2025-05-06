const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const {
    getTeacherCourses,
    getCourseGrades,
    registerGrade,
    getStudentsByCourse
} = require('../controllers/teacherController');

const {
    getCourseTasks,
    createTask,
    getTaskGrades,
    saveTaskGrades,
    updateTaskGrade
} = require('../controllers/taskController');

// Rutas del maestro
router.get('/:teacherId/courses', verifyToken, getTeacherCourses);
router.get('/courses/:courseId/grades', verifyToken, getCourseGrades);
router.post('/courses/:courseId/grades', verifyToken, registerGrade);
router.get('/courses/:courseId/students', verifyToken, getStudentsByCourse);

// Rutas de tareas
router.get('/courses/:courseId/tasks', verifyToken, getCourseTasks);
router.post('/courses/:courseId/tasks', verifyToken, createTask);
router.get('/courses/:courseId/tasks/:taskId/grades', verifyToken, getTaskGrades);
router.post('/courses/:courseId/tasks/:taskId/grades', verifyToken, saveTaskGrades);
router.put('/courses/:courseId/tasks/:taskId/grades/:studentId', verifyToken, updateTaskGrade);

module.exports = router;