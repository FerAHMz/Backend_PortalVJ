const db = require('../database_cn')

async function getAttendance(req, res) {
  const { courseId } = req.params
  const { date } = req.query

  try {
    //Obtener todos los estudiantes del curso
    const studentsQ = `
      SELECT e.carnet, e.nombre, e.apellido
      FROM Estudiantes e
      JOIN Cursos c ON e.id_grado_seccion = c.id_grado_seccion
      WHERE c.id = $1
    `
    const { rows: students } = await db.getPool().query(studentsQ, [courseId])

    //Obtener el estado de asistencia para esa fecha y curso
    const attendanceQ = `
      SELECT carnet_estudiante, estado
      FROM Asistencia
      WHERE id_curso = $1 AND DATE(fecha) = $2
    `
    const { rows: attendanceRows } = await db.getPool().query(attendanceQ, [courseId, date])

    //Mapear estados por carnet
    const attendanceStatus = {}
    attendanceRows.forEach(r => {
      attendanceStatus[r.carnet_estudiante] = r.estado
    })

    res.json({ students, attendanceStatus })
  } catch (error) {
    console.error('Error en getAttendance:', error)
    res.status(500).json({ error: 'Error al obtener asistencia' })
  }
}

async function postAttendance(req, res) {
  const { courseId } = req.params
  const { date, attendance } = req.body

  try {
    //Borrar registros previos para evitar duplicados 
    await db.getPool().query(
      `DELETE FROM Asistencia WHERE id_curso = $1 AND DATE(fecha) = $2`,
      [courseId, date]
    )

    //Insertar o actualizar todos los estados (present, absent, late o null)
    const insertQ = `
      INSERT INTO Asistencia (id_curso, carnet_estudiante, fecha, estado)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id_curso, carnet_estudiante, fecha)
      DO UPDATE SET estado = EXCLUDED.estado
    `

    for (const [carnet, status] of Object.entries(attendance)) {
      if (status === 'present' || status === 'absent'|| status === 'late') {
        await db.getPool().query(insertQ, [
          courseId,
          carnet,
          date,
          status
        ])
      }
    }

    res.json({ message: 'Asistencia registrada correctamente' })
  } catch (error) {
    console.error('Error en postAttendance:', error)
    res.status(500).json({ error: 'Error al guardar asistencia' })
  }
}

async function getAttendanceReport(req, res) {
  const { courseId } = req.params;
  const { startDate, endDate } = req.query;

  try {
    const reportQuery = `
      SELECT 
        e.carnet,
        e.nombre,
        e.apellido,
        COUNT(a.*) FILTER (
          WHERE EXTRACT(DOW FROM a.fecha) NOT IN (0, 6)
        ) AS total_school_days,
        COUNT(a.*) FILTER (
          WHERE a.estado = 'present' AND EXTRACT(DOW FROM a.fecha) NOT IN (0, 6)
        ) AS present_count,
        COUNT(a.*) FILTER (
          WHERE a.estado = 'late' AND EXTRACT(DOW FROM a.fecha) NOT IN (0, 6)
        ) AS late_count,
        COUNT(a.*) FILTER (
          WHERE a.estado = 'absent' AND EXTRACT(DOW FROM a.fecha) NOT IN (0, 6)
        ) AS absent_count
      FROM Estudiantes e
      LEFT JOIN Asistencia a ON e.carnet = a.carnet_estudiante
        AND a.id_curso = $1
        AND DATE(a.fecha) BETWEEN $2 AND $3
      WHERE e.id_grado_seccion = (
        SELECT id_grado_seccion FROM Cursos WHERE id = $1
      )
      GROUP BY e.carnet, e.nombre, e.apellido
      ORDER BY e.apellido, e.nombre
    `;

    const { rows } = await db.getPool().query(reportQuery, [courseId, startDate, endDate]);
    
    res.json({ report: rows });
  } catch (error) {
    console.error('Error en getAttendanceReport:', error);
    res.status(500).json({ error: 'Error al generar el reporte' });
  }
}

module.exports = {
  getAttendance,
  postAttendance,
  getAttendanceReport
}
