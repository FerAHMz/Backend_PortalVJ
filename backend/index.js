const express = require('express');
const app = express();
const db = require('./database_cn');
const cors = require('cors');
const net = require('net');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'portalvj-secret-2024';

//Routes
const paymentRoutes = require('./routes/paymentRoutes');
const superUserRoutes = require('./routes/superUserRoutes');
const superUserPlanificationRoutes = require('./routes/superUserPlanificationRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const gradeRoutes = require('./routes/gradeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const courseRoutes = require('./routes/courseRoutes');
const messageRoutes = require('./routes/messageRoutes');
const profileRoutes = require('./routes/profileRoutes');
const parentRoutes = require('./routes/parentRoutes');
const directorRoutes = require('./routes/directorRoutes');
const familyRoutes = require('./routes/familyRoutes');
const studentAttendanceRoutes = require('./routes/studentAttendanceRoutes');

// Middleware
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log('Request:', {
    method: req.method,
    path: req.path,
    token: req.headers.authorization
  });
  next();
});

// Auth Routes
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt received:', { email });

  try {
    console.log('Executing login query for email:', email);
    
    const result = await db.getPool().query(
      `SELECT m.id, m.password as hashed_password, 'Maestro' as rol, 'maestros' as user_type
       FROM Maestros m 
       WHERE m.email = $1
       UNION ALL
       SELECT p.id, p.password as hashed_password, 'Padre' as rol, 'padres' as user_type
       FROM Padres p 
       WHERE p.email = $1
       UNION ALL
       SELECT a.id, a.password as hashed_password, 'Administrativo' as rol, 'administrativos' as user_type
       FROM Administrativos a 
       WHERE a.email = $1
       UNION ALL
       SELECT d.id, d.password as hashed_password, 'Director' as rol, 'directores' as user_type
       FROM Directores d 
       WHERE d.email = $1
       UNION ALL
       SELECT s.id, s.password as hashed_password, 'SUP' as rol, 'superusuarios' as user_type
       FROM SuperUsuarios s 
       WHERE s.email = $1`,
      [email]
    );
    
    console.log('Query result:', result.rows);

    console.log('Query executed:', { rows: result.rows });

    if (result.rows.length > 0) {
      // Usar pgcrypto para verificar la contraseña
      const passwordCheck = await db.getPool().query(
        'SELECT $1 = crypt($2, $1) as match',
        [result.rows[0].hashed_password, password]
      );
      
      const match = passwordCheck.rows[0].match;
      console.log('Password match:', match);

      if (match) {
        const token = jwt.sign(
          { 
            id: result.rows[0].id,
            rol: result.rows[0].rol,
            type: result.rows[0].user_type
          },
          JWT_SECRET
        );

        res.json({ 
          success: true, 
          user: {
            id: result.rows[0].id,
            rol: result.rows[0].rol,
            type: result.rows[0].user_type
          },
          token: token 
        });
      } else {
        res.status(401).json({ success: false, message: 'Credenciales inválidas' });
      }
    } else {
      res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }
  } catch (err) {
    console.error('Error during login:', err.message, err.stack);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});

// API Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/superuser', superUserRoutes);
app.use('/api/superuser/planifications', superUserPlanificationRoutes);
app.use('/api/superuser/families', familyRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/courses', gradeRoutes);
app.use('/api/courses', attendanceRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/user', profileRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/students', studentAttendanceRoutes);

// Debug endpoint para verificar el token
const { verifyToken } = require('./middlewares/authMiddleware');
app.get('/api/debug/token', verifyToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    message: 'Token válido'
  });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Test endpoint working',
    jwtSecret: JWT_SECRET
  });
});

// Quick fix: Add planifications routes directly in index.js
const { verifyToken: verifyTokenLocal, isSup } = require('./middlewares/authMiddleware');

app.get('/api/superuser/planifications/by-grade', verifyTokenLocal, isSup, async (req, res) => {
  try {
    const { getAllPlanificationsByGrade } = require('./controllers/superUserPlanificationController');
    await getAllPlanificationsByGrade(req, res);
  } catch (error) {
    console.error('Error in planifications endpoint:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.get('/api/superuser/planifications/statistics', verifyTokenLocal, isSup, async (req, res) => {
  try {
    const { getPlanificationsStatistics } = require('./controllers/superUserPlanificationController');
    await getPlanificationsStatistics(req, res);
  } catch (error) {
    console.error('Error in planifications statistics endpoint:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});
app.use('/api/director', directorRoutes);

// Erro handeling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
  });
});

// Not founfd middleware
app.use((req, res) => {
  res.status(404).json({
      success: false,
      error: 'Ruta no encontrada'
  });
});

// arrancar el servidor
app.listen(3000, (err) => {
  if (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
  console.log('Servidor listo en http://localhost:3000');
});