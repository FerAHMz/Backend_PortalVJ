// Load environment variables
require('dotenv').config();

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
const profileImageRoutes = require('./routes/profileImageRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes');

// Middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:3000'], // Allow frontend and backend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Servir archivos estáticos para modo desarrollo
app.use('/uploads', express.static('uploads'));

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
      const user = result.rows[0];
      const hashedPassword = user.hashed_password;
      let match = false;

      try {
        // Intentar primero con pgcrypto (para compatibilidad con contraseñas existentes)
        const passwordCheck = await db.getPool().query(
          'SELECT $1 = crypt($2, $1) as match',
          [hashedPassword, password]
        );
        
        match = passwordCheck.rows[0].match;
        console.log('pgcrypto match:', match);

        // Si pgcrypto falla, intentar con bcrypt de Node.js
        if (!match && hashedPassword.startsWith('$2')) {
          match = await bcrypt.compare(password, hashedPassword);
          console.log('bcrypt match:', match);
        }
      } catch (error) {
        console.error('Error verifying password:', error);
        // Si hay error con pgcrypto, intentar solo con bcrypt
        if (hashedPassword.startsWith('$2')) {
          try {
            match = await bcrypt.compare(password, hashedPassword);
            console.log('bcrypt fallback match:', match);
          } catch (bcryptError) {
            console.error('Bcrypt error:', bcryptError);
            match = false;
          }
        }
      }

      if (match) {
        const token = jwt.sign(
          { 
            id: user.id,
            rol: user.rol,
            type: user.user_type
          },
          JWT_SECRET
        );

        res.json({ 
          success: true, 
          user: {
            id: user.id,
            rol: user.rol,
            type: user.user_type
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
app.use('/api/profile', profileImageRoutes);
app.use('/api/password', passwordResetRoutes);

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

// Test endpoint para verificar la funcionalidad de reset de contraseña
app.get('/api/test/password-reset', async (req, res) => {
  try {
    // Verificar que la tabla existe
    const result = await db.getPool().query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'password_reset_tokens')"
    );
    
    res.json({
      success: true,
      message: 'Password reset system ready',
      tableExists: result.rows[0].exists,
      endpoints: {
        generateToken: 'POST /api/password/request-reset',
        validateToken: 'GET /api/password/validate-token/:token',
        resetPassword: 'POST /api/password/reset',
        cleanupTokens: 'DELETE /api/password/cleanup-tokens'
      }
    });
  } catch (error) {
    console.error('Error testing password reset:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing password reset system',
      error: error.message
    });
  }
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

// Health check endpoint for Docker
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'Portal Vanguardia Juvenil Backend'
  });
});

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
app.listen(3000, async (err) => {
  if (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
  console.log('Servidor listo en http://localhost:3000');
  
  // Configurar limpieza automática de tokens de reset de contraseña
  try {
    const { autoCleanupTokens } = require('./controllers/passwordResetController');
    
    // Ejecutar limpieza inicial
    const tokensRemoved = await autoCleanupTokens();
    console.log(`Limpieza inicial de tokens: ${tokensRemoved} tokens eliminados`);
    
    // Configurar limpieza automática cada 24 horas
    setInterval(async () => {
      try {
        const removed = await autoCleanupTokens();
        console.log(`Limpieza automática de tokens: ${removed} tokens eliminados`);
      } catch (error) {
        console.error('Error en limpieza automática de tokens:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 horas
    
  } catch (error) {
    console.error('Error configurando limpieza automática de tokens:', error);
  }
});