const db = require('../database_cn');

/**
 * Obtener asistencia de un estudiante específico para padres
 */
async function getStudentAttendance(req, res) {
  const { studentCarnet } = req.params;
  const { startDate, endDate, subjectId } = req.query;

  // Validar que se proporcionen las fechas
  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: 'Se requieren las fechas de inicio (startDate) y fin (endDate)'
    });
  }

  try {
    // Verificar que el estudiante existe
    const studentCheck = `
      SELECT carnet, nombre, apellido 
      FROM Estudiantes 
      WHERE carnet = $1
    `;
    const { rows: studentRows } = await db.getPool().query(studentCheck, [studentCarnet]);
    
    if (studentRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Estudiante no encontrado' 
      });
    }

    // Obtener todas las materias del estudiante
    const subjectsQuery = `
      SELECT DISTINCT c.id, m.nombre as materia
      FROM Cursos c
      JOIN Materias m ON c.id_materia = m.id
      JOIN Estudiantes e ON e.id_grado_seccion = c.id_grado_seccion
      WHERE e.carnet = $1
      ORDER BY m.nombre
    `;
    const { rows: subjects } = await db.getPool().query(subjectsQuery, [studentCarnet]);

    // Construir consulta de asistencia con filtros opcionales
    let attendanceQuery = `
      SELECT 
        a.fecha,
        a.estado,
        c.id as subject_id,
        m.nombre as subject_name
      FROM Asistencia a
      JOIN Cursos c ON a.id_curso = c.id
      JOIN Materias m ON c.id_materia = m.id
      JOIN Estudiantes e ON e.id_grado_seccion = c.id_grado_seccion
      WHERE a.carnet_estudiante = $1
        AND DATE(a.fecha) BETWEEN $2 AND $3
    `;
    
    const queryParams = [studentCarnet, startDate, endDate];
    
    // Filtrar por materia si se especifica
    if (subjectId) {
      attendanceQuery += ' AND c.id = $4';
      queryParams.push(subjectId);
    }
    
    attendanceQuery += ' ORDER BY a.fecha DESC, m.nombre';
    
    const { rows: attendanceRows } = await db.getPool().query(attendanceQuery, queryParams);

    // Formatear datos para el frontend
    const attendance = attendanceRows.map(row => ({
      date: row.fecha,
      status: row.estado,
      subjectId: row.subject_id,
      subjectName: row.subject_name
    }));

    // Obtener registros recientes (últimos 10)
    const recentQuery = `
      SELECT 
        a.fecha,
        a.estado,
        c.id as subject_id,
        m.nombre as subject_name
      FROM Asistencia a
      JOIN Cursos c ON a.id_curso = c.id
      JOIN Materias m ON c.id_materia = m.id
      WHERE a.carnet_estudiante = $1
      ORDER BY a.fecha DESC
      LIMIT 10
    `;
    
    const { rows: recentRows } = await db.getPool().query(recentQuery, [studentCarnet]);
    
    const recent = recentRows.map(row => ({
      date: row.fecha,
      status: row.estado,
      subjectId: row.subject_id,
      subjectName: row.subject_name
    }));

    res.json({
      success: true,
      attendance,
      recent,
      subjects: subjects.map(s => ({ id: s.id, materia: s.materia }))
    });

  } catch (error) {
    console.error('Error en getStudentAttendance:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener la información de asistencia del estudiante' 
    });
  }
}

/**
 * Obtener resumen de asistencia de un estudiante
 */
async function getStudentAttendanceSummary(req, res) {
  const { studentCarnet } = req.params;
  const { period = 'month' } = req.query;

  try {
    // Calcular rango de fechas según el periodo
    let startDate = new Date();
    const endDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'semester':
        // Asumiendo semestre actual
        const currentMonth = endDate.getMonth();
        if (currentMonth >= 1 && currentMonth <= 6) {
          // Primer semestre (feb-jun)
          startDate = new Date(endDate.getFullYear(), 1, 1);
        } else {
          // Segundo semestre (ago-dic)
          startDate = new Date(endDate.getFullYear(), 7, 1);
        }
        break;
      default:
        startDate.setMonth(endDate.getMonth() - 1);
    }

    const summaryQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE a.estado = 'present') as present_count,
        COUNT(*) FILTER (WHERE a.estado = 'late') as late_count,
        COUNT(*) FILTER (WHERE a.estado = 'absent') as absent_count,
        COUNT(*) as total_records,
        m.nombre as subject_name,
        c.id as subject_id
      FROM Asistencia a
      JOIN Cursos c ON a.id_curso = c.id
      JOIN Materias m ON c.id_materia = m.id
      WHERE a.carnet_estudiante = $1
        AND DATE(a.fecha) BETWEEN $2 AND $3
        AND EXTRACT(DOW FROM a.fecha) NOT IN (0, 6) -- Excluir fines de semana
      GROUP BY c.id, m.nombre
      ORDER BY m.nombre
    `;

    const { rows } = await db.getPool().query(summaryQuery, [
      studentCarnet,
      startDate.toISOString().slice(0, 10),
      endDate.toISOString().slice(0, 10)
    ]);

    // Calcular totales generales
    const totals = rows.reduce((acc, row) => {
      acc.present += parseInt(row.present_count) || 0;
      acc.late += parseInt(row.late_count) || 0;
      acc.absent += parseInt(row.absent_count) || 0;
      acc.total += parseInt(row.total_records) || 0;
      return acc;
    }, { present: 0, late: 0, absent: 0, total: 0 });

    // Calcular porcentaje de asistencia general
    const attendancePercentage = totals.total > 0 ? 
      (((totals.present + (totals.late * 0.5)) / totals.total) * 100).toFixed(1) : 
      '0.0';

    res.json({
      success: true,
      summary: {
        period,
        totals,
        attendancePercentage: parseFloat(attendancePercentage),
        bySubject: rows.map(row => ({
          subjectId: row.subject_id,
          subjectName: row.subject_name,
          present: parseInt(row.present_count) || 0,
          late: parseInt(row.late_count) || 0,
          absent: parseInt(row.absent_count) || 0,
          total: parseInt(row.total_records) || 0,
          percentage: row.total_records > 0 ? 
            (((parseInt(row.present_count) + (parseInt(row.late_count) * 0.5)) / parseInt(row.total_records)) * 100).toFixed(1) : 
            '0.0'
        }))
      }
    });

  } catch (error) {
    console.error('Error en getStudentAttendanceSummary:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener el resumen de asistencia' 
    });
  }
}

module.exports = {
  getStudentAttendance,
  getStudentAttendanceSummary
};