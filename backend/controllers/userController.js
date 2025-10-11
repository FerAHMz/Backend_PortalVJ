const db = require('../database_cn');
const bcrypt = require('bcrypt');

const getAllUsers = async (req, res) => {
  let client;
  try {
    client = await db.getPool().connect();
    const result = await client.query(`
            SELECT DISTINCT
                s.id, 
                s.nombre, 
                s.apellido, 
                s.email, 
                s.telefono, 
                'SUP' as rol,
                1 as rol_order,
                s.activo
            FROM SuperUsuarios s
            UNION ALL
            SELECT DISTINCT
                d.id, 
                d.nombre, 
                d.apellido, 
                d.email, 
                d.telefono, 
                'Director' as rol,
                2 as rol_order,
                d.activo
            FROM Directores d
            UNION ALL
            SELECT DISTINCT
                a.id, 
                a.nombre, 
                a.apellido, 
                a.email, 
                a.telefono, 
                'Administrativo' as rol,
                3 as rol_order,
                a.activo
            FROM Administrativos a
            UNION ALL
            SELECT DISTINCT
                m.id, 
                m.nombre, 
                m.apellido, 
                m.email, 
                m.telefono, 
                'Maestro' as rol,
                4 as rol_order,
                m.activo
            FROM Maestros m
            UNION ALL
            SELECT DISTINCT
                p.id, 
                p.nombre, 
                p.apellido, 
                p.email, 
                p.telefono, 
                'Padre' as rol,
                5 as rol_order,
                p.activo
            FROM Padres p
            ORDER BY rol_order ASC, id ASC
        `);

    // Eliminar duplicados usando una clave única compuesta (id + rol)
    const seenKeys = new Set();
    const uniqueUsers = result.rows.filter(user => {
      const uniqueKey = `${user.id}-${user.rol}`;
      if (seenKeys.has(uniqueKey)) {
        return false;
      }
      seenKeys.add(uniqueKey);
      return true;
    });

    // Ordenar una vez más para asegurar consistencia
    uniqueUsers.sort((a, b) => {
      if (a.rol_order !== b.rol_order) {
        return a.rol_order - b.rol_order;
      }
      return a.id - b.id;
    });

    res.json(uniqueUsers);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    if (client) client.release();
  }
};

