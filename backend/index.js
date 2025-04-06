const express = require('express');
const app = express();
const db = require('./database_cn');
const cors = require('cors');
const net = require('net');

app.use(cors());
app.use(express.json()); // Para leer JSON del frontend

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try { //login para los padres por el momento
    const result = await db.getPool().query(
      'SELECT * FROM padres WHERE email = $1 AND password = $2',
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