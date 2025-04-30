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
            SELECT t.id, t.titulo, t.descripcion, t.valor, t.fecha_entrega
            FROM tareas t
            JOIN cursos_tareas ct ON t.id = ct.id_tareas
            WHERE ct.id_curso = $1
            ORDER BY t.fecha_entrega DESC
        `;
        const result = await client.query(query, [courseId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener tareas:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener las tareas'
        });
    } finally {
        if (client) client.release();
    }
};

module.exports = {
    createTask,
    getCourseTasks
};