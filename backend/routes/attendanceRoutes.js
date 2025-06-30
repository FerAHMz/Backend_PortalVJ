const express = require('express')
const { getAttendance, postAttendance, getAttendanceReport } = require('../controllers/attendanceController')
const { verifyToken } = require('../middlewares/authMiddleware')

const router = express.Router()

router.use(verifyToken)

// Ruta para manejar la asistencia diaria
router
  .route('/:courseId/attendance')
  .get (getAttendance)   
  .post(postAttendance) 

// Ruta para los reportes por rango de fechas
router.get(
  '/:courseId/attendance/report', 
  getAttendanceReport
)

module.exports = router
