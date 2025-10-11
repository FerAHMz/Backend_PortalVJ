const db = require('../database_cn');

const createTask = async (req, res) => {
  const { courseId } = req.params;
  const { titulo, descripcion, valor, fecha_entrega } = req.body;
  let client;

  try {
    client = await db.getPool().connect();
    await client.query('BEGIN');

    const taskQuery = `
            INSERT INTO tareas (titulo, descripcion, valor, fecha_entrega)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `;
    const taskResult = await client.query(taskQuery, [
      titulo,
      descripcion,
      valor,
      fecha_entrega
    ]);

    const courseTaskQuery = `
            INSERT INTO cursos_tareas (id_curso, id_tareas)
            VALUES ($1, $2)
        `;
    await client.query(courseTaskQuery, [courseId, taskResult.rows[0].id]);

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      taskId: taskResult.rows[0].id,
      message: 'Tarea creada exitosamente'
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error al crear tarea:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear la tarea'
    });
  } finally {
    if (client) client.release();
  }
};

const getCourseTasks = async (req, res) => {
  const { courseId } = req.params;
  let client;

  try {
    client = await db.getPool().connect();
    const query = `
            SELECT 
                t.id, 
                t.titulo, 
                t.descripcion, 
                t.valor,
                t.trimestre_id,
                to_char(t.fecha_entrega, 'YYYY-MM-DD') as fecha_entrega,
                tr.nombre as nombre_trimestre
            FROM tareas t
            INNER JOIN cursos_tareas ct ON t.id = ct.id_tareas
            LEFT JOIN trimestres tr ON t.trimestre_id = tr.id
            WHERE ct.id_curso = $1::integer
            ORDER BY t.fecha_entrega DESC
        `;
    const result = await client.query(query, [courseId]);

    console.log('Query result:', result.rows);

    const formattedTasks = result.rows.map(task => ({
      id: task.id,
      titulo: task.titulo,
      descripcion: task.descripcion,
      valor: parseInt(task.valor, 10) || 0,
      fecha_entrega: task.fecha_entrega,
      trimestre_id: task.trimestre_id,
      nombre_trimestre: task.nombre_trimestre
    }));

    res.json(formattedTasks);
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener las tareas'
    });
  } finally {
    if (client) client.release();
  }
};

const getTaskGrades = async (req, res) => {
  const { courseId, taskId } = req.params;
  let client;

  try {
    client = await db.getPool().connect();
    const query = `
            SELECT c.* 
            FROM calificaciones c
            WHERE c.id_curso = $1 AND c.id_tarea = $2
        `;
    const result = await client.query(query, [courseId, taskId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener calificaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las calificaciones'
    });
  } finally {
    if (client) client.release();
  }
};

const saveTaskGrades = async (req, res) => {
  const { courseId, taskId } = req.params;
  const { grades } = req.body;
  let client;

  try {
    client = await db.getPool().connect();
    await client.query('BEGIN');

    const deleteQuery = `
            DELETE FROM calificaciones 
            WHERE id_curso = $1 AND id_tarea = $2
        `;
    await client.query(deleteQuery, [courseId, taskId]);

    for (const grade of grades) {
      const insertQuery = `
                INSERT INTO calificaciones 
                (carnet_estudiante, id_curso, id_tarea, nota, fecha)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            `;
      await client.query(insertQuery, [
        grade.carnet_estudiante,
        courseId,
        taskId,
        grade.nota
      ]);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Calificaciones guardadas exitosamente' });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error al guardar calificaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al guardar las calificaciones'
    });
  } finally {
    if (client) client.release();
  }
};

const updateTaskGrade = async (req, res) => {
  const { courseId, taskId, studentId } = req.params;
  const { nota } = req.body;
  let client;

  try {
    client = await db.getPool().connect();
    const query = `
            UPDATE calificaciones 
            SET nota = $1, fecha = CURRENT_TIMESTAMP
            WHERE id_curso = $2 AND id_tarea = $3 AND carnet_estudiante = $4
            RETURNING *
        `;
    const result = await client.query(query, [nota, courseId, taskId, studentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No se encontró la calificación'
      });
    }

    res.json({
      success: true,
      message: 'Calificación actualizada exitosamente',
      grade: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar calificación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la calificación'
    });
  } finally {
    if (client) client.release();
  }
};

const getAllHomework = async (req, res) => {
  const { teacherId } = req.params;
  let client;

  try {
    client = await db.getPool().connect();
    const query = `
            SELECT 
                t.id AS task_id,
                t.titulo AS title,
                t.descripcion AS description,
                t.valor AS value,
                to_char(t.fecha_entrega, 'YYYY-MM-DD') AS due_date,
                c.id AS course_id,
                m.nombre AS course_name,
                g.grado AS grade,
                s.seccion AS section
            FROM tareas t
            INNER JOIN cursos_tareas ct ON t.id = ct.id_tareas
            INNER JOIN cursos c ON ct.id_curso = c.id
            INNER JOIN materias m ON c.id_materia = m.id
            INNER JOIN grado_seccion gs ON c.id_grado_seccion = gs.id
            INNER JOIN grados g ON gs.id_grado = g.id
            INNER JOIN secciones s ON gs.id_seccion = s.id
            WHERE c.id_maestro = $1
            ORDER BY t.fecha_entrega ASC
        `;
    const result = await client.query(query, [teacherId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching homework:', error);
    res.status(500).json({ error: 'Error fetching homework' });
  } finally {
    if (client) client.release();
  }
};

const getAllTasksForUser = async (req, res) => {
  const userId = req.user.id; // Assuming user ID is available in the token
  let client;

  try {
    client = await db.getPool().connect();
    const query = `
            SELECT 
                t.id, 
                t.titulo, 
                t.descripcion, 
                t.valor, 
                to_char(t.fecha_entrega, 'YYYY-MM-DD') as fecha_entrega,
                c.id as course_id,
                m.nombre as course_name
            FROM tareas t
            INNER JOIN cursos_tareas ct ON t.id = ct.id_tareas
            INNER JOIN cursos c ON ct.id_curso = c.id
            INNER JOIN materias m ON c.id_materia = m.id
            WHERE c.id_maestro = $1
            ORDER BY t.fecha_entrega ASC
        `;
    const result = await client.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks for user:', error);
    res.status(500).json({ error: 'Error fetching tasks' });
  } finally {
    if (client) client.release();
  }
};

module.exports = {
  createTask,
  getCourseTasks,
  getTaskGrades,
  saveTaskGrades,
  updateTaskGrade,
  getAllHomework,
  getAllTasksForUser
};
