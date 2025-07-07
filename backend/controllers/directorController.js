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
      `SELECT 1 FROM Grados_director WHERE id_director = $1 AND id_grado = $2`,
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

module.exports = {
  getGradosDelDirector,
  getCursosPorGrado
};
