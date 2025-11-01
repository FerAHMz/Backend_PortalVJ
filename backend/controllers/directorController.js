const db = require('../database_cn');

// Obtener grados del director autenticado
const getGradosDelDirector = async (req, res) => {
  const directorId = req.user.id;

  try {
    const result = await db.getPool().query(
      `SELECT g.id, g.grado 
       FROM Grados g
       JOIN Grados_director gd ON g.id = gd.id_grado
       WHERE gd.id_director = $1`,
      [directorId]
    );

    res.json({ success: true, grados: result.rows });
  } catch (error) {
    console.error('Error al obtener grados del director:', error);
    res.status(500).json({ success: false, message: 'Error al obtener grados del director' });
  }
};

// Obtener cursos por grado (solo si pertenecen al director)
const getCursosPorGrado = async (req, res) => {
  const directorId = req.user.id;
  const { gradoId } = req.params;

  try {
    // Validar que el grado pertenece al director
    const gradoCheck = await db.getPool().query(
      'SELECT 1 FROM Grados_director WHERE id_director = $1 AND id_grado = $2',
      [directorId, gradoId]
    );

    if (gradoCheck.rowCount === 0) {
      return res.status(403).json({ success: false, message: 'No autorizado para este grado' });
    }

    const result = await db.getPool().query(
      `SELECT c.id, gs.id_grado ,m.nombre AS materia, s.seccion 
          FROM Cursos c
          JOIN Materias m ON c.id_materia = m.id
          JOIN grado_seccion gs on c.id_grado_seccion = gs.id
        JOIN secciones s on gs.id_seccion = s.id
        where gs.id_grado = $1`,
      [gradoId]
    );

    res.json({ success: true, cursos: result.rows });
  } catch (error) {
    console.error('Error al obtener cursos por grado:', error);
    res.status(500).json({ success: false, message: 'Error al obtener cursos del grado' });
  }
};

// Obtener todos los maestros
const getAllTeachers = async (req, res) => {
  try {
    const result = await db.getPool().query(
      `SELECT id, nombre, apellido, email, telefono, activo 
       FROM Maestros 
       ORDER BY nombre, apellido`
    );

    res.json({ success: true, teachers: result.rows });
  } catch (error) {
    console.error('Error al obtener maestros:', error);
    res.status(500).json({ success: false, message: 'Error al obtener maestros' });
  }
};

// Obtener todos los estudiantes bajo la supervisión del director
const getAllStudents = async (req, res) => {
  const directorId = req.user.id;

  try {
    const result = await db.getPool().query(
      `SELECT e.carnet, e.nombre, e.apellido, e.fecha_nacimiento, e.estado, g.grado, s.seccion
       FROM Estudiantes e
       JOIN Estudiante_grado_seccion egs ON e.carnet = egs.id_estudiante
       JOIN Grado_seccion gs ON egs.id_grado_seccion = gs.id
       JOIN Grados g ON gs.id_grado = g.id
       JOIN Secciones s ON gs.id_seccion = s.id
       JOIN Grados_director gd ON g.id = gd.id_grado
       WHERE gd.id_director = $1
       ORDER BY e.nombre, e.apellido`,
      [directorId]
    );

    res.json({ success: true, students: result.rows });
  } catch (error) {
    console.error('Error al obtener estudiantes:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estudiantes' });
  }
};

// Obtener todos los padres de estudiantes bajo la supervisión del director
const getAllParents = async (req, res) => {
  const directorId = req.user.id;

  try {
    const result = await db.getPool().query(
      `SELECT DISTINCT p.id, p.nombre, p.apellido, p.email, p.telefono, p.activo
       FROM Padres p
       JOIN Familias f ON p.id = f.id_padre
       JOIN Estudiantes e ON f.carnet_estudiante = e.carnet
       JOIN Estudiante_grado_seccion egs ON e.carnet = egs.id_estudiante
       JOIN Grado_seccion gs ON egs.id_grado_seccion = gs.id
       JOIN Grados g ON gs.id_grado = g.id
       JOIN Grados_director gd ON g.id = gd.id_grado
       WHERE gd.id_director = $1
       ORDER BY p.nombre, p.apellido`,
      [directorId]
    );

    res.json({ success: true, parents: result.rows });
  } catch (error) {
    console.error('Error al obtener padres:', error);
    res.status(500).json({ success: false, message: 'Error al obtener padres' });
  }
};

