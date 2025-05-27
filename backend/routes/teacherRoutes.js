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
    getReportCard,
    getStudentsGradeSection,
    getGradeSections,
    getObservationsAndActionPoints,
    getGrade
} = require('../controllers/reportCardController');

const {
    createObservation,
    getObservationsByCourseAndStudent,
    updateObservation,
    deleteObservation
} = require('../controllers/observationController');
const { verify } = require('jsonwebtoken');

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

// Rutas para observaciones
router.post('/courses/:courseId/observations', verifyToken, createObservation);
router.get('/courses/:courseId/observations/:carnetEstudiante', verifyToken, getObservationsByCourseAndStudent);
router.put('/observations/:observationId', verifyToken, updateObservation);
router.delete('/observations/:observationId', verifyToken, deleteObservation);

// Rutas para boleta de calificaciones
router.get('/report-card/:carnetEstudiante/', verifyToken, getReportCard); 
router.get('/grade-sections/:gradeSectionId/report-card/', verifyToken, getStudentsGradeSection);
router.get('/grade-sections', verifyToken, getGradeSections);
router.get('/report-card/grade-sections/:gradeSectionId/:carnetEstudiante/observaciones', verifyToken, getObservationsAndActionPoints);
router.get('/report-card/student-grade/:gradeSectionId', verifyToken, getGrade);

module.exports = router;