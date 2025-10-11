const db = require('../database_cn');

// Obtener todas las familias con información de padres e hijos
exports.getAllFamilies = async (req, res) => {
  try {
    const result = await db.getPool().query(`
      SELECT 
        f.id,
        f.id_padre,
        f.carnet_estudiante,
        p.nombre AS padre_nombre,
        p.apellido AS padre_apellido,
        p.email AS padre_email,
        p.telefono AS padre_telefono,
        e.nombre AS estudiante_nombre,
        e.apellido AS estudiante_apellido,
        g.grado AS estudiante_grado,
        s.seccion AS estudiante_seccion
      FROM familias f
      INNER JOIN padres p ON f.id_padre = p.id
      INNER JOIN estudiantes e ON f.carnet_estudiante = e.carnet
      LEFT JOIN grado_seccion gs ON e.id_grado_seccion = gs.id
      LEFT JOIN grados g ON gs.id_grado = g.id
      LEFT JOIN secciones s ON gs.id_seccion = s.id
      WHERE p.activo = true
      ORDER BY p.apellido, p.nombre, e.apellido, e.nombre
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al obtener familias:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las familias'
    });
  }
};

// Obtener todos los padres disponibles
exports.getAvailableParents = async (req, res) => {
  try {
    const result = await db.getPool().query(`
      SELECT 
        id,
        nombre,
        apellido,
        email,
        telefono
      FROM padres 
      WHERE activo = true
      ORDER BY apellido, nombre
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al obtener padres:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener los padres disponibles'
    });
  }
};

// Obtener todos los estudiantes disponibles (sin padre asignado)
exports.getAvailableStudents = async (req, res) => {
  try {
    const result = await db.getPool().query(`
      SELECT 
        e.carnet,
        e.nombre,
        e.apellido,
        g.grado,
        s.seccion
      FROM estudiantes e
      LEFT JOIN grado_seccion gs ON e.id_grado_seccion = gs.id
      LEFT JOIN grados g ON gs.id_grado = g.id
      LEFT JOIN secciones s ON gs.id_seccion = s.id
      LEFT JOIN familias f ON e.carnet = f.carnet_estudiante
      WHERE f.carnet_estudiante IS NULL
      ORDER BY e.apellido, e.nombre
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al obtener estudiantes disponibles:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener los estudiantes disponibles'
    });
  }
};

// Obtener hijos de un padre específico
exports.getStudentsByParent = async (req, res) => {
  try {
    const { parentId } = req.params;

    const result = await db.getPool().query(`
      SELECT 
        e.carnet,
        e.nombre,
        e.apellido,
        g.grado,
        s.seccion,
        f.id as familia_id
      FROM familias f
      INNER JOIN estudiantes e ON f.carnet_estudiante = e.carnet
      LEFT JOIN grado_seccion gs ON e.id_grado_seccion = gs.id
      LEFT JOIN grados g ON gs.id_grado = g.id
      LEFT JOIN secciones s ON gs.id_seccion = s.id
      WHERE f.id_padre = $1
      ORDER BY e.apellido, e.nombre
    `, [parentId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al obtener hijos del padre:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener los hijos del padre'
    });
  }
};

// Crear nueva relación familiar
exports.createFamily = async (req, res) => {
  const { id_padre, carnet_estudiante } = req.body;

  try {
    // Verificar que el padre existe y está activo
    const parentCheck = await db.getPool().query(
      'SELECT id FROM padres WHERE id = $1 AND activo = true',
      [id_padre]
    );

    if (parentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Padre no encontrado o inactivo'
      });
    }

    // Verificar que el estudiante existe
    const studentCheck = await db.getPool().query(
      'SELECT carnet FROM estudiantes WHERE carnet = $1',
      [carnet_estudiante]
    );

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Estudiante no encontrado'
      });
    }

    // Verificar que el estudiante no esté ya asignado a otro padre
    const existingFamily = await db.getPool().query(
      'SELECT id FROM familias WHERE carnet_estudiante = $1',
      [carnet_estudiante]
    );

    if (existingFamily.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'El estudiante ya tiene un padre asignado'
      });
    }

    // Crear la relación familiar
    const result = await db.getPool().query(
      'INSERT INTO familias (id_padre, carnet_estudiante) VALUES ($1, $2) RETURNING *',
      [id_padre, carnet_estudiante]
    );

    res.status(201).json({
      success: true,
      message: 'Relación familiar creada exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error al crear relación familiar:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear la relación familiar'
    });
  }
};

// Eliminar relación familiar
exports.deleteFamily = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.getPool().query(
      'DELETE FROM familias WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Relación familiar no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Relación familiar eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar relación familiar:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la relación familiar'
    });
  }
};

// Actualizar relación familiar (cambiar padre de un estudiante)
exports.updateFamily = async (req, res) => {
  const { id } = req.params;
  const { id_padre } = req.body;

  try {
    // Verificar que el padre existe y está activo
    const parentCheck = await db.getPool().query(
      'SELECT id FROM padres WHERE id = $1 AND activo = true',
      [id_padre]
    );

    if (parentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Padre no encontrado o inactivo'
      });
    }

    // Actualizar la relación familiar
    const result = await db.getPool().query(
      'UPDATE familias SET id_padre = $1 WHERE id = $2 RETURNING *',
      [id_padre, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Relación familiar no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Relación familiar actualizada exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error al actualizar relación familiar:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la relación familiar'
    });
  }
};

// Obtener estadísticas de familias
exports.getFamilyStatistics = async (req, res) => {
  try {
    const stats = await db.getPool().query(`
      SELECT 
        COUNT(DISTINCT f.id_padre) as total_padres_con_hijos,
        COUNT(f.carnet_estudiante) as total_estudiantes_asignados,
        COUNT(DISTINCT p.id) as total_padres_activos,
        COUNT(DISTINCT e.carnet) as total_estudiantes
      FROM padres p
      FULL OUTER JOIN familias f ON p.id = f.id_padre
      FULL OUTER JOIN estudiantes e ON f.carnet_estudiante = e.carnet
      WHERE p.activo = true OR p.activo IS NULL
    `);

    const studentsWithoutParent = await db.getPool().query(`
      SELECT COUNT(*) as estudiantes_sin_padre
      FROM estudiantes e
      LEFT JOIN familias f ON e.carnet = f.carnet_estudiante
      WHERE f.carnet_estudiante IS NULL
    `);

    res.json({
      success: true,
      data: {
        ...stats.rows[0],
        estudiantes_sin_padre: studentsWithoutParent.rows[0].estudiantes_sin_padre
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las estadísticas'
    });
  }
};
