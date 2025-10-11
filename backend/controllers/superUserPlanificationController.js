const db = require('../database_cn');

// Get all planifications grouped by grade for superusers
const getAllPlanificationsByGrade = async (req, res) => {
  try {
    const query = `
      SELECT 
        g.id as grado_id,
        g.grado as grado_nombre,
        p.id as planificacion_id,
        p.mes,
        p.ciclo_escolar,
        p.estado,
        c.id as curso_id,
        m.nombre as materia_nombre,
        ma.nombre as maestro_nombre,
        ma.apellido as maestro_apellido,
        ma.id as maestro_id,
        COUNT(dp.id) as total_tareas,
        SUM(dp.puntos_tarea) as total_puntos
      FROM Planificaciones p
      INNER JOIN Cursos c ON p.id_curso = c.id
      INNER JOIN Grado_seccion gs ON c.id_grado_seccion = gs.id
      INNER JOIN Grados g ON gs.id_grado = g.id
      INNER JOIN Materias m ON c.id_materia = m.id
      INNER JOIN Maestros ma ON c.id_maestro = ma.id
      LEFT JOIN Detalle_planificacion dp ON p.id = dp.id_planificacion
      WHERE ma.activo = true
      GROUP BY g.id, g.grado, p.id, p.mes, p.ciclo_escolar, p.estado, 
               c.id, m.nombre, ma.nombre, ma.apellido, ma.id
      ORDER BY g.grado ASC, m.nombre ASC, p.mes ASC
    `;

    const result = await db.getPool().query(query);

    // Group the results by grade
    const planificationsByGrade = {};

    result.rows.forEach(row => {
      const gradeKey = row.grado_nombre;

      if (!planificationsByGrade[gradeKey]) {
        planificationsByGrade[gradeKey] = {
          grado_id: row.grado_id,
          grado_nombre: row.grado_nombre,
          planificaciones: []
        };
      }

      planificationsByGrade[gradeKey].planificaciones.push({
        planificacion_id: row.planificacion_id,
        mes: row.mes,
        ciclo_escolar: row.ciclo_escolar,
        estado: row.estado,
        curso_id: row.curso_id,
        materia_nombre: row.materia_nombre,
        maestro: {
          id: row.maestro_id,
          nombre: row.maestro_nombre,
          apellido: row.maestro_apellido
        },
        estadisticas: {
          total_tareas: parseInt(row.total_tareas) || 0,
          total_puntos: parseFloat(row.total_puntos) || 0
        }
      });
    });

    // Convert to array format
    const responseData = Object.values(planificationsByGrade);

    res.status(200).json({
      success: true,
      data: responseData,
      total_grados: responseData.length,
      total_planificaciones: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching planifications by grade:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las planificaciones por grado'
    });
  }
};

// Get detailed planification by ID for superusers
const getPlanificationDetailById = async (req, res) => {
  const { planificationId } = req.params;

  try {
    // Get planification basic info with related data
    const planificationQuery = `
      SELECT 
        p.id as planificacion_id,
        p.mes,
        p.ciclo_escolar,
        p.estado,
        c.id as curso_id,
        m.nombre as materia_nombre,
        ma.nombre as maestro_nombre,
        ma.apellido as maestro_apellido,
        ma.id as maestro_id,
        g.grado as grado_nombre,
        g.id as grado_id
      FROM Planificaciones p
      INNER JOIN Cursos c ON p.id_curso = c.id
      INNER JOIN Grado_seccion gs ON c.id_grado_seccion = gs.id
      INNER JOIN Grados g ON gs.id_grado = g.id
      INNER JOIN Materias m ON c.id_materia = m.id
      INNER JOIN Maestros ma ON c.id_maestro = ma.id
      WHERE p.id = $1
    `;

    const planificationResult = await db.getPool().query(planificationQuery, [planificationId]);

    if (planificationResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Planificación no encontrada'
      });
    }

    const planification = planificationResult.rows[0];

    // Get tasks/details
    const tasksQuery = `
      SELECT 
        id,
        tema_tarea,
        puntos_tarea
      FROM Detalle_planificacion
      WHERE id_planificacion = $1
      ORDER BY id ASC
    `;

    const tasksResult = await db.getPool().query(tasksQuery, [planificationId]);

    // Get reviews/observations
    const reviewsQuery = `
      SELECT 
        rp.id,
        rp.observaciones,
        rp.fecha,
        d.nombre as director_nombre,
        d.apellido as director_apellido
      FROM Revisiones_planificacion rp
      INNER JOIN Directores d ON rp.id_director = d.id
      WHERE rp.id_planificacion = $1
      ORDER BY rp.fecha DESC
    `;

    const reviewsResult = await db.getPool().query(reviewsQuery, [planificationId]);

    // Build complete response
    const detailedPlanification = {
      planificacion_id: planification.planificacion_id,
      mes: planification.mes,
      ciclo_escolar: planification.ciclo_escolar,
      estado: planification.estado,
      curso: {
        id: planification.curso_id,
        materia_nombre: planification.materia_nombre,
        grado: {
          id: planification.grado_id,
          nombre: planification.grado_nombre
        }
      },
      maestro: {
        id: planification.maestro_id,
        nombre: planification.maestro_nombre,
        apellido: planification.maestro_apellido
      },
      tareas: tasksResult.rows.map(task => ({
        id: task.id,
        tema_tarea: task.tema_tarea,
        puntos_tarea: parseFloat(task.puntos_tarea)
      })),
      revisiones: reviewsResult.rows.map(review => ({
        id: review.id,
        observaciones: review.observaciones,
        fecha: review.fecha,
        director: {
          nombre: review.director_nombre,
          apellido: review.director_apellido
        }
      })),
      estadisticas: {
        total_tareas: tasksResult.rows.length,
        total_puntos: tasksResult.rows.reduce((sum, task) => sum + parseFloat(task.puntos_tarea), 0)
      }
    };

    res.status(200).json({
      success: true,
      data: detailedPlanification
    });

  } catch (error) {
    console.error('Error fetching planification detail:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el detalle de la planificación'
    });
  }
};

