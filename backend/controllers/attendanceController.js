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

    //Insertar o actualizar todos los estados (present, absent o null)
    const insertQ = `
      INSERT INTO Asistencia (id_curso, carnet_estudiante, fecha, estado)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id_curso, carnet_estudiante, fecha)
      DO UPDATE SET estado = EXCLUDED.estado
    `

    for (const [carnet, status] of Object.entries(attendance)) {
      if (status === 'present' || status === 'absent') {
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

module.exports = {
  getAttendance,
  postAttendance
}
