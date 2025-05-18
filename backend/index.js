const express = require('express');
const app = express();
const db = require('./database_cn');
const cors = require('cors');
const net = require('net');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./config/config');

//Routes
const paymentRoutes = require('./routes/paymentRoutes');
const superUserRoutes = require('./routes/superUserRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const gradeRoutes = require('./routes/gradeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes')

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
    const result = await db.getPool().query(
      `SELECT m.id, m.password as hashed_password, 'Maestro' as rol, 'maestros' as user_type, m.activo
       FROM maestros m 
       WHERE m.email = $1
       UNION ALL
       SELECT p.id, p.password as hashed_password, 'Padre' as rol, 'padres' as user_type, p.activo
       FROM padres p 
       WHERE p.email = $1
       UNION ALL
       SELECT a.id, a.password as hashed_password, 'Administrativo' as rol, 'administrativos' as user_type, a.activo
       FROM administrativos a 
       WHERE a.email = $1
       UNION ALL
       SELECT s.id, s.password as hashed_password, 'SUP' as rol, 'superusuarios' as user_type, s.activo
       FROM superusuarios s 
       WHERE s.email = $1`,
      [email]
    );

    console.log('Query executed:', { rows: result.rows });

    if (result.rows.length > 0) {
      if (!result.rows[0].activo) {
        return res.status(401).json({ 
          success: false, 
          message: 'Usuario inactivo. Por favor contacte al administrador.' 
        });
      }

      const match = await bcrypt.compare(password, result.rows[0].hashed_password);
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
            type: result.rows[0].user_type,
            activo: result.rows[0].activo
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
app.use('/api/superusers', superUserRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/courses', gradeRoutes);
app.use('/api/courses', attendanceRoutes)

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