// Get planifications statistics for superusers
const getPlanificationsStatistics = async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_planificaciones,
        COUNT(CASE WHEN p.estado = 'en revision' THEN 1 END) as en_revision,
        COUNT(CASE WHEN p.estado = 'aceptada' THEN 1 END) as aceptadas,
        COUNT(CASE WHEN p.estado = 'rechazada' THEN 1 END) as rechazadas,
        COUNT(DISTINCT gs.id_grado) as total_grados_con_planificaciones,
        COUNT(DISTINCT c.id_maestro) as total_maestros_con_planificaciones,
        p.ciclo_escolar
      FROM Planificaciones p
      INNER JOIN Cursos c ON p.id_curso = c.id
      INNER JOIN Grado_seccion gs ON c.id_grado_seccion = gs.id
      INNER JOIN Maestros ma ON c.id_maestro = ma.id
      WHERE ma.activo = true
      GROUP BY p.ciclo_escolar
      ORDER BY p.ciclo_escolar DESC
    `;

    const result = await db.getPool().query(statsQuery);

    // Get grade-specific statistics
    const gradeStatsQuery = `
      SELECT 
        g.grado as grado_nombre,
        COUNT(p.id) as total_planificaciones,
        COUNT(CASE WHEN p.estado = 'en revision' THEN 1 END) as en_revision,
        COUNT(CASE WHEN p.estado = 'aceptada' THEN 1 END) as aceptadas,
        COUNT(CASE WHEN p.estado = 'rechazada' THEN 1 END) as rechazadas
      FROM Grados g
      LEFT JOIN Grado_seccion gs ON g.id = gs.id_grado
      LEFT JOIN Cursos c ON gs.id = c.id_grado_seccion
      LEFT JOIN Planificaciones p ON c.id = p.id_curso
      LEFT JOIN Maestros ma ON c.id_maestro = ma.id
      WHERE ma.activo = true OR ma.activo IS NULL
      GROUP BY g.id, g.grado
      ORDER BY g.grado ASC
    `;

    const gradeStatsResult = await db.getPool().query(gradeStatsQuery);

    res.status(200).json({
      success: true,
      data: {
        general_statistics: result.rows,
        grade_statistics: gradeStatsResult.rows
      }
    });

  } catch (error) {
    console.error('Error fetching planifications statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las estadísticas de planificaciones'
    });
  }
};

// Get planifications by specific grade
const getPlanificationsBySpecificGrade = async (req, res) => {
  const { gradeId } = req.params;

  try {
    const query = `
      SELECT 
        p.id as planificacion_id,
        p.mes,
        p.ciclo_escolar,
        p.estado,
        c.id as curso_id,
        m.nombre as materia_nombre,
        ma.nombre as maestro_nombre,
        ma.apellido as maestro_apellido,
        ma.id as maestro_id,
        g.grado as grado_nombre,
        COUNT(dp.id) as total_tareas,
        SUM(dp.puntos_tarea) as total_puntos
      FROM Planificaciones p
      INNER JOIN Cursos c ON p.id_curso = c.id
      INNER JOIN Grado_seccion gs ON c.id_grado_seccion = gs.id
      INNER JOIN Grados g ON gs.id_grado = g.id
      INNER JOIN Materias m ON c.id_materia = m.id
      INNER JOIN Maestros ma ON c.id_maestro = ma.id
      LEFT JOIN Detalle_planificacion dp ON p.id = dp.id_planificacion
      WHERE g.id = $1 AND ma.activo = true
      GROUP BY p.id, p.mes, p.ciclo_escolar, p.estado, 
               c.id, m.nombre, ma.nombre, ma.apellido, ma.id, g.grado
      ORDER BY m.nombre ASC, p.mes ASC
    `;

    const result = await db.getPool().query(query, [gradeId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No se encontraron planificaciones para este grado'
      });
    }

    const planifications = result.rows.map(row => ({
      planificacion_id: row.planificacion_id,
      mes: row.mes,
      ciclo_escolar: row.ciclo_escolar,
      estado: row.estado,
      curso_id: row.curso_id,
      materia_nombre: row.materia_nombre,
      maestro: {
        id: row.maestro_id,
        nombre: row.maestro_nombre,
        apellido: row.maestro_apellido
      },
      estadisticas: {
        total_tareas: parseInt(row.total_tareas) || 0,
        total_puntos: parseFloat(row.total_puntos) || 0
      }
    }));

    res.status(200).json({
      success: true,
      data: {
        grado_nombre: result.rows[0].grado_nombre,
        planificaciones: planifications,
        total_planificaciones: planifications.length
      }
    });

  } catch (error) {
    console.error('Error fetching planifications by specific grade:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las planificaciones del grado específico'
    });
  }
};

module.exports = {
  getAllPlanificationsByGrade,
  getPlanificationDetailById,
  getPlanificationsStatistics,
  getPlanificationsBySpecificGrade
};
