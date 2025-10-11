const db = require('../database_cn');

const createObservation = async (req, res) => {
  const { observaciones, puntos_de_accion, id_tarea, carnet_estudiante, id_curso } = req.body;
  let client;

  try {
    client = await db.getPool().connect();
    await client.query('BEGIN');

    let id_calificacion = null;

    if (id_tarea !== null && id_tarea !== undefined && id_tarea !== 'null') {
      const gradeResult = await client.query(`
        SELECT id FROM calificaciones 
        WHERE carnet_estudiante = $1 AND id_curso = $2 AND id_tarea = $3
      `, [carnet_estudiante, id_curso, id_tarea]);

      if (gradeResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Calificación no encontrada para la tarea especificada' });
      }

      if (gradeResult.rowCount > 1) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: 'Error interno: múltiples calificaciones encontradas' });
      }

      id_calificacion = gradeResult.rows[0].id;
    }

    const insertResult = await client.query(`
      INSERT INTO Observaciones 
        (carnet_estudiante, id_curso, observaciones, puntos_de_accion, id_calificacion)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [carnet_estudiante, id_curso, observaciones, puntos_de_accion, id_calificacion]);

    await client.query('COMMIT');
    res.json({ success: true, observationId: insertResult.rows[0].id });

  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error en createObservation:', error);
    res.status(500).json({
      error: 'Error al registrar la observación',
      details: error.message
    });
  } finally {
    if (client) client.release();
  }
};

const getObservationsByCourseAndStudent = async (req, res) => {
  const { courseId, carnetEstudiante } = req.params;

  try {
    const result = await db.getPool().query(`
      SELECT * FROM Observaciones 
      WHERE id_curso = $1 AND carnet_estudiante = $2
      ORDER BY id DESC
    `, [courseId, carnetEstudiante]);

    res.json({ success: true, observations: result.rows });

  } catch (error) {
    console.error('Error en getObservationsByCourseAndStudent:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener observaciones',
      details: error.message
    });
  }
};

const updateObservation = async (req, res) => {
  const { observationId } = req.params;
  const { observaciones, puntos_de_accion } = req.body;

  try {
    const result = await db.getPool().query(`
      UPDATE Observaciones 
      SET observaciones = $1, puntos_de_accion = $2
      WHERE id = $3
      RETURNING *
    `, [observaciones, puntos_de_accion, observationId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Observación no encontrada' });
    }

    res.json({ success: true, updated: result.rows[0] });

  } catch (error) {
    console.error('Error en updateObservation:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar observación',
      details: error.message
    });
  }
};

const deleteObservation = async (req, res) => {
  const { observationId } = req.params;

  try {
    const result = await db.getPool().query(`
      DELETE FROM Observaciones 
      WHERE id = $1
    `, [observationId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Observación no encontrada' });
    }

    res.json({ success: true, message: 'Observación eliminada exitosamente' });

  } catch (error) {
    console.error('Error en deleteObservation:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar observación',
      details: error.message
    });
  }
};


module.exports = {
  createObservation,
  getObservationsByCourseAndStudent,
  updateObservation,
  deleteObservation
};
