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
    updateTaskGrade,
    getAllHomework,
    getAllTasksForUser
} = require('../controllers/taskController');

const {
    createObservation,
    getObservationsByCourseAndStudent,
    updateObservation,
    deleteObservation
} = require('../controllers/observationController');

// Rutas del maestro
router.get('/:teacherId/courses', verifyToken, getTeacherCourses);
router.get('/courses/:courseId/grades', verifyToken, getCourseGrades);
router.post('/courses/:courseId/grades', verifyToken, registerGrade);
router.get('/courses/:courseId/students', verifyToken, getStudentsByCourse);
router.get('/:teacherId/homework', verifyToken, getAllHomework);

// Rutas de tareas
router.get('/courses/:courseId/tasks', verifyToken, getCourseTasks);
router.post('/courses/:courseId/tasks', verifyToken, createTask);
router.get('/courses/:courseId/tasks/:taskId/grades', verifyToken, getTaskGrades);
router.post('/courses/:courseId/tasks/:taskId/grades', verifyToken, saveTaskGrades);
router.put('/courses/:courseId/tasks/:taskId/grades/:studentId', verifyToken, updateTaskGrade);
router.get('/tasks/all', verifyToken, getAllTasksForUser);

// Ruta para observaciones
router.post('/courses/:courseId/observations', verifyToken, createObservation);
router.get('/courses/:courseId/observations/:carnetEstudiante', verifyToken, getObservationsByCourseAndStudent);
router.put('/observations/:observationId', verifyToken, updateObservation);
router.delete('/observations/:observationId', verifyToken, deleteObservation);

module.exports = router;