// Crear nuevo maestro
const createTeacher = async (req, res) => {
  const { nombre, apellido, email, telefono, password } = req.body;

  try {
    // Verificar si el email ya existe
    const emailCheck = await db.getPool().query(
      'SELECT id FROM Maestros WHERE email = $1',
      [email]
    );

    if (emailCheck.rowCount > 0) {
      return res.status(400).json({ success: false, message: 'El email ya está en uso' });
    }

    const result = await db.getPool().query(
      `INSERT INTO Maestros (rol, nombre, apellido, email, telefono, password, activo) 
       VALUES (3, $1, $2, $3, $4, $5, true) 
       RETURNING id, nombre, apellido, email, telefono, activo`,
      [nombre, apellido, email, telefono, password]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Maestro creado correctamente', 
      teacher: result.rows[0] 
    });
  } catch (error) {
    console.error('Error al crear maestro:', error);
    res.status(500).json({ success: false, message: 'Error al crear maestro' });
  }
};

// Crear nuevo director
const createDirector = async (req, res) => {
  const { nombre, apellido, email, telefono, password } = req.body;

  try {
    // Verificar si el email ya existe
    const emailCheck = await db.getPool().query(
      'SELECT id FROM Directores WHERE email = $1',
      [email]
    );

    if (emailCheck.rowCount > 0) {
      return res.status(400).json({ success: false, message: 'El email ya está en uso' });
    }

    const result = await db.getPool().query(
      `INSERT INTO Directores (rol, nombre, apellido, email, telefono, password, activo) 
       VALUES (5, $1, $2, $3, $4, $5, true) 
       RETURNING id, nombre, apellido, email, telefono, activo`,
      [nombre, apellido, email, telefono, password]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Director creado correctamente', 
      director: result.rows[0] 
    });
  } catch (error) {
    console.error('Error al crear director:', error);
    res.status(500).json({ success: false, message: 'Error al crear director' });
  }
};

// Actualizar maestro
const updateTeacher = async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, email, telefono, activo } = req.body;

  try {
    const result = await db.getPool().query(
      `UPDATE Maestros 
       SET nombre = $1, apellido = $2, email = $3, telefono = $4, activo = $5 
       WHERE id = $6 
       RETURNING id, nombre, apellido, email, telefono, activo`,
      [nombre, apellido, email, telefono, activo, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Maestro no encontrado' });
    }

    res.json({ 
      success: true, 
      message: 'Maestro actualizado correctamente', 
      teacher: result.rows[0] 
    });
  } catch (error) {
    console.error('Error al actualizar maestro:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar maestro' });
  }
};

// Actualizar director
const updateDirector = async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, email, telefono, activo } = req.body;

  try {
    const result = await db.getPool().query(
      `UPDATE Directores 
       SET nombre = $1, apellido = $2, email = $3, telefono = $4, activo = $5 
       WHERE id = $6 
       RETURNING id, nombre, apellido, email, telefono, activo`,
      [nombre, apellido, email, telefono, activo, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Director no encontrado' });
    }

    res.json({ 
      success: true, 
      message: 'Director actualizado correctamente', 
      director: result.rows[0] 
    });
  } catch (error) {
    console.error('Error al actualizar director:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar director' });
  }
};

