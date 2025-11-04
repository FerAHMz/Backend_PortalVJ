/**
 * Controller para manejar las promociones de estudiantes
 */
const db = require('../database_cn');

/**
 * Simular promociones sin ejecutar cambios reales
 */
const simularPromociones = async (req, res) => {
  try {
    const { trimestreId, notaMinima = 60.0 } = req.query;
    
    if (!trimestreId) {
      return res.status(400).json({
        success: false,
        message: 'El ID del trimestre es requerido'
      });
    }

    const query = `SELECT * FROM simular_promociones($1, $2)`;
    const result = await db.getPool().query(query, [trimestreId, notaMinima]);

    res.json({
      success: true,
      message: 'Simulación de promociones completada',
      data: {
        estudiantes: result.rows,
        resumen: {
          total: result.rows.length,
          promoveran: result.rows.filter(r => r.resultado_simulado === 'PROMOVERIA').length,
          repetiran: result.rows.filter(r => r.resultado_simulado === 'REPETIRIA').length,
          graduaran: result.rows.filter(r => r.resultado_simulado === 'GRADUARIA').length
        }
      }
    });
  } catch (error) {
    console.error('Error al simular promociones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al simular promociones'
    });
  }
};

/**
 * Ejecutar promociones reales con auditoría
 */
const ejecutarPromociones = async (req, res) => {
  try {
    const { trimestreId, cicloEscolar, notaMinima = 60.0, observaciones } = req.body;
    
    if (!trimestreId || !cicloEscolar) {
      return res.status(400).json({
        success: false,
        message: 'El ID del trimestre y ciclo escolar son requeridos'
      });
    }

    // Verificar que el usuario tenga permisos (solo directores y super usuarios)
    const userRole = req.user.role;
    if (userRole !== 'Director' && userRole !== 'SUP') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para ejecutar promociones'
      });
    }

    const query = `SELECT * FROM ejecutar_promocion_con_auditoria($1, $2, $3, $4)`;
    const result = await db.getPool().query(query, [
      trimestreId, 
      cicloEscolar, 
      notaMinima, 
      observaciones
    ]);

    const estadisticas = result.rows[0];

    res.json({
      success: true,
      message: 'Promociones ejecutadas exitosamente',
      data: {
        estadisticas: {
          totalEstudiantes: estadisticas.total_estudiantes,
          promovidos: estadisticas.promovidos,
          repiten: estadisticas.repiten,
          graduados: estadisticas.graduados,
          sinSeccion: estadisticas.sin_seccion
        },
        parametros: {
          trimestreId,
          cicloEscolar,
          notaMinima,
          observaciones
        }
      }
    });
  } catch (error) {
    console.error('Error al ejecutar promociones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al ejecutar promociones'
    });
  }
};

/**
 * Obtener estado actual de estudiantes con sus promedios
 */
