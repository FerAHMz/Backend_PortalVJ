const db = require('../database_cn');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'portalvj-secret-2024';

const login = async (req, res) => {
  const { email, password } = req.body;

  // Validar datos requeridos
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email y contraseña son requeridos' 
    });
  }

  try {
    const result = await db.getPool().query(
      `SELECT m.id, m.nombre, m.apellido, m.email, m.password as hashed_password, 'Maestro' as rol, 'maestros' as user_type
       FROM Maestros m 
       WHERE m.email = $1 AND m.activo = true
       UNION ALL
       SELECT p.id, p.nombre, p.apellido, p.email, p.password as hashed_password, 'Padre' as rol, 'padres' as user_type
       FROM Padres p 
       WHERE p.email = $1 AND p.activo = true
       UNION ALL
       SELECT a.id, a.nombre, a.apellido, a.email, a.password as hashed_password, 'Administrativo' as rol, 'administrativos' as user_type
       FROM Administrativos a 
       WHERE a.email = $1 AND a.activo = true
       UNION ALL
       SELECT d.id, d.nombre, d.apellido, d.email, d.password as hashed_password, 'Director' as rol, 'directores' as user_type
       FROM Directores d 
       WHERE d.email = $1 AND d.activo = true
       UNION ALL
       SELECT s.id, s.nombre, s.apellido, s.email, s.password as hashed_password, 'SUP' as rol, 'superusuarios' as user_type
       FROM SuperUsuarios s 
       WHERE s.email = $1 AND s.activo = true`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciales inválidas' 
      });
    }

    const user = result.rows[0];
    const hashedPassword = user.hashed_password;
    let match = false;

    try {
      // Intentar con bcrypt primero
      if (hashedPassword && hashedPassword.startsWith('$2')) {
        match = await bcrypt.compare(password, hashedPassword);
      } else {
        // Intentar con pgcrypto para contraseñas existentes
        const passwordCheck = await db.getPool().query(
          'SELECT $1 = crypt($2, $1) as match',
          [hashedPassword, password]
        );
        match = passwordCheck.rows[0].match;
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Error al verificar contraseña' 
      });
    }

    if (!match) {
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciales inválidas' 
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        rol: user.rol,
        type: user.user_type
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        rol: user.rol,
        type: user.user_type
      },
      token: token
    });

  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Error en el servidor' 
    });
  }
};

module.exports = {
  login
};