// Activar maestro
const activateTeacher = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.getPool().query(
      'UPDATE Maestros SET activo = true WHERE id = $1 RETURNING id, nombre, apellido',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Maestro no encontrado' });
    }

    res.json({ 
      success: true, 
      message: 'Maestro activado correctamente', 
      teacher: result.rows[0] 
    });
  } catch (error) {
    console.error('Error al activar maestro:', error);
    res.status(500).json({ success: false, message: 'Error al activar maestro' });
  }
};

// Desactivar maestro
const deactivateTeacher = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.getPool().query(
      'UPDATE Maestros SET activo = false WHERE id = $1 RETURNING id, nombre, apellido',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Maestro no encontrado' });
    }

    res.json({ 
      success: true, 
      message: 'Maestro desactivado correctamente', 
      teacher: result.rows[0] 
    });
  } catch (error) {
    console.error('Error al desactivar maestro:', error);
    res.status(500).json({ success: false, message: 'Error al desactivar maestro' });
  }
};

// Activar director
const activateDirector = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.getPool().query(
      'UPDATE Directores SET activo = true WHERE id = $1 RETURNING id, nombre, apellido',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Director no encontrado' });
    }

    res.json({ 
      success: true, 
      message: 'Director activado correctamente', 
      director: result.rows[0] 
    });
  } catch (error) {
    console.error('Error al activar director:', error);
    res.status(500).json({ success: false, message: 'Error al activar director' });
  }
};

// Desactivar director
const deactivateDirector = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.getPool().query(
      'UPDATE Directores SET activo = false WHERE id = $1 RETURNING id, nombre, apellido',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Director no encontrado' });
    }

    res.json({ 
      success: true, 
      message: 'Director desactivado correctamente', 
      director: result.rows[0] 
    });
  } catch (error) {
    console.error('Error al desactivar director:', error);
    res.status(500).json({ success: false, message: 'Error al desactivar director' });
  }
};

// === REPORT FUNCTIONS FOR PDF GENERATION ===

// Obtener reporte académico detallado
const getAcademicReport = async (req, res) => {
  const { grado, periodo } = req.query;
  const directorId = req.user.id;

  try {
    let query = `
      SELECT 
        g.grado,
        m.nombre as materia,
        CAST(ROUND(CAST(AVG(c.nota) AS numeric), 2) AS float) as promedio,
        COUNT(DISTINCT c.carnet_estudiante) as estudiantes,
        CONCAT(ma.nombre, ' ', ma.apellido) as maestro
      FROM Calificaciones c
      INNER JOIN Cursos cur ON c.id_curso = cur.id
      INNER JOIN Grado_seccion gs ON cur.id_grado_seccion = gs.id
      INNER JOIN Grados g ON gs.id_grado = g.id
      INNER JOIN Materias m ON cur.id_materia = m.id
      INNER JOIN Maestros ma ON cur.id_maestro = ma.id
      INNER JOIN Grados_director gd ON g.id = gd.id_grado
      WHERE gd.id_director = $1
    `;
    
    const params = [directorId];
    let paramCount = 1;

    if (grado) {
      paramCount++;
      query += ` AND g.id = $${paramCount}`;
      params.push(grado);
    }

    if (periodo) {
      paramCount++;
      query += ` AND c.id_tarea IN (
        SELECT id FROM Tareas WHERE trimestre_id = $${paramCount}
      )`;
      params.push(periodo);
    }

    query += `
      GROUP BY g.grado, m.nombre, ma.nombre, ma.apellido
      ORDER BY g.grado, m.nombre
    `;

    const result = await db.getPool().query(query, params);

    // Calcular estadísticas generales
    let promedioGeneral = 0;
    let totalEstudiantes = 0;
    let totalCursos = 0;
    let materias = new Set();

    if (result.rows.length > 0) {
      const promedios = result.rows.map(row => row.promedio);
      promedioGeneral = Math.round((promedios.reduce((a, b) => a + b, 0) / promedios.length) * 100) / 100;
      
      totalEstudiantes = result.rows.reduce((sum, row) => sum + parseInt(row.estudiantes), 0);
      totalCursos = result.rows.length;
      
      result.rows.forEach(row => materias.add(row.materia));
    }

    const reportData = {
      promedio: promedioGeneral,
      estudiantes: totalEstudiantes,
      cursos: totalCursos,
      materias: materias.size,
      detalles: result.rows
    };

    res.json({ success: true, report: reportData });
  } catch (error) {
    console.error('Error al obtener reporte académico:', error);
    res.status(500).json({ success: false, message: 'Error al generar el reporte académico' });
  }
};

