const db = require('../database_cn')

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

module.exports = {
  createObservation
};