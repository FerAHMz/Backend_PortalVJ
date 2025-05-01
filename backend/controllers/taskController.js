const db = require('../database_cn');

const createTask = async (req, res) => {
    const { courseId } = req.params;
    const { titulo, descripcion, valor, fecha_entrega } = req.body;
    let client;

    try {
        client = await db.getPool().connect();
        await client.query('BEGIN');

        const trimestreQuery = `
            SELECT id 
            FROM trimestres 
            WHERE (
                EXTRACT(MONTH FROM $1::date) BETWEEN EXTRACT(MONTH FROM fecha_inicio) AND EXTRACT(MONTH FROM fecha_fin)
                AND
                CASE 
                    WHEN EXTRACT(MONTH FROM $1::date) = EXTRACT(MONTH FROM fecha_inicio) 
                    THEN EXTRACT(DAY FROM $1::date) >= EXTRACT(DAY FROM fecha_inicio)
                    WHEN EXTRACT(MONTH FROM $1::date) = EXTRACT(MONTH FROM fecha_fin)
                    THEN EXTRACT(DAY FROM $1::date) <= EXTRACT(DAY FROM fecha_fin)
                    ELSE true
                END
            )
        `;
        const trimestreResult = await client.query(trimestreQuery, [fecha_entrega]);
        
        if (!trimestreResult.rows[0]) {
            throw new Error('La fecha no corresponde a ningún trimestre válido');
        }

        const taskQuery = `
            INSERT INTO tareas (titulo, descripcion, valor, fecha_entrega, trimestre_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `;
        const taskResult = await client.query(taskQuery, [
            titulo,
            descripcion,
            valor,
            fecha_entrega,
            trimestreResult.rows[0].id
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
            error: error.message || 'Error al crear la tarea'
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

module.exports = {
    createTask,
    getCourseTasks
};