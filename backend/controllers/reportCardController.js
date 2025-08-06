const db = require('../database_cn');

// Obtener los estudiantes de una sección de grado específica
const getStudentsGradeSection = async (req, res) => {
  const { gradeSectionId } = req.params;
  const { year, trimestre } = req.query;

  let client;
  try {
    client = await db.getPool().connect();

    const query = `
      SELECT 
        e.carnet,
        e.nombre,
        e.apellido
      FROM Estudiante_grado_seccion eg
      JOIN Estudiantes e ON e.carnet = eg.id_estudiante
      JOIN Grado_seccion gs ON gs.id = eg.id_grado_seccion
      JOIN Trimestres t ON t.nombre = $2
      WHERE eg.id_grado_seccion = $1
        AND EXTRACT(YEAR FROM eg.fecha) = $3;
    `;

    const result = await client.query(query, [gradeSectionId, trimestre, year]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Error fetching students' });
  } finally {
    if (client) client.release();
  }
};

// Obtener la boleta de calificaciones de un estudiante en un grado específico
const getReportCard = async (req, res) => {
  const { carnetEstudiante,  } = req.params;
  const {gradeSectionId, trimestre} = req.query;

  let client;
  try {
    client = await db.getPool().connect();

    const trimestreQuery = await client.query(`
      select id from trimestres where nombre = $1
      `, [trimestre]);

    const trimestreId = trimestreQuery.rows[0]?.id;

    const result = await client.query(`
      SELECT 
        e.carnet,
        e.nombre,
        e.apellido,
        m.nombre AS materia,
        SUM(c.nota) AS nota,
        t.trimestre_id,
        tr.nombre AS trimestre
        FROM Calificaciones c
        INNER JOIN Estudiantes e ON c.carnet_estudiante = e.carnet
        INNER JOIN Cursos cu ON c.id_curso = cu.id
        INNER JOIN Materias m ON cu.id_materia = m.id
        INNER JOIN Tareas t ON c.id_tarea = t.id
        INNER JOIN Trimestres tr ON t.trimestre_id = tr.id
        WHERE c.carnet_estudiante = $1
        AND e.id_grado_seccion  = $2
        ${trimestreId ? 'AND t.trimestre_id <= $3' : ''}
        GROUP BY 
        e.carnet, e.nombre, e.apellido,
        m.nombre, t.trimestre_id, tr.nombre
        ORDER BY m.nombre;
    `, trimestreId ? [carnetEstudiante, gradeSectionId, trimestreId] : [carnetEstudiante, gradeSectionId]);

    res.json(result.rows);
    console.log('backend get report card', result.rows)
  } catch (error) {
    console.error('Error fetching report card:', error);
    res.status(500).json({ error: 'Error fetching report card' });
  } finally {
    if (client) client.release();
  }
};

// Obtener todos los grados y secciones
const getGradeSections = async (req, res) => {
  let client;
  try {
    client = await db.getPool().connect();

    const result = await client.query(`
      select 
        gs.id as id_grado_seccion,
        g.grado,
        s.seccion
      from Grado_seccion gs
      join grados g on g.id = gs.id_grado
      join secciones s on s.id = gs.id_seccion;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching grade sections rows:', error);
    res.status(500).json({ error: 'Error fetching grade sections' });
  } finally {
    if (client) client.release();
  }
};

// Obtener solo los grados y secciones asignados al maestro autenticado
const getTeacherGradeSections = async (req, res) => {
  let client;
  try {
    // Obtener el ID del maestro desde el token JWT 
    const maestroId = req.user.id; // 
    console.log('Maestro ID from token:', maestroId);

    client = await db.getPool().connect();

    // Esta consulta obtiene los grados y secciones donde el maestro tiene cursos asignados
    const result = await client.query(`
      SELECT DISTINCT 
        gs.id as id_grado_seccion,
        g.grado,
        s.seccion
      FROM Grado_seccion gs
      JOIN grados g on g.id = gs.id_grado
      JOIN secciones s on s.id = gs.id_seccion
      JOIN Cursos c ON c.id_grado_seccion = gs.id
      WHERE c.id_maestro = $1
      ORDER BY g.grado, s.seccion;
    `, [maestroId]);

    console.log('Teacher grade sections result:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching teacher grade sections:', error);
    res.status(500).json({ error: 'Error fetching teacher grade sections' });
  } finally {
    if (client) client.release();
  }
};

const getObservationsAndActionPoints = async (req, res) => {
  const { carnetEstudiante, gradeSectionId } = req.params;

  let client;
  try {
    client = await db.getPool().connect();

    const result = await client.query(`
      SELECT 
        o.id, 
        o.observaciones,
        o.puntos_de_accion,
        t.titulo as tarea
      FROM Observaciones o
      JOIN Estudiantes e ON o.carnet_estudiante = e.carnet
      JOIN Calificaciones c ON o.id_calificacion = c.id
      JOIN Tareas t ON c.id_tarea = t.id
      WHERE e.carnet = $1
      AND e.id_grado_seccion = $2;
    `, [carnetEstudiante, gradeSectionId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching observations and action points:', error);
    res.status(500).json({ error: 'Error fetching observations and action points' });
  } finally {
    if (client) client.release();
  }
};

const getGrade = async (req, res) => {
  const { gradeSectionId } = req.params;

  let client;
  try {
    client = await db.getPool().connect();

    const result = await client.query(`
      select 
        g.grado,
        s.seccion
      from estudiantes e
      join Grado_seccion gs on e.id_grado_seccion = gs.id
      join grados g on gs.id_grado = g.id
      join secciones s on gs.id_seccion = s.id
      where e.id_grado_seccion = $1
      LIMIT 1;
    `, [gradeSectionId]);

    res.json(result.rows);
    console.log('backend get grade', result.rows)
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({ error: 'Error fetching grades' });
  } finally {
    if (client) client.release();
  }
};

module.exports = {
  getReportCard,
  getStudentsGradeSection,
  getGradeSections,
  getTeacherGradeSections, 
  getObservationsAndActionPoints,
  getGrade
};