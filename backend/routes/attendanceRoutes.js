const express = require('express')
const { getAttendance, postAttendance } = require('../controllers/attendanceController')
const { verifyToken } = require('../middlewares/authMiddleware')

const router = express.Router()

router.use(verifyToken)

router
  .route('/:courseId/attendance')
  .get (getAttendance)   
  .post(postAttendance) 

module.exports = router
