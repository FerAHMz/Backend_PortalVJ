// Load environment variables
require('dotenv').config();

const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const paymentRoutes = require('./routes/paymentRoutes');
const userRoutes = require('./routes/userManagementRoutes');
const messageRoutes = require('./routes/messageRoutes');
const profileRoutes = require('./routes/profileRoutes');
const superUserRoutes = require('./routes/superUserRoutes');
const superUserPlanificationRoutes = require('./routes/superUserPlanificationRoutes');
const familyRoutes = require('./routes/familyRoutes');
const inscripcionRoutes = require('./routes/inscripcionRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes');

const attendanceRoutes = require('./routes/attendanceRoutes');
const studentAttendanceRoutes = require('./routes/studentAttendanceRoutes');
const courseRoutes = require('./routes/courseRoutes');
const gradePromotionRoutes = require('./routes/gradePromotionRoutes');
const directorRoutes = require('./routes/directorRoutes');

// Controllers
const authController = require('./controllers/authController');

// Configure CORS with specific options
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:3000',
    'https://frontend-portal-vj.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Auth routes
app.post('/login', authController.login);

// Serve uploaded files statically in development
if (process.env.NODE_ENV === 'development') {
  const path = require('path');
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/user', profileRoutes);
app.use('/api/superuser', superUserRoutes);
app.use('/api/superuser/planifications', superUserPlanificationRoutes);
app.use('/api/superuser/families', familyRoutes);
app.use('/api/inscripciones', inscripcionRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/students', studentAttendanceRoutes);
app.use('/api/password', passwordResetRoutes);
app.use('/api/promotions', gradePromotionRoutes);
app.use('/api/director', directorRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

module.exports = app;
