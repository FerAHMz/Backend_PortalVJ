const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const teacherController = require('../controllers/teacherController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Rutas para cursos
router.get('/', courseController.getCourses); 
router.post('/', courseController.createCourse); 
router.delete('/:id', courseController.deleteCourse); 

// Ruta para obtener cursos de un maestro específico (compatibilidad con frontend)
router.get('/teacher/:teacherId', verifyToken, teacherController.getTeacherCourses);

// Rutas para datos relacionados
router.get('/teachers', courseController.getTeachers);      
router.get('/subjects', courseController.getSubjects);       
router.get('/grades', courseController.getGrades);           
router.get('/sections', courseController.getSections);

// Ruta para crear grado-sección
router.post('/grado-seccion', courseController.createGradoSeccion);

module.exports = router;