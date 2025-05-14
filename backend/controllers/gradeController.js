const db = require('../database_cn');

exports.getNetAverages = async (req, res) => {
  try {
    const { courseId } = req.params;
    console.log(`Calculando promedios para curso ${courseId}`);

    const courseQuery = `
      SELECT c.id, m.nombre AS materia, gr.grado, s.seccion
      FROM cursos c
      JOIN materias m ON c.id_materia = m.id
      JOIN grado_seccion gs ON c.id_grado_seccion = gs.id
      JOIN grados gr ON gs.id_grado = gr.id
      JOIN secciones s ON gs.id_seccion = s.id
      WHERE c.id = $1
    `;
    const courseRes = await db.getPool().query(courseQuery, [courseId]);

    if (courseRes.rows.length === 0) {
      console.log(`Curso ${courseId} no encontrado`);
      return res.status(404).json({ 
        success: false,
        error: 'Curso no encontrado' 
      });
    }

    const gradesQuery = `
      SELECT 
        e.carnet, e.nombre, e.apellido,
        t.id AS task_id, t.titulo, t.valor AS max_points,
        g.nota AS points_earned
      FROM cursos c
      JOIN grado_seccion gs ON c.id_grado_seccion = gs.id
      JOIN grados gr ON gs.id_grado = gr.id
      JOIN secciones s ON gs.id_seccion = s.id
      JOIN estudiantes e ON e.id_grado_seccion = gs.id
      JOIN cursos_tareas ct ON c.id = ct.id_curso
      JOIN tareas t ON ct.id_tareas = t.id
      LEFT JOIN calificaciones g 
        ON e.carnet = g.carnet_estudiante 
        AND c.id = g.id_curso 
        AND t.id = g.id_tarea
      WHERE c.id = $1
      ORDER BY e.carnet, t.id
    `;
    
    const { rows } = await db.getPool().query(gradesQuery, [courseId]);
    console.log(`Datos obtenidos: ${rows.length} registros`);

    const students = new Map();
    const tasks = new Map();

    rows.forEach(row => {
      if (!students.has(row.carnet)) {
        students.set(row.carnet, {
          nombre: row.nombre,
          apellido: row.apellido,
          tasks: [],
          totalEarned: 0,
          totalPossible: 0,
        });
      }

      const student = students.get(row.carnet);
      
      if (row.points_earned !== null) {
        student.tasks.push({
          taskId: row.task_id,
          pointsEarned: row.points_earned,
          percentage: (row.points_earned / row.max_points) * 100,
        });
        student.totalEarned += row.points_earned;
        student.totalPossible += row.max_points;
      }

      if (!tasks.has(row.task_id)) {
        tasks.set(row.task_id, {
          id: row.task_id,
          title: row.titulo,
          maxPoints: row.max_points,
        });
      }
    });

    const totalPossiblePoints = Array.from(tasks.values())
      .reduce((sum, task) => sum + task.maxPoints, 0);

    const studentResults = Array.from(students.entries()).map(([carnet, data]) => ({
      carnet,
      ...data,
      average: data.totalPossible > 0 
        ? parseFloat(((data.totalEarned / data.totalPossible) * 100).toFixed(2))
        : null,
    }));
      
    const validAverages = studentResults.filter(s => s.average !== null);
    const classAverage = validAverages.length > 0
      ? parseFloat((
          validAverages.reduce((sum, s) => sum + s.average, 0) / validAverages.length
        ).toFixed(2))
      : null;
      

    console.log(`Procesamiento completado para curso ${courseId}`);
    res.json({
      success: true,
      course: courseRes.rows[0],
      students: studentResults,
      summary: {
        totalStudents: students.size,
        totalPossiblePoints,
        classAverage,
      },
    });

  } catch (error) {
    console.error('Error en getNetAverages:', {
      message: error.message,
      stack: error.stack,
      courseId: req.params.courseId
    });
    res.status(500).json({ 
      success: false,
      error: 'Error al calcular promedios',
      details: error.message 
    });
  }
};

exports.getTaskGrades = async (req, res) => {
  try {
    const { courseId, taskId } = req.params;
    const result = await db.getPool().query(
      `SELECT * FROM calificaciones 
       WHERE id_curso = $1 AND id_tarea = $2`,
      [courseId, taskId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener calificaciones' 
    });
  }
};

exports.updateGrade = async (req, res) => {
  try {
    const { courseId, taskId, studentId } = req.params;
    const { nota } = req.body;
    
    await db.getPool().query(
      `INSERT INTO calificaciones (id_curso, id_tarea, carnet_estudiante, nota)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id_curso, id_tarea, carnet_estudiante) 
       DO UPDATE SET nota = EXCLUDED.nota`,
      [courseId, taskId, studentId, nota]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Error al actualizar calificación' 
    });
  }
};
