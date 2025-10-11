const db = require('../database_cn');
const cloudflareR2Service = require('../services/cloudflareR2Service');
const multer = require('multer');

// ✅ Crear una planificación
const createPlanning = async (req, res) => {
  const courseId = req.params.courseId;
  const {  mes, ciclo_escolar } = req.body;

  try {
    // Validar que el mes es válido según la base de datos
    const validMeses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    if (!validMeses.includes(mes)) {
      return res.status(400).json({ message: 'Mes inválido. Debe ser un mes válido en español' });
    }

    const result = await db.getPool().query(
      `INSERT INTO Planificaciones (id_curso, mes, ciclo_escolar)
       VALUES ($1, $2, $3) RETURNING *`,
      [courseId, mes, ciclo_escolar]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear planificación:', error);
    res.status(500).json({ message: 'Error al crear planificación' });
  }
};

// ✅ Obtener planificaciones por curso o por id
const getPlannings = async (req, res) => {
  const { courseId } = req.params;

  try {

    const result = await db.getPool().query(
      'SELECT * FROM Planificaciones WHERE id_curso = $1 ORDER BY id ASC',
      [courseId]
    );
    res.json(result.rows);

  } catch (error) {
    console.error('Error al obtener planificación:', error);
    res.status(500).json({ message: 'Error al obtener planificación' });
  }
};

const getPlanningById = async (req, res) => {
  const { id } = req.params;

  try {
    const planRes = await db.getPool().query(
      'SELECT * FROM Planificaciones WHERE id = $1',
      [id]
    );
    const plan = planRes.rows[0];

    if (!plan) return res.status(404).json({ message: 'Planificación no encontrada' });

    const tasksRes = await db.getPool().query(
      'SELECT * FROM Detalle_planificacion WHERE id_planificacion = $1',
      [id]
    );

    plan.tareas = tasksRes.rows;
    res.json(plan);
  } catch (error) {
    console.error('Error al obtener planificación por ID:', error);
    res.status(500).json({ message: 'Error al obtener planificación' });
  }
};


// ✅ Actualizar una planificación
const updatePlanning = async (req, res) => {
  const { id } = req.params;
  const { mes, ciclo_escolar } = req.body;

  try {
    // Validar que el trimestre es válido
    const validTrimestres = ['I', 'II', 'III'];
    if (!validTrimestres.includes(mes)) {
      return res.status(400).json({ message: 'Trimestre inválido. Debe ser I, II o III' });
    }

    const result = await db.getPool().query(
      `UPDATE Planificaciones
       SET mes = $1, ciclo_escolar = $2, estado = 'en revision'
       WHERE id = $3 RETURNING *`,
      [mes, ciclo_escolar, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Planificación no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar planificación:', error);
    res.status(500).json({ message: 'Error al actualizar planificación' });
  }
};

// ✅ Eliminar una planificación
const deletePlanning = async (req, res) => {
  const { id } = req.params;

  try {
    // Primero borrar tareas relacionadas
    await db.getPool().query(
      'DELETE FROM Detalle_planificacion WHERE id_planificacion = $1',
      [id]
    );

    // Luego eliminar planificación
    const result = await db.getPool().query(
      'DELETE FROM Planificaciones WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Planificación no encontrada' });
    }

    res.json({ message: 'Planificación eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar planificación:', error);
    res.status(500).json({ message: 'Error al eliminar planificación' });
  }
};

// ✅ Obtener observaciones de una planificación
const getPlanningObservations = async (req, res) => {
  const { planId } = req.params;

  try {
    const result = await db.getPool().query(
      `SELECT r.id, r.observaciones, r.fecha, d.nombre AS nombre_director, d.apellido AS apellido_director
       FROM Revisiones_planificacion r
       JOIN Directores d ON r.id_director = d.id
       WHERE r.id_planificacion = $1
       ORDER BY r.fecha DESC`,
      [planId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener observaciones:', error);
    res.status(500).json({ message: 'Error al obtener observaciones' });
  }
};

// Obtener tareas por planificación
const getPlanningTasks = async (req, res) => {
  const { planId } = req.params;

  try {
    const result = await db.getPool().query(
      'SELECT * FROM Detalle_planificacion WHERE id_planificacion = $1 ORDER BY id ASC',
      [planId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    res.status(500).json({ message: 'Error al obtener tareas' });
  }
};

// Crear nueva tarea
const createPlanningTask = async (req, res) => {
  const id_planificacion = req.params.planId;
  const { tema_tarea, puntos_tarea } = req.body;

  try {
    const result = await db.getPool().query(
      `INSERT INTO Detalle_planificacion (id_planificacion, tema_tarea, puntos_tarea)
       VALUES ($1, $2, $3) RETURNING *`,
      [id_planificacion, tema_tarea, puntos_tarea]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear tarea:', error);
    res.status(500).json({ message: 'Error al crear tarea' });
  }
};

// Actualizar tarea
const updatePlanningTask = async (req, res) => {
  const { id } = req.params;
  const { tema_tarea, puntos_tarea } = req.body;

  try {
    const result = await db.getPool().query(
      `UPDATE Detalle_planificacion
       SET tema_tarea = $1, puntos_tarea = $2
       WHERE id = $3 RETURNING *`,
      [tema_tarea, puntos_tarea, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Tarea no encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar tarea:', error);
    res.status(500).json({ message: 'Error al actualizar tarea' });
  }
};

// Eliminar tarea
const deletePlanningTask = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.getPool().query(
      'DELETE FROM Detalle_planificacion WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Tarea no encontrada' });
    res.json({ message: 'Tarea eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    res.status(500).json({ message: 'Error al eliminar tarea' });
  }
};

// Crear observación
const createPlanningObservation = async (req, res) => {
  const { id_director, observaciones } = req.body;
  const { planId } = req.params;

  try {
    const result = await db.getPool().query(
      `INSERT INTO Revisiones_planificacion (id_planificacion, id_director, observaciones)
       VALUES ($1, $2, $3) RETURNING *`,
      [planId, id_director, observaciones]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear observación:', error);
    res.status(500).json({ message: 'Error al crear observación' });
  }
};

const updatePlanningObservation = async (req, res) => {
  const { id } = req.params;
  const { observaciones } = req.body;

  try {
    const result = await db.getPool().query(
      `UPDATE Revisiones_planificacion
       SET observaciones = $1, fecha = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [observaciones, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Observación no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar observación:', error);
    res.status(500).json({ message: 'Error al actualizar observación' });
  }
};


// Eliminar observación
const deletePlanningObservation = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.getPool().query(
      'DELETE FROM Revisiones_planificacion WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Observación no encontrada' });
    res.json({ message: 'Observación eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar observación:', error);
    res.status(500).json({ message: 'Error al eliminar observación' });
  }
};

const updatePlanningEstado = async (req, res) => {
  const { courseId, planId } = req.params;
  const { estado } = req.body;

  try {
    const validStates = ['en revision', 'aceptada', 'rechazada'];
    if (!validStates.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const result = await db.getPool().query(
      'UPDATE planificaciones SET estado = $1 WHERE id = $2 AND id_curso = $3 RETURNING *',
      [estado, planId, courseId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Planificación no encontrada' });
    }

    res.json({ message: 'Estado actualizado', planificacion: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar el estado:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// 📁 Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: cloudflareR2Service.getFileSizeLimit() // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (cloudflareR2Service.isValidPlanificationFile(file.mimetype, file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no válido. Solo se permiten archivos PDF, DOC y DOCX.'), false);
    }
  }
});

// 📁 Upload planification file
const uploadPlanificationFile = async (req, res) => {
  try {
    const { planificationId } = req.params;
    const { description = '' } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado ningún archivo'
      });
    }

    // Verify planification exists
    const planificationCheck = await db.getPool().query(
      'SELECT id FROM Planificaciones WHERE id = $1',
      [planificationId]
    );

    if (planificationCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Planificación no encontrada'
      });
    }

    // Upload file to Cloudflare R2
    const uploadResult = await cloudflareR2Service.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'planifications'
    );

    // Save file information to database
    const fileRecord = await db.getPool().query(
      `INSERT INTO planification_files 
       (planification_id, file_name, original_name, file_url, file_size, mime_type, description, uploaded_by, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
       RETURNING *`,
      [
        planificationId,
        uploadResult.fileName,
        uploadResult.originalName,
        uploadResult.fileUrl,
        uploadResult.size,
        uploadResult.mimeType,
        description,
        req.user.id // Assuming user ID is available from auth middleware
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Archivo subido correctamente',
      file: fileRecord.rows[0],
      cloudflareData: uploadResult
    });

  } catch (error) {
    console.error('Error uploading planification file:', error);

    if (error.message.includes('Tipo de archivo no válido')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al subir el archivo'
    });
  }
};

// 📁 Get planification files
const getPlanificationFiles = async (req, res) => {
  try {
    const { planificationId } = req.params;
    console.log(`Getting files for planification ID: ${planificationId}`);

    const files = await db.getPool().query(
      `SELECT pf.*, m.email as uploaded_by_email, m.nombre as uploaded_by_name
       FROM planification_files pf
       LEFT JOIN maestros m ON pf.uploaded_by = m.id
       WHERE pf.planification_id = $1
       ORDER BY pf.uploaded_at DESC`,
      [planificationId]
    );

    console.log(`Found ${files.rows.length} files for planification ${planificationId}:`, files.rows);

    res.json({
      success: true,
      files: files.rows
    });

  } catch (error) {
    console.error('Error getting planification files:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los archivos de planificación'
    });
  }
};

// 📁 Delete planification file
const deletePlanificationFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    // Get file information
    const fileInfo = await db.getPool().query(
      'SELECT * FROM planification_files WHERE id = $1',
      [fileId]
    );

    if (fileInfo.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    const file = fileInfo.rows[0];

    // Delete from Cloudflare R2
    await cloudflareR2Service.deleteFile(file.file_name);

    // Delete from database
    await db.getPool().query(
      'DELETE FROM planification_files WHERE id = $1',
      [fileId]
    );

    res.json({
      success: true,
      message: 'Archivo eliminado correctamente'
    });

  } catch (error) {
    console.error('Error deleting planification file:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el archivo'
    });
  }
};

// 📁 Download planification file (generate presigned URL)
const downloadPlanificationFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    // Get file information
    const fileInfo = await db.getPool().query(
      'SELECT * FROM planification_files WHERE id = $1',
      [fileId]
    );

    if (fileInfo.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    const file = fileInfo.rows[0];

    // Generate presigned URL for download (valid for 1 hour)
    const downloadUrl = await cloudflareR2Service.getPresignedUrl(file.file_name, 3600);

    res.json({
      success: true,
      downloadUrl: downloadUrl,
      fileName: file.original_name,
      fileSize: file.file_size,
      mimeType: file.mime_type
    });

  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar la URL de descarga'
    });
  }
};


module.exports = {
  // Planificaciones
  createPlanning,
  getPlannings,
  getPlanningById,
  updatePlanning,
  deletePlanning,
  getPlanningObservations,

  // Tareas
  getPlanningTasks,
  createPlanningTask,
  updatePlanningTask,
  deletePlanningTask,

  // Observaciones
  createPlanningObservation,
  updatePlanningObservation,
  deletePlanningObservation,

  // Estado
  updatePlanningEstado,

  // File Upload
  upload,
  uploadPlanificationFile,
  getPlanificationFiles,
  deletePlanificationFile,
  downloadPlanificationFile
};
