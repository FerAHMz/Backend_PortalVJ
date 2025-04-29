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

module.exports = {
    getTeacherCourses
};