const db = require('../database_cn');

class CourseController {
    // Obtener todos los cursos
    async getCourses(req, res) {
        let client;
        try {
            client = await db.getPool().connect();
            const result = await client.query(`
                SELECT 
                    c.id,
                    m.nombre as materia,
                    g.grado,
                    s.seccion,
                    ma.nombre as nombre_maestro,
                    ma.apellido as apellido_maestro
                FROM cursos c
                JOIN materias m ON c.id_materia = m.id
                JOIN grado_seccion gs ON c.id_grado_seccion = gs.id
                JOIN grados g ON gs.id_grado = g.id
                JOIN secciones s ON gs.id_seccion = s.id
                JOIN maestros ma ON c.id_maestro = ma.id
                ORDER BY g.grado, s.seccion, m.nombre
            `);
            res.json(result.rows);
        } catch (error) {
            console.error('Error al obtener cursos:', error);
            res.status(500).json({ error: 'Error al obtener los cursos' });
        } finally {
            if (client) client.release();
        }
    }

    // Crear un nuevo curso
    async createCourse(req, res) {
        const { id_maestro, id_materia, id_grado_seccion } = req.body;
        let client;
        
        try {
            if (!id_maestro || !id_materia || !id_grado_seccion) {
                return res.status(400).json({ error: 'Todos los campos son requeridos' });
            }

            client = await db.getPool().connect();
            await client.query('BEGIN');

            // Verificar si el maestro existe
            const maestroCheck = await client.query(
                'SELECT id FROM maestros WHERE id = $1',
                [id_maestro]
            );

            if (maestroCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'El maestro no existe' });
            }

            // Verificar si la materia existe
            const materiaCheck = await client.query(
                'SELECT id FROM materias WHERE id = $1',
                [id_materia]
            );

