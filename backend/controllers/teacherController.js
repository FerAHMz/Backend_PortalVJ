const db = require('../database_cn');

const getTeacherCourses = async (req, res) => {
    const { teacherId } = req.params;
    let client;

    try {
        client = await db.getPool().connect();
        
        const query = `
            SELECT 
                c.id,
                m.nombre as materia,
                g.grado,
                s.seccion
            FROM cursos c
            JOIN materias m ON c.id_materia = m.id
            JOIN grado_seccion gs ON c.id_grado_seccion = gs.id
            JOIN grados g ON gs.id_grado = g.id
            JOIN secciones s ON gs.id_seccion = s.id
            WHERE c.id_maestro = $1
        `;
        
        const result = await client.query(query, [teacherId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener cursos del maestro:', error);
        res.status(500).json({ error: 'Error al obtener cursos' });
    } finally {
        if (client) client.release();
    }
};

const getCourseGrades = async (req, res) => {
    const { courseId } = req.params;
    let client;

    try {
        client = await db.getPool().connect();
        const query = `
            SELECT 
                c.id,
                e.carnet,
                e.nombre,
                e.apellido,
                t.titulo as tarea,
                c.nota,
                t.valor as valor_total
            FROM calificaciones c
            JOIN estudiantes e ON c.carnet_estudiante = e.carnet
            JOIN tareas t ON c.id_tarea = t.id
            WHERE c.id_curso = $1
            ORDER BY e.apellido, e.nombre, t.fecha_entrega
        `;
        const result = await client.query(query, [courseId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener calificaciones:', error);
        res.status(500).json({ error: 'Error al obtener calificaciones' });
    } finally {
        if (client) client.release();
    }
};

const registerGrade = async (req, res) => {
    const { courseId } = req.params;
    const { carnet_estudiante, id_tarea, nota } = req.body;
    let client;

    try {
        client = await db.getPool().connect();
        const query = `
            INSERT INTO calificaciones (carnet_estudiante, id_curso, nota, id_tarea)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `;
        const result = await client.query(query, [carnet_estudiante, courseId, nota, id_tarea]);
        res.json({ success: true, gradeId: result.rows[0].id });
    } catch (error) {
        console.error('Error al registrar calificación:', error);
        res.status(500).json({ error: 'Error al registrar calificación' });
    } finally {
        if (client) client.release();
    }
};

const getStudentsByCourse = async (req, res) => {
    const { courseId } = req.params;
    let client;

    try {
        client = await db.getPool().connect();
        const query = `
            SELECT 
                e.carnet,
                e.nombre,
                e.apellido
            FROM estudiantes e
            JOIN grado_seccion gs ON e.id_grado_seccion = gs.id
            JOIN cursos c ON c.id_grado_seccion = gs.id
            WHERE c.id = $1
            ORDER BY e.apellido, e.nombre
        `;
        const result = await client.query(query, [courseId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener estudiantes:', error);
        res.status(500).json({ error: 'Error al obtener estudiantes' });
    } finally {
        if (client) client.release();
    }
};

module.exports = {
    getTeacherCourses,
    getCourseGrades,
    registerGrade,
    getStudentsByCourse
};