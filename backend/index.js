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

// Middleware
app.use(cors());
app.use(express.json()); // Para leer JSON del frontend

// Auth Routes
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt received:', { email });

  try {
    const result = await db.getPool().query(
      `SELECT m.id, m.password as hashed_password, 'Maestro' as rol, 'maestros' as user_type
       FROM maestros m 
       WHERE m.email = $1
       UNION ALL
       SELECT p.id, p.password as hashed_password, 'Padre' as rol, 'padres' as user_type
       FROM padres p 
       WHERE p.email = $1
       UNION ALL
       SELECT a.id, a.password as hashed_password, 'Administrativo' as rol, 'administrativos' as user_type
       FROM administrativos a 
       WHERE a.email = $1`,
      [email]
    );

    console.log('Query executed:', { rows: result.rows });

    if (result.rows.length > 0) {
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
app.use('/api/superusers', superUserRoutes);

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