            if (materiaCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'La materia no existe' });
            }

            // Verificar si el grado y sección existen
            const gradoSeccionCheck = await client.query(
                'SELECT id FROM grado_seccion WHERE id = $1',
                [id_grado_seccion]
            );

            if (gradoSeccionCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'El grado y sección no existen' });
            }

            // Verificar si ya existe el curso
            const cursoExistente = await client.query(
                `SELECT id FROM cursos 
                 WHERE id_maestro = $1 
                 AND id_materia = $2 
                 AND id_grado_seccion = $3`,
                [id_maestro, id_materia, id_grado_seccion]
            );

            if (cursoExistente.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'El curso ya existe para este maestro, materia y grado-sección' });
            }

            // Crear el curso
            const result = await client.query(
                `INSERT INTO cursos (id_maestro, id_materia, id_grado_seccion)
                 VALUES ($1, $2, $3)
                 RETURNING id`,
                [id_maestro, id_materia, id_grado_seccion]
            );

            await client.query('COMMIT');
            res.status(201).json(result.rows[0]);
        } catch (error) {
            if (client) await client.query('ROLLBACK');
            console.error('Error al crear curso:', error);
            res.status(500).json({ error: 'Error al crear el curso' });
        } finally {
            if (client) client.release();
        }
    }

    // Eliminar un curso
    async deleteCourse(req, res) {
        const { id } = req.params;
        let client;
        
        try {
            client = await db.getPool().connect();
            const result = await client.query(
                `DELETE FROM cursos 
                 WHERE id = $1
                 RETURNING id`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Curso no encontrado' });
            }

            res.json({ message: 'Curso eliminado exitosamente' });
        } catch (error) {
            console.error('Error al eliminar curso:', error);
            res.status(500).json({ error: 'Error al eliminar el curso' });
        } finally {
            if (client) client.release();
        }
    }

    // Obtener maestros
    async getTeachers(req, res) {
        let client;
        try {
            client = await db.getPool().connect();
            const result = await client.query(
                `SELECT id, nombre, apellido 
                 FROM maestros 
                 ORDER BY apellido, nombre`
            );
            res.json(result.rows);
        } catch (error) {
            console.error('Error al obtener maestros:', error);
            res.status(500).json({ error: 'Error al obtener los maestros' });
        } finally {
            if (client) client.release();
        }
    }

    // Obtener materias
    async getSubjects(req, res) {
        let client;
        try {
            client = await db.getPool().connect();
            const result = await client.query(
                `SELECT id, nombre 
                 FROM materias 
                 ORDER BY nombre`
            );
            res.json(result.rows);
        } catch (error) {
            console.error('Error al obtener materias:', error);
            res.status(500).json({ error: 'Error al obtener las materias' });
        } finally {
            if (client) client.release();
        }
    }

    // Obtener grados
    async getGrades(req, res) {
        let client;
        try {
            client = await db.getPool().connect();
            const result = await client.query(
                `SELECT id, grado 
                 FROM grados 
                 ORDER BY grado`
            );
            res.json(result.rows);
        } catch (error) {
            console.error('Error al obtener grados:', error);
            res.status(500).json({ error: 'Error al obtener los grados' });
        } finally {
            if (client) client.release();
        }
    }

    // Obtener secciones
    async getSections(req, res) {
        let client;
        try {
            client = await db.getPool().connect();
            const result = await client.query(
                `SELECT id, seccion 
                 FROM secciones 
                 ORDER BY seccion`
            );
            res.json(result.rows);
        } catch (error) {
            console.error('Error al obtener secciones:', error);
            res.status(500).json({ error: 'Error al obtener las secciones' });
        } finally {
            if (client) client.release();
        }
    }

    // Obtener un curso específico
    async getCourseById(req, res) {
        const { id } = req.params;
        let client;
        
        try {
            client = await db.getPool().connect();
            const result = await client.query(`
                SELECT 
                    c.id,
                    c.id_maestro,
                    c.id_materia,
                    c.id_grado_seccion,
                    m.nombre as materia,
                    g.grado,
                    s.seccion,
                    ma.nombre as nombre_maestro,
                    ma.apellido as apellido_maestro
                FROM cursos c
                JOIN materias m ON c.id_materia = m.id
                JOIN grado_seccion gs ON c.id_grado_seccion = gs.id
                JOIN grados g ON gs.id_grado = g.id
                JOIN secciones s ON gs.id_seccion = s.id
                JOIN maestros ma ON c.id_maestro = ma.id
                WHERE c.id = $1
            `, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Curso no encontrado' });
            }

            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error al obtener curso:', error);
            res.status(500).json({ error: 'Error al obtener el curso' });
        } finally {
            if (client) client.release();
        }
    }

    // Actualizar un curso
    async updateCourse(req, res) {
        const { id } = req.params;
        const { id_maestro, id_materia, id_grado_seccion } = req.body;
        let client;
        
        try {
            if (!id_maestro || !id_materia || !id_grado_seccion) {
                return res.status(400).json({ error: 'Todos los campos son requeridos' });
            }

            client = await db.getPool().connect();
            await client.query('BEGIN');

            // Verificaciones similares a createCourse
            const existingChecks = await Promise.all([
                client.query('SELECT id FROM maestros WHERE id = $1', [id_maestro]),
                client.query('SELECT id FROM materias WHERE id = $1', [id_materia]),
                client.query('SELECT id FROM grado_seccion WHERE id = $1', [id_grado_seccion])
            ]);

            if (existingChecks[0].rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'El maestro no existe' });
            }
            if (existingChecks[1].rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'La materia no existe' });
            }
            if (existingChecks[2].rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'El grado y sección no existen' });
            }

            const result = await client.query(
                `UPDATE cursos 
                 SET id_maestro = $1, id_materia = $2, id_grado_seccion = $3
                 WHERE id = $4
                 RETURNING id`,
                [id_maestro, id_materia, id_grado_seccion, id]
            );

            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Curso no encontrado' });
            }

            await client.query('COMMIT');
            res.json(result.rows[0]);
        } catch (error) {
            if (client) await client.query('ROLLBACK');
            console.error('Error al actualizar curso:', error);
            res.status(500).json({ error: 'Error al actualizar el curso' });
        } finally {
            if (client) client.release();
        }
    }

    async createGradoSeccion(req, res) {
        const { id_grado, id_seccion } = req.body;
        let client;
        
        try {
            client = await db.getPool().connect();
            
            const existingCheck = await client.query(
                'SELECT id FROM grado_seccion WHERE id_grado = $1 AND id_seccion = $2',
                [id_grado, id_seccion]
            );
            
            if (existingCheck.rows.length > 0) {
                return res.json({ id: existingCheck.rows[0].id });
            }
            
            const result = await client.query(
                'INSERT INTO grado_seccion (id_grado, id_seccion) VALUES ($1, $2) RETURNING id',
                [id_grado, id_seccion]
            );
            
            res.status(201).json({ id: result.rows[0].id });
        } catch (error) {
            console.error('Error al crear grado_seccion:', error);
            res.status(500).json({ error: 'Error al crear el registro de grado_seccion' });
        } finally {
            if (client) client.release();
        }
    }

    async getCoursesByTeacher(req, res) {
        const { teacherId } = req.params;
        let client;
        try {
            client = await db.getPool().connect();
            const result = await client.query(`
                SELECT 
                    c.id,
                    c.id_maestro,
                    c.id_materia,
                    c.id_grado_seccion,
                    m.nombre as materia,
                    g.grado,
                    s.seccion,
                    ma.nombre as nombre_maestro,
                    ma.apellido as apellido_maestro
                FROM cursos c
                JOIN materias m ON c.id_materia = m.id
                JOIN grado_seccion gs ON c.id_grado_seccion = gs.id
                JOIN grados g ON gs.id_grado = g.id
                JOIN secciones s ON gs.id_seccion = s.id
                JOIN maestros ma ON c.id_maestro = ma.id
                WHERE c.id_maestro = $1
                ORDER BY g.grado, s.seccion, m.nombre
            `, [teacherId]);
            res.json(result.rows);
        } catch (error) {
            console.error('Error al obtener cursos del maestro:', error);
            res.status(500).json({ error: 'Error al obtener los cursos del maestro' });
        } finally {
            if (client) client.release();
        }
    }
}

module.exports = new CourseController();