const obtenerEstadoEstudiantes = async (req, res) => {
  try {
    const { grado } = req.query;
    
    let query = `SELECT * FROM vista_estudiantes_con_promedio`;
    let params = [];
    
    if (grado) {
      query += ` WHERE grado = $1`;
      params.push(grado);
    }
    
    query += ` ORDER BY grado, seccion, apellido, nombre`;
    
    const result = await db.getPool().query(query, params);

    // Agrupar por estado académico
    const estudiantes = result.rows;
    const resumen = {
      total: estudiantes.length,
      aptoPromocion: estudiantes.filter(e => e.estado_academico === 'APTO_PROMOCION').length,
      riesgoRepetir: estudiantes.filter(e => e.estado_academico === 'RIESGO_REPETIR').length
    };

    res.json({
      success: true,
      data: {
        estudiantes,
        resumen
      }
    });
  } catch (error) {
    console.error('Error al obtener estado de estudiantes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener historial de promociones
 */
const obtenerHistorialPromociones = async (req, res) => {
  try {
    const { cicloEscolar, trimestreId, estadoPromocion, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        hp.*,
        e.nombre,
        e.apellido,
        ga.grado as grado_anterior,
        gn.grado as grado_nuevo,
        t.nombre as trimestre
      FROM Historial_promociones hp
      INNER JOIN Estudiantes e ON hp.carnet_estudiante = e.carnet
      INNER JOIN Grados ga ON hp.grado_anterior_id = ga.id
      LEFT JOIN Grados gn ON hp.grado_nuevo_id = gn.id
      INNER JOIN Trimestres t ON hp.trimestre_id = t.id
      WHERE 1=1
    `;
    
    let params = [];
    let paramCount = 0;
    
    if (cicloEscolar) {
      paramCount++;
      query += ` AND hp.ciclo_escolar = $${paramCount}`;
      params.push(cicloEscolar);
    }
    
    if (trimestreId) {
      paramCount++;
      query += ` AND hp.trimestre_id = $${paramCount}`;
      params.push(trimestreId);
    }
    
    if (estadoPromocion) {
      paramCount++;
      query += ` AND hp.estado_promocion = $${paramCount}`;
      params.push(estadoPromocion);
    }
    
    query += ` ORDER BY hp.fecha_promocion DESC`;
    
    if (limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(limit);
    }
    
    if (offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);
    }
    
    const result = await db.getPool().query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al obtener historial de promociones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener promedios detallados de un estudiante específico
 */
const obtenerPromedioPorEstudiante = async (req, res) => {
  try {
    const { carnetEstudiante } = req.params;
    const { trimestreId } = req.query;
    
    if (!carnetEstudiante) {
      return res.status(400).json({
        success: false,
        message: 'El carnet del estudiante es requerido'
      });
    }

    // Calcular promedio general
    const promedioQuery = `SELECT calcular_promedio_estudiante($1, $2) as promedio`;
    const promedioResult = await db.getPool().query(promedioQuery, [carnetEstudiante, trimestreId || null]);
    
    // Obtener calificaciones detalladas por materia
    const detalleQuery = `
      SELECT 
        m.nombre as materia,
        g.grado,
        AVG(c.nota) as promedio_materia,
        COUNT(c.nota) as total_calificaciones,
        MIN(c.nota) as nota_minima,
        MAX(c.nota) as nota_maxima
      FROM Calificaciones c
      INNER JOIN Cursos cu ON c.id_curso = cu.id
      INNER JOIN Materias m ON cu.id_materia = m.id
      INNER JOIN Grado_seccion gs ON cu.id_grado_seccion = gs.id
      INNER JOIN Grados g ON gs.id_grado = g.id
      LEFT JOIN Cursos_tareas ct ON cu.id = ct.id_curso
      LEFT JOIN Tareas t ON ct.id_tareas = t.id
      WHERE c.carnet_estudiante = $1
      ${trimestreId ? 'AND t.trimestre_id = $2' : ''}
      GROUP BY m.nombre, g.grado
      ORDER BY m.nombre
    `;
    
    const detalleParams = [carnetEstudiante];
    if (trimestreId) {
      detalleParams.push(trimestreId);
    }
    
    const detalleResult = await db.getPool().query(detalleQuery, detalleParams);
    
    // Obtener información del estudiante
    const estudianteQuery = `
      SELECT e.*, g.grado, s.seccion
      FROM Estudiantes e
      INNER JOIN Grado_seccion gs ON e.id_grado_seccion = gs.id
      INNER JOIN Grados g ON gs.id_grado = g.id
      INNER JOIN Secciones s ON gs.id_seccion = s.id
      WHERE e.carnet = $1
    `;
    const estudianteResult = await db.getPool().query(estudianteQuery, [carnetEstudiante]);
    
    if (estudianteResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Estudiante no encontrado'
      });
    }

    const promedioGeneral = parseFloat(promedioResult.rows[0].promedio);
    const estadoAcademico = promedioGeneral >= 60 ? 'APTO_PROMOCION' : 'RIESGO_REPETIR';
    
    res.json({
      success: true,
      data: {
        estudiante: estudianteResult.rows[0],
        promedioGeneral: promedioGeneral,
        estadoAcademico: estadoAcademico,
        detallesPorMateria: detalleResult.rows,
        parametros: {
          carnetEstudiante,
          trimestreId: trimestreId || 'TODOS'
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener promedio del estudiante:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  simularPromociones,
  ejecutarPromociones,
  obtenerEstadoEstudiantes,
  obtenerHistorialPromociones,
  obtenerPromedioPorEstudiante
};