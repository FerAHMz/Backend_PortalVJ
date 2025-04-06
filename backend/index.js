const express = require('express');
const app = express();
const db = require('./database_cn');
const cors = require('cors');
const net = require('net');

app.use(cors());
app.use(express.json()); // Para leer JSON del frontend

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.getPool().query(
      `SELECT u.rol FROM usuarios u
       JOIN padres p ON u.id = p.rol AND p.email = $1 AND p.password = $2
       UNION
       SELECT u.rol FROM usuarios u
       JOIN maestros m ON u.id = m.rol AND m.email = $1 AND m.password = $2
       UNION
       SELECT u.rol FROM usuarios u
       JOIN administrativos a ON u.id = a.rol AND a.email = $1 AND a.password = $2`,
      [email, password]
    );

    if (result.rows.length > 0) {
      res.json({ success: true, user: result.rows[0] });
    } else {
      res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});

// arrancar el servidor
app.listen(3000, () => {
  console.log('Servidor listo en http://localhost:3000');
});