// Obtener reporte de asistencia detallado
const getAttendanceReport = async (req, res) => {
  const { grado, periodo } = req.query;
  const directorId = req.user.id;

  try {
    let query = `
      WITH attendance_stats AS (
        SELECT 
          g.id as grado_id,
          g.grado,
          COUNT(DISTINCT e.carnet) as total_estudiantes,
          COUNT(a.id) as total_asistencias,
          COUNT(DISTINCT a.fecha) as dias_clase
        FROM Grados g
        INNER JOIN Grados_director gd ON g.id = gd.id_grado
        INNER JOIN Grado_seccion gs ON g.id = gs.id_grado
        INNER JOIN Estudiantes e ON gs.id = e.id_grado_seccion
        LEFT JOIN Asistencia a ON e.carnet = a.carnet_estudiante
        WHERE gd.id_director = $1
    `;

    const params = [directorId];
    let paramCount = 1;

    if (grado) {
      paramCount++;
      query += ` AND g.id = $${paramCount}`;
      params.push(grado);
    }

    if (periodo) {
      paramCount++;
      query += ` AND DATE_PART('month', a.fecha) BETWEEN 
        CASE 
          WHEN $${paramCount} = '1' THEN 1 
          WHEN $${paramCount} = '2' THEN 4 
          WHEN $${paramCount} = '3' THEN 7 
        END 
        AND 
        CASE 
          WHEN $${paramCount} = '1' THEN 3 
          WHEN $${paramCount} = '2' THEN 6 
          WHEN $${paramCount} = '3' THEN 9 
        END`;
      params.push(periodo);
    }

    query += `
        GROUP BY g.id, g.grado
      )
      SELECT 
        grado,
        total_estudiantes,
        total_asistencias,
        dias_clase,
        CASE 
          WHEN total_estudiantes > 0 AND dias_clase > 0 
          THEN CAST(ROUND(CAST((total_asistencias::float / (total_estudiantes * dias_clase)) * 100 AS numeric), 1) AS float)
          ELSE 0
        END as porcentaje
      FROM attendance_stats
      ORDER BY grado
    `;

    const result = await db.getPool().query(query, params);

    // Calcular estadísticas generales
    let promedioAsistencia = 0;
    let totalDiasClase = 0;
    let estudiantesPresentes = 0;
    let estudiantesAusentes = 0;

    if (result.rows.length > 0) {
      const porcentajes = result.rows.map(row => row.porcentaje).filter(p => p > 0);
      if (porcentajes.length > 0) {
        promedioAsistencia = Math.round((porcentajes.reduce((a, b) => a + b, 0) / porcentajes.length) * 10) / 10;
      }
      
      totalDiasClase = Math.max(...result.rows.map(row => row.dias_clase || 0));
      estudiantesPresentes = result.rows.reduce((sum, row) => sum + (row.total_asistencias || 0), 0);
      
      const totalEstudiantes = result.rows.reduce((sum, row) => sum + (row.total_estudiantes || 0), 0);
      estudiantesAusentes = (totalEstudiantes * totalDiasClase) - estudiantesPresentes;
    }

    const reportData = {
      promedio: promedioAsistencia,
      diasClase: totalDiasClase,
      estudiantesPresentes: estudiantesPresentes,
      estudiantesAusentes: Math.max(0, estudiantesAusentes),
      detalles: result.rows.map(row => ({
        grado: row.grado,
        totalEstudiantes: row.total_estudiantes,
        presentes: row.total_asistencias,
        ausentes: Math.max(0, (row.total_estudiantes * row.dias_clase) - row.total_asistencias),
        porcentaje: row.porcentaje
      }))
    };

    res.json({ success: true, report: reportData });
  } catch (error) {
    console.error('Error al obtener reporte de asistencia:', error);
    res.status(500).json({ success: false, message: 'Error al generar el reporte de asistencia' });
  }
};