const createUser = async (req, res) => {
  const { nombre, apellido, email, telefono, password, rol } = req.body;
  let client;
  try {
    if (!nombre || !apellido || !email || !telefono || !password || !rol) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Validaciones adicionales
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Formato de email inválido' });
    }

    const phoneRegex = /^\d{8}$/;
    if (!phoneRegex.test(telefono)) {
      return res.status(400).json({ error: 'El teléfono debe contener exactamente 8 dígitos' });
    }

    client = await db.getPool().connect();

    // Verificar si el email ya existe
    const emailCheck = await client.query(`
            SELECT email FROM SuperUsuarios WHERE email = $1
            UNION ALL
            SELECT email FROM Administrativos WHERE email = $1
            UNION ALL
            SELECT email FROM Maestros WHERE email = $1
            UNION ALL
            SELECT email FROM Padres WHERE email = $1
            UNION ALL
            SELECT email FROM Directores WHERE email = $1
        `, [email.toLowerCase()]);

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Obtener ID del rol desde la tabla Usuarios (con ordenamiento consistente)
    const rolResult = await client.query(
      'SELECT id FROM Usuarios WHERE rol = $1 ORDER BY id ASC LIMIT 1',
      [rol]
    );

    if (rolResult.rowCount === 0) {
      return res.status(400).json({ error: `Rol "${rol}" no existe en la tabla Usuarios` });
    }

    const rolId = rolResult.rows[0].id;
    const hashedPassword = await bcrypt.hash(password, 10);
    let result;

    switch (rol) {
    case 'SUP':
      result = await client.query(
        `INSERT INTO SuperUsuarios (nombre, apellido, email, telefono, password, rol, activo)
                     VALUES ($1, $2, $3, $4, $5, $6, true)
                     RETURNING id, nombre, apellido, email, telefono, 'SUP' as rol, activo`,
        [nombre, apellido, email, telefono, hashedPassword, rolId]
      );
      break;

    case 'Administrativo':
      result = await client.query(
        `INSERT INTO Administrativos (nombre, apellido, email, telefono, password, rol, activo)
                     VALUES ($1, $2, $3, $4, $5, $6, true)
                     RETURNING id, nombre, apellido, email, telefono, 'Administrativo' as rol, activo`,
        [nombre, apellido, email, telefono, hashedPassword, rolId]
      );
      break;

    case 'Maestro':
      result = await client.query(
        `INSERT INTO Maestros (nombre, apellido, email, telefono, password, rol, activo)
                     VALUES ($1, $2, $3, $4, $5, $6, true)
                     RETURNING id, nombre, apellido, email, telefono, 'Maestro' as rol, activo`,
        [nombre, apellido, email, telefono, hashedPassword, rolId]
      );
      break;

    case 'Padre':
      result = await client.query(
        `INSERT INTO Padres (nombre, apellido, email, telefono, password, rol, activo)
                     VALUES ($1, $2, $3, $4, $5, $6, true)
                     RETURNING id, nombre, apellido, email, telefono, 'Padre' as rol, activo`,
        [nombre, apellido, email, telefono, hashedPassword, rolId]
      );
      break;
    case 'Director':
      result = await client.query(
        `INSERT INTO Directores (nombre, apellido, email, telefono, password, rol, activo)
                    VALUES ($1, $2, $3, $4, $5, $6, true)
                    RETURNING id, nombre, apellido, email, telefono, 'Director' as rol, activo`,
        [nombre, apellido, email, telefono, hashedPassword, rolId]
      );
      break;

    default:
      return res.status(400).json({ error: 'Rol de usuario no válido' });
    }

    res.status(201).json({ 
      message: 'Usuario creado exitosamente', 
      userId: result.rows[0].id,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating user:', error.message, error.stack);
    res.status(500).json({ error: 'Error al crear usuario' });
  } finally {
    if (client) client.release();
  }
};


const updateUser = async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, email, telefono, rol, rolAnterior, activo } = req.body;
  let client;

  try {
    if (!nombre?.trim() || !apellido?.trim() || !email?.trim() || !telefono?.trim() || !rol || !rolAnterior) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Formato de email inválido' });
    }

    const phoneRegex = /^\d{8}$/;
    if (!phoneRegex.test(telefono)) {
      return res.status(400).json({ error: 'El teléfono debe contener exactamente 8 dígitos' });
    }

    client = await db.getPool().connect();
    await client.query('BEGIN');

    const emailCheck = await client.query(`
            SELECT email FROM (
                SELECT email, id FROM SuperUsuarios
                UNION ALL
                SELECT email, id FROM Administrativos
                UNION ALL
                SELECT email, id FROM Maestros
                UNION ALL
                SELECT email, id FROM Padres
                UNION ALL
                SELECT email, id FROM Directores
            ) AS users
            WHERE email = $1 AND id != $2
        `, [email.toLowerCase(), id]);

    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El email ya está registrado por otro usuario' });
    }

    let userData;
    switch (rolAnterior) {
    case 'SUP':
      userData = await client.query('SELECT * FROM SuperUsuarios WHERE id = $1', [id]);
      break;
    case 'Administrativo':
      userData = await client.query('SELECT * FROM Administrativos WHERE id = $1', [id]);
      break;
    case 'Maestro':
      userData = await client.query('SELECT * FROM Maestros WHERE id = $1', [id]);
      break;
    case 'Padre':
      userData = await client.query('SELECT * FROM Padres WHERE id = $1', [id]);
      break;
    case 'Director':
      userData = await client.query('SELECT * FROM Directores WHERE id = $1', [id]);
      break;
    default:
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Rol anterior no válido' });
    }

    if (userData.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const currentUser = userData.rows[0];

    if (rol !== rolAnterior) {
      const rolResult = await client.query(
        'SELECT id FROM Usuarios WHERE rol = $1 LIMIT 1',
        [rol]
      );

      if (rolResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Rol "${rol}" no existe en la tabla Usuarios` });
      }

      await client.query(`DELETE FROM ${rolAnterior}s WHERE id = $1`, [id]);

      let result;
      switch (rol) {
      case 'SUP':
        result = await client.query(
          `INSERT INTO SuperUsuarios (id, nombre, apellido, email, telefono, password, activo)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)
                         RETURNING id, nombre, apellido, email, telefono, 'SUP' as rol, activo`,
          [id, nombre, apellido, email, telefono, currentUser.password, currentUser.activo]
        );
        break;
      case 'Administrativo':
        result = await client.query(
          `INSERT INTO Administrativos (id, nombre, apellido, email, telefono, password, activo)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)
                         RETURNING id, nombre, apellido, email, telefono, 'Administrativo' as rol, activo`,
          [id, nombre, apellido, email, telefono, currentUser.password, currentUser.activo]
        );
        break;
      case 'Maestro':
        result = await client.query(
          `INSERT INTO Maestros (id, nombre, apellido, email, telefono, password, activo)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)
                         RETURNING id, nombre, apellido, email, telefono, 'Maestro' as rol, activo`,
          [id, nombre, apellido, email, telefono, currentUser.password, currentUser.activo]
        );
        break;
      case 'Padre':
        result = await client.query(
          `INSERT INTO Padres (id, nombre, apellido, email, telefono, password, activo)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)
                         RETURNING id, nombre, apellido, email, telefono, 'Padre' as rol, activo`,
          [id, nombre, apellido, email, telefono, currentUser.password, currentUser.activo]
        );
        break;
      case 'Director':
        result = await client.query(
          `INSERT INTO Directores (id, nombre, apellido, email, telefono, password, activo)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        RETURNING id, nombre, apellido, email, telefono, 'Director' as rol, activo`,
          [id, nombre, apellido, email, telefono, currentUser.password, currentUser.activo]
        );
        break;
      default:
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Rol no válido' });
      }
      await client.query('COMMIT');
      res.json(result.rows[0]);
    } else {
      let result;
      switch (rol) {
      case 'SUP':
        result = await client.query(
          `UPDATE SuperUsuarios
                         SET nombre = $1, apellido = $2, email = $3, telefono = $4, activo = $6
                         WHERE id = $5
                         RETURNING id, nombre, apellido, email, telefono, 'SUP' as rol, activo`,
          [nombre, apellido, email, telefono, id, activo !== undefined ? activo : currentUser.activo]
        );
        break;
      case 'Administrativo':
        result = await client.query(
          `UPDATE Administrativos
                         SET nombre = $1, apellido = $2, email = $3, telefono = $4, activo = $6
                         WHERE id = $5
                         RETURNING id, nombre, apellido, email, telefono, 'Administrativo' as rol, activo`,
          [nombre, apellido, email, telefono, id, activo !== undefined ? activo : currentUser.activo]
        );
        break;
      case 'Maestro':
        result = await client.query(
          `UPDATE Maestros
                         SET nombre = $1, apellido = $2, email = $3, telefono = $4, activo = $6
                         WHERE id = $5
                         RETURNING id, nombre, apellido, email, telefono, 'Maestro' as rol, activo`,
          [nombre, apellido, email, telefono, id, activo !== undefined ? activo : currentUser.activo]
        );
        break;
      case 'Padre':
        result = await client.query(
          `UPDATE Padres
                         SET nombre = $1, apellido = $2, email = $3, telefono = $4, activo = $6
                         WHERE id = $5
                         RETURNING id, nombre, apellido, email, telefono, 'Padre' as rol, activo`,
          [nombre, apellido, email, telefono, id, activo !== undefined ? activo : currentUser.activo]
        );
        break;
      case 'Director':
        result = await client.query(
          `UPDATE Directores
                        SET nombre = $1, apellido = $2, email = $3, telefono = $4, activo = $6
                        WHERE id = $5
                        RETURNING id, nombre, apellido, email, telefono, 'Director' as rol, activo`,
          [nombre, apellido, email, telefono, id, activo !== undefined ? activo : currentUser.activo]
        );
        break;
      default:
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Rol de usuario no válido' });
      }

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      await client.query('COMMIT');
      res.json(result.rows[0]);
    }
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  } finally {
    if (client) client.release();
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  const { rol } = req.body;
  let client;
  try {
    client = await db.getPool().connect();
    let result;

    switch (rol) {
    case 'SUP':
      result = await client.query(
        `UPDATE SuperUsuarios
                     SET activo = false
                     WHERE id = $1 RETURNING id`,
        [id]
      );
      break;

    case 'Administrativo':
      result = await client.query(
        `UPDATE Administrativos
                     SET activo = false
                     WHERE id = $1 RETURNING id`,
        [id]
      );
      break;

    case 'Maestro':
      result = await client.query(
        `UPDATE Maestros
                     SET activo = false
                     WHERE id = $1 RETURNING id`,
        [id]
      );
      break;

    case 'Padre':
      result = await client.query(
        `UPDATE Padres
                     SET activo = false
                     WHERE id = $1 RETURNING id`,
        [id]
      );
      break;

    case 'Director':
      result = await client.query(
        `UPDATE Directores
                     SET activo = false
                     WHERE id = $1 RETURNING id`,
        [id]
      );
      break;

    default:
      return res.status(400).json({ error: 'Rol de usuario no válido' });
    }

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario desactivado exitosamente' });
  } catch (error) {
    console.error('Error al desactivar usuario:', error);
    res.status(500).json({ error: 'Error al desactivar usuario' });
  } finally {
    if (client) client.release();
  }
};

const activateUser = async (req, res) => {
  const { id } = req.params;
  const { rol } = req.body;
  let client;
  try {
    client = await db.getPool().connect();
    let result;

    switch (rol) {
    case 'SUP':
      result = await client.query(
        `UPDATE SuperUsuarios
                     SET activo = true
                     WHERE id = $1 RETURNING id`,
        [id]
      );
      break;

    case 'Administrativo':
      result = await client.query(
        `UPDATE Administrativos
                     SET activo = true
                     WHERE id = $1 RETURNING id`,
        [id]
      );
      break;

    case 'Maestro':
      result = await client.query(
        `UPDATE Maestros
                     SET activo = true
                     WHERE id = $1 RETURNING id`,
        [id]
      );
      break;

    case 'Padre':
      result = await client.query(
        `UPDATE Padres
                     SET activo = true
                     WHERE id = $1 RETURNING id`,
        [id]
      );
      break;

    case 'Director':
      result = await client.query(
        `UPDATE Directores
                     SET activo = true
                     WHERE id = $1 RETURNING id`,
        [id]
      );
      break;

    default:
      return res.status(400).json({ error: 'Rol de usuario no válido' });
    }

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario activado exitosamente' });
  } catch (error) {
    console.error('Error al activar usuario:', error);
    res.status(500).json({ error: 'Error al activar usuario' });
  } finally {
    if (client) client.release();
  }
};

const searchUsers = async (req, res) => {
  const { name } = req.query;
  let client;

  try {
    client = await db.getPool().connect();
    const query = `
            SELECT id, nombre, apellido, 'Maestro' as rol FROM Maestros
            WHERE (LOWER(nombre) LIKE LOWER($1) OR LOWER(apellido) LIKE LOWER($1))
            AND activo = true
            UNION ALL
            SELECT id, nombre, apellido, 'Padre' as rol FROM Padres
            WHERE (LOWER(nombre) LIKE LOWER($1) OR LOWER(apellido) LIKE LOWER($1))
            AND activo = true
            ORDER BY rol, nombre, apellido
            LIMIT 10
        `;

    const result = await client.query(query, [`%${name}%`]);
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Error searching users' });
  } finally {
    if (client) client.release();
  }
};

const getUserProfile = async (req, res) => {
  const { id: userId, role: userRole } = req.user;
  let client;

  try {
    client = await db.getPool().connect();
    let result;

    // Query based on user role
    switch (userRole) {
    case 'SUP':
      result = await client.query(`
                    SELECT id, nombre, apellido, email, telefono, profile_image_url, 'SUP' as rol
                    FROM SuperUsuarios
                    WHERE id = $1
                `, [userId]);
      break;

    case 'Director':
      result = await client.query(`
                    SELECT id, nombre, apellido, email, telefono, profile_image_url, 'Director' as rol
                    FROM Directores
                    WHERE id = $1
                `, [userId]);
      break;

    case 'Administrativo':
      result = await client.query(`
                    SELECT id, nombre, apellido, email, telefono, profile_image_url, 'Administrativo' as rol
                    FROM Administrativos
                    WHERE id = $1
                `, [userId]);
      break;

    case 'Maestro':
      result = await client.query(`
                    SELECT m.id, m.nombre, m.apellido, m.email, m.telefono, m.profile_image_url, 'Maestro' as rol
                    FROM Maestros m
                    WHERE m.id = $1
                `, [userId]);
      break;

    case 'Padre':
      result = await client.query(`
                    SELECT p.id, p.nombre, p.apellido, p.email, p.telefono, p.profile_image_url, 'Padre' as rol,
                           e.nombre as nombre_estudiante, e.apellido as apellido_estudiante, e.carnet
                    FROM Padres p
                    LEFT JOIN Familias f ON p.id = f.id_padre
                    LEFT JOIN Estudiantes e ON f.carnet_estudiante = e.carnet
                    WHERE p.id = $1
                `, [userId]);
      break;

    default:
      return res.status(400).json({
        success: false,
        error: 'Rol de usuario no válido'
      });
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const userProfile = result.rows[0];
    console.log('User profile found:', userProfile); // Debug log

    // For parents, format the student information
    if (userRole === 'Padre' && userProfile.carnet) {
      userProfile.estudiante = {
        carnet: userProfile.carnet,
        nombre: userProfile.nombre_estudiante,
        apellido: userProfile.apellido_estudiante
      };

      // Remove individual student fields from the main object
      delete userProfile.carnet;
      delete userProfile.nombre_estudiante;
      delete userProfile.apellido_estudiante;
    }

    res.json({
      success: true,
      user: userProfile
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  } finally {
    if (client) client.release();
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  activateUser,
  searchUsers,
  getUserProfile
};
