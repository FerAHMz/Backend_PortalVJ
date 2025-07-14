const db = require('../database_cn');

// Obtener hijos del padre autenticado usando la tabla Familias
exports.getChildren = async (req, res) => {
  try {
    const parentId = req.user.id;
    const result = await db.getPool().query(
      `SELECT e.carnet, e.nombre, e.apellido
       FROM Familias f
       JOIN Estudiantes e ON f.carnet_estudiante = e.carnet
       WHERE f.id_padre = $1`,
      [parentId]
    );
    console.log('parentId:', parentId, 'children result:', result.rows);
    res.json({ success: true, children: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener hijos' });
  }
};

// Obtener calificaciones por hijo y asignatura
exports.getStudentGrades = async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await db.getPool().query(
      `SELECT m.id AS materia_id, m.nombre AS materia, t.trimestre_id, SUM(g.nota) AS total
       FROM calificaciones g
       JOIN cursos c ON g.id_curso = c.id
       JOIN materias m ON c.id_materia = m.id
       JOIN tareas t ON g.id_tarea = t.id
       WHERE g.carnet_estudiante = $1
       GROUP BY m.id, m.nombre, t.trimestre_id
       ORDER BY m.nombre, t.trimestre_id`,
      [studentId]
    );
    res.json({ success: true, grades: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener calificaciones' });
  }
};

// Obtener desglose de calificaciones por tarea en una asignatura
exports.getStudentTaskGrades = async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    const result = await db.getPool().query(
      `SELECT t.id AS tarea_id, t.titulo, t.trimestre_id, g.nota
       FROM calificaciones g
       JOIN tareas t ON g.id_tarea = t.id
       JOIN cursos c ON g.id_curso = c.id
       WHERE g.carnet_estudiante = $1 AND c.id_materia = $2
       ORDER BY t.trimestre_id, t.titulo`,
      [studentId, subjectId]
    );
    res.json({ success: true, tasks: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener calificaciones de tareas' });
  }
};