// Obtener reporte de planificaciones detallado
const getPlanningReport = async (req, res) => {
  const { grado } = req.query;
  const directorId = req.user.id;

  try {
    let query = `
      SELECT 
        CONCAT(ma.nombre, ' ', ma.apellido) as maestro,
        m.nombre as materia,
        g.grado,
        p.mes,
        COALESCE(rp.observaciones, 'Pendiente') as estado,
        CURRENT_DATE as fecha_revision
      FROM Planificaciones p
      INNER JOIN Cursos c ON p.id_curso = c.id
      INNER JOIN Grado_seccion gs ON c.id_grado_seccion = gs.id
      INNER JOIN Grados g ON gs.id_grado = g.id
      INNER JOIN Materias m ON c.id_materia = m.id
      INNER JOIN Maestros ma ON c.id_maestro = ma.id
      INNER JOIN Grados_director gd ON g.id = gd.id_grado
      LEFT JOIN Revisiones_planificacion rp ON p.id = rp.id_planificacion AND rp.id_director = $1
      WHERE gd.id_director = $1
    `;

    const params = [directorId];
    let paramCount = 1;

    if (grado) {
      paramCount++;
      query += ` AND g.id = $${paramCount}`;
      params.push(grado);
    }

    query += ` ORDER BY g.grado, ma.apellido, p.mes`;

    const result = await db.getPool().query(query, params);

    // Calcular estadísticas
    const total = result.rows.length;
    const completadas = result.rows.filter(row => row.estado !== 'Pendiente').length;
    const progreso = total - completadas;
    const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;

    const reportData = {
      total,
      completadas,
      progreso,
      porcentaje,
      detalles: result.rows.map(row => ({
        maestro: row.maestro,
        materia: row.materia,
        grado: row.grado,
        mes: row.mes,
        estado: row.estado === 'Pendiente' ? 'Pendiente' : 'Completada',
        fechaRevision: row.fecha_revision
      }))
    };

    res.json({ success: true, report: reportData });
  } catch (error) {
    console.error('Error al obtener reporte de planificaciones:', error);
    res.status(500).json({ success: false, message: 'Error al generar el reporte de planificaciones' });
  }
};

// === STATISTICS FUNCTIONS (FOR DASHBOARD) ===

// Obtener estadísticas académicas
const getAcademicStatistics = async (req, res) => {
  const { grado, periodo } = req.query;
  const directorId = req.user.id;

  try {
    // Simplificar para estadísticas de dashboard
    let query = `
      SELECT 
        CAST(ROUND(CAST(AVG(c.nota) AS numeric), 1) AS float) as promedio,
        COUNT(DISTINCT c.carnet_estudiante) as estudiantes,
        COUNT(DISTINCT c.id_curso) as cursos
      FROM Calificaciones c
      INNER JOIN Cursos cur ON c.id_curso = cur.id
      INNER JOIN Grado_seccion gs ON cur.id_grado_seccion = gs.id
      INNER JOIN Grados g ON gs.id_grado = g.id
      INNER JOIN Grados_director gd ON g.id = gd.id_grado
      WHERE gd.id_director = $1
    `;

    const params = [directorId];
    let paramCount = 1;

    if (grado) {
      paramCount++;
      query += ` AND g.id = $${paramCount}`;
      params.push(grado);
    }

    if (periodo) {
      paramCount++;
      query += ` AND c.id_tarea IN (SELECT id FROM Tareas WHERE trimestre_id = $${paramCount})`;
      params.push(periodo);
    }

    const result = await db.getPool().query(query, params);
    
    const stats = result.rows[0] || { promedio: 0, estudiantes: 0, cursos: 0 };
    stats.materias = stats.cursos; // Simplificación para el dashboard

    res.json({ success: true, statistics: stats });
  } catch (error) {
    console.error('Error al obtener estadísticas académicas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas académicas' });
  }
};

// Obtener estadísticas de asistencia
const getAttendanceStatistics = async (req, res) => {
  const { grado, periodo } = req.query;
  const directorId = req.user.id;

  try {
    let query = `
      SELECT 
        COUNT(a.id) as total_asistencias,
        COUNT(DISTINCT e.carnet) as total_estudiantes,
        COUNT(DISTINCT DATE(a.fecha)) as dias_clase
      FROM Grados g
      INNER JOIN Grados_director gd ON g.id = gd.id_grado
      INNER JOIN Grado_seccion gs ON g.id = gs.id_grado
      INNER JOIN Estudiantes e ON gs.id = e.id_grado_seccion
      LEFT JOIN Asistencia a ON e.carnet = a.carnet_estudiante
      WHERE gd.id_director = $1
    `;

    const params = [directorId];
    let paramCount = 1;

    if (grado) {
      paramCount++;
      query += ` AND g.id = $${paramCount}`;
      params.push(grado);
    }

    const result = await db.getPool().query(query, params);
    const data = result.rows[0];

    const promedio = data.total_estudiantes && data.dias_clase ? 
      Math.round((data.total_asistencias / (data.total_estudiantes * data.dias_clase)) * 1000) / 10 : 0;

    const stats = {
      promedio: promedio,
      diasClase: data.dias_clase || 0,
      estudiantesPresentes: data.total_asistencias || 0,
      estudiantesAusentes: Math.max(0, (data.total_estudiantes * data.dias_clase) - data.total_asistencias)
    };

    res.json({ success: true, statistics: stats });
  } catch (error) {
    console.error('Error al obtener estadísticas de asistencia:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas de asistencia' });
  }
};

// Obtener estadísticas de planificaciones
const getPlanningStatistics = async (req, res) => {
  const { grado } = req.query;
  const directorId = req.user.id;

  try {
    let query = `
      SELECT 
        COUNT(*) as total,
        COUNT(rp.id) as completadas
      FROM Planificaciones p
      INNER JOIN Cursos c ON p.id_curso = c.id
      INNER JOIN Grado_seccion gs ON c.id_grado_seccion = gs.id
      INNER JOIN Grados g ON gs.id_grado = g.id
      INNER JOIN Grados_director gd ON g.id = gd.id_grado
      LEFT JOIN Revisiones_planificacion rp ON p.id = rp.id_planificacion AND rp.id_director = $1
      WHERE gd.id_director = $1
    `;

    const params = [directorId];

    if (grado) {
      query += ` AND g.id = $2`;
      params.push(grado);
    }

    const result = await db.getPool().query(query, params);
    const data = result.rows[0];

    const total = parseInt(data.total) || 0;
    const completadas = parseInt(data.completadas) || 0;
    const progreso = total - completadas;
    const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;

    const stats = {
      total,
      completadas,
      progreso,
      porcentaje
    };

    res.json({ success: true, statistics: stats });
  } catch (error) {
    console.error('Error al obtener estadísticas de planificaciones:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas de planificaciones' });
  }
};

module.exports = {
  getGradosDelDirector,
  getCursosPorGrado,
  getAllTeachers,
  getAllStudents,
  getAllParents,
  createTeacher,
  updateTeacher,
  activateTeacher,
  deactivateTeacher,
  getAcademicReport,
  getAttendanceReport,
  getPlanningReport,
  getAcademicStatistics,
  getAttendanceStatistics,
  getPlanningStatistics
};
