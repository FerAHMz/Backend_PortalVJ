const db = require('../database_cn');
const XLSX = require('xlsx');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        // Crear directorio si no existe
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'inscripciones-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.xlsx', '.xls'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB límite
    }
});

const uploadMiddleware = upload.single('excelFile');

// Obtener todas las inscripciones con información de grado y sección
const getInscripciones = async (req, res) => {
    try {
        const result = await db.getPool().query(`
            SELECT 
                i.id_inscripcion,
                i.carnet,
                i.nombres,
                i.apellidos,
                i.fecha_nacimiento,
                i.sire,
                i.correo_padres,
                i.estado_inscripcion,
                i.fecha_inscripcion,
                i.fecha_actualizacion,
                gs.id as id_grado_seccion,
                g.grado,
                s.seccion,
                CONCAT(g.grado, ' - ', s.seccion) as grado_seccion_display
            FROM Inscripciones i
            LEFT JOIN Grado_seccion gs ON i.id_grado_seccion = gs.id
            LEFT JOIN Grados g ON gs.id_grado = g.id
            LEFT JOIN Secciones s ON gs.id_seccion = s.id
            WHERE i.estado_inscripcion != 'eliminado'
            ORDER BY i.fecha_inscripcion DESC
        `);

        res.json({
            success: true,
            message: 'Inscripciones obtenidas exitosamente',
            data: result.rows
        });
    } catch (error) {
        console.error('Error al obtener inscripciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Obtener una inscripción por ID
const getInscripcionById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.getPool().query(`
            SELECT 
                i.id_inscripcion,
                i.carnet,
                i.nombres,
                i.apellidos,
                i.fecha_nacimiento,
                i.sire,
                i.correo_padres,
                i.estado_inscripcion,
                i.fecha_inscripcion,
                i.fecha_actualizacion,
                gs.id_grado_seccion,
                g.grado_nombre,
                s.seccion_nombre,
                CONCAT(g.grado_nombre, ' - ', s.seccion_nombre) as grado_seccion_display
            FROM Inscripciones i
            LEFT JOIN Grado_seccion gs ON i.id_grado_seccion = gs.id_grado_seccion
            LEFT JOIN Grados g ON gs.id_grado = g.id_grado
            LEFT JOIN Secciones s ON gs.id_seccion = s.id_seccion
            WHERE i.id_inscripcion = $1 AND i.estado_inscripcion != 'eliminado'
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Inscripción no encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Inscripción obtenida exitosamente',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error al obtener inscripción:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Crear nueva inscripción
const createInscripcion = async (req, res) => {
    const client = await db.getPool().connect();
    
    try {
        await client.query('BEGIN');

        const {
            carnet,
            nombres,
            apellidos,
            fecha_nacimiento,
            id_grado_seccion,
            sire,
            correo_padres
        } = req.body;

        // Validaciones básicas
        if (!carnet || !nombres || !apellidos || !fecha_nacimiento || !id_grado_seccion) {
            return res.status(400).json({
                success: false,
                message: 'Campos requeridos: carnet, nombres, apellidos, fecha_nacimiento, id_grado_seccion'
            });
        }

        // Verificar que el grado_seccion existe
        const gradoSeccionCheck = await client.query(
            'SELECT id_grado_seccion FROM Grado_seccion WHERE id_grado_seccion = $1',
            [id_grado_seccion]
        );

        if (gradoSeccionCheck.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'El grado-sección especificado no existe'
            });
        }

        // Verificar si ya existe una inscripción activa para este carnet
        const existingInscription = await client.query(
            'SELECT id_inscripcion FROM Inscripciones WHERE carnet = $1 AND estado_inscripcion = $2',
            [carnet, 'inscrito']
        );

        if (existingInscription.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe una inscripción activa para este carnet'
            });
        }

        // Crear o actualizar estudiante en la tabla Estudiantes
        const studentCheck = await client.query(
            'SELECT id_estudiante FROM Estudiantes WHERE carnet = $1',
            [carnet]
        );

        let id_estudiante;
        if (studentCheck.rows.length === 0) {
            // Crear nuevo estudiante
            const newStudent = await client.query(`
                INSERT INTO Estudiantes (carnet, nombres, apellidos, fecha_nacimiento)
                VALUES ($1, $2, $3, $4)
                RETURNING id_estudiante
            `, [carnet, nombres, apellidos, fecha_nacimiento]);
            id_estudiante = newStudent.rows[0].id_estudiante;
        } else {
            // Actualizar estudiante existente
            id_estudiante = studentCheck.rows[0].id_estudiante;
            await client.query(`
                UPDATE Estudiantes 
                SET nombres = $1, apellidos = $2, fecha_nacimiento = $3
                WHERE carnet = $4
            `, [nombres, apellidos, fecha_nacimiento, carnet]);
        }

        // Crear inscripción
        const inscripcionResult = await client.query(`
            INSERT INTO Inscripciones (
                carnet, nombres, apellidos, fecha_nacimiento, 
                id_grado_seccion, sire, correo_padres, estado_inscripcion
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'inscrito')
            RETURNING id_inscripcion, fecha_inscripcion
        `, [carnet, nombres, apellidos, fecha_nacimiento, id_grado_seccion, sire, correo_padres]);

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Inscripción creada exitosamente',
            data: {
                id_inscripcion: inscripcionResult.rows[0].id_inscripcion,
                carnet,
                nombres,
                apellidos,
                fecha_nacimiento,
                id_grado_seccion,
                sire,
                correo_padres,
                estado_inscripcion: 'inscrito',
                fecha_inscripcion: inscripcionResult.rows[0].fecha_inscripcion
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al crear inscripción:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    } finally {
        client.release();
    }
};

// Actualizar inscripción
const updateInscripcion = async (req, res) => {
    const client = await db.getPool().connect();
    
    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const {
            carnet,
            nombres,
            apellidos,
            fecha_nacimiento,
            id_grado_seccion,
            sire,
            correo_padres
        } = req.body;

        // Verificar que la inscripción existe y está activa
        const inscripcionCheck = await client.query(
            'SELECT * FROM Inscripciones WHERE id_inscripcion = $1 AND estado_inscripcion != $2',
            [id, 'eliminado']
        );

        if (inscripcionCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Inscripción no encontrada'
            });
        }

        // Verificar que el grado_seccion existe (si se proporciona)
        if (id_grado_seccion) {
            const gradoSeccionCheck = await client.query(
                'SELECT id_grado_seccion FROM Grado_seccion WHERE id_grado_seccion = $1',
                [id_grado_seccion]
            );

            if (gradoSeccionCheck.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El grado-sección especificado no existe'
                });
            }
        }

        // Construir query de actualización dinámicamente
        const updateFields = [];
        const updateValues = [];
        let paramCounter = 1;

        if (carnet !== undefined) {
            updateFields.push(`carnet = $${paramCounter}`);
            updateValues.push(carnet);
            paramCounter++;
        }
        if (nombres !== undefined) {
            updateFields.push(`nombres = $${paramCounter}`);
            updateValues.push(nombres);
            paramCounter++;
        }
        if (apellidos !== undefined) {
            updateFields.push(`apellidos = $${paramCounter}`);
            updateValues.push(apellidos);
            paramCounter++;
        }
        if (fecha_nacimiento !== undefined) {
            updateFields.push(`fecha_nacimiento = $${paramCounter}`);
            updateValues.push(fecha_nacimiento);
            paramCounter++;
        }
        if (id_grado_seccion !== undefined) {
            updateFields.push(`id_grado_seccion = $${paramCounter}`);
            updateValues.push(id_grado_seccion);
            paramCounter++;
        }
        if (sire !== undefined) {
            updateFields.push(`sire = $${paramCounter}`);
            updateValues.push(sire);
            paramCounter++;
        }
        if (correo_padres !== undefined) {
            updateFields.push(`correo_padres = $${paramCounter}`);
            updateValues.push(correo_padres);
            paramCounter++;
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No se proporcionaron campos para actualizar'
            });
        }

        updateFields.push(`fecha_actualizacion = CURRENT_TIMESTAMP`);
        updateValues.push(id);

        const updateQuery = `
            UPDATE Inscripciones 
            SET ${updateFields.join(', ')}
            WHERE id_inscripcion = $${paramCounter}
            RETURNING *
        `;

        const result = await client.query(updateQuery, updateValues);

        // Actualizar también la tabla Estudiantes si se modificaron datos básicos
        if (carnet !== undefined || nombres !== undefined || apellidos !== undefined || fecha_nacimiento !== undefined) {
            const oldCarnet = inscripcionCheck.rows[0].carnet;
            const newCarnet = carnet || oldCarnet;
            
            await client.query(`
                UPDATE Estudiantes 
                SET carnet = $1, nombres = $2, apellidos = $3, fecha_nacimiento = $4
                WHERE carnet = $5
            `, [
                newCarnet,
                nombres || inscripcionCheck.rows[0].nombres,
                apellidos || inscripcionCheck.rows[0].apellidos,
                fecha_nacimiento || inscripcionCheck.rows[0].fecha_nacimiento,
                oldCarnet
            ]);
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Inscripción actualizada exitosamente',
            data: result.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al actualizar inscripción:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    } finally {
        client.release();
    }
};

// Eliminar inscripción (soft delete)
const deleteInscripcion = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.getPool().query(`
            UPDATE Inscripciones 
            SET estado_inscripcion = 'eliminado', fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id_inscripcion = $1 AND estado_inscripcion != 'eliminado'
            RETURNING id_inscripcion
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Inscripción no encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Inscripción eliminada exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar inscripción:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Convertir inscripción a estudiante activo
const convertirAEstudiante = async (req, res) => {
    const client = await db.getPool().connect();
    
    try {
        await client.query('BEGIN');

        const { id } = req.params;

        // Verificar que la inscripción existe y está en estado 'inscrito'
        const inscripcionCheck = await client.query(
            'SELECT * FROM Inscripciones WHERE id_inscripcion = $1 AND estado_inscripcion = $2',
            [id, 'inscrito']
        );

        if (inscripcionCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Inscripción no encontrada o no está en estado válido para conversión'
            });
        }

        const inscripcion = inscripcionCheck.rows[0];

        // Llamar a la función PL/pgSQL para convertir inscripción
        const conversionResult = await client.query(
            'SELECT convertir_inscripcion_a_estudiante($1) as resultado',
            [id]
        );

        const resultado = conversionResult.rows[0].resultado;

        if (resultado.success) {
            await client.query('COMMIT');
            res.json({
                success: true,
                message: 'Estudiante activado exitosamente',
                data: {
                    id_inscripcion: id,
                    carnet: inscripcion.carnet,
                    nombres: inscripcion.nombres,
                    apellidos: inscripcion.apellidos,
                    nuevo_estado: 'estudiante_activo'
                }
            });
        } else {
            await client.query('ROLLBACK');
            res.status(400).json({
                success: false,
                message: resultado.message || 'Error al convertir inscripción a estudiante activo'
            });
        }

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al convertir inscripción:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    } finally {
        client.release();
    }
};

// Obtener grados y secciones disponibles
const getGradosYSecciones = async (req, res) => {
    try {
        const result = await db.getPool().query(`
            SELECT 
                gs.id as id_grado_seccion,
                gs.id_grado,
                g.grado,
                gs.id_seccion,
                s.seccion,
                CONCAT(g.grado, ' - ', s.seccion) as display_name,
                gs.capacidad_maxima,
                gs.activo
            FROM Grado_seccion gs
            JOIN Grados g ON gs.id_grado = g.id
            JOIN Secciones s ON gs.id_seccion = s.id
            WHERE gs.activo = true
            ORDER BY g.grado, s.seccion
        `);

        res.json({
            success: true,
            message: 'Grados y secciones obtenidos exitosamente',
            data: result.rows
        });

    } catch (error) {
        console.error('Error al obtener grados y secciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Procesar archivo Excel para carga masiva
const processExcelFile = async (req, res) => {
    const client = await db.getPool().connect();
    
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No se proporcionó archivo Excel'
            });
        }

        // Leer archivo Excel
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        if (data.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'El archivo Excel está vacío'
            });
        }

        await client.query('BEGIN');

        const resultados = {
            exitosos: [],
            errores: [],
            total: data.length
        };

        // Obtener grados-secciones válidos para validación
        const gradosSeccionesValidos = await client.query(
            'SELECT id_grado_seccion FROM Grado_seccion WHERE activo = true'
        );
        const gradosValidos = new Set(gradosSeccionesValidos.rows.map(row => row.id_grado_seccion));

        for (let i = 0; i < data.length; i++) {
            const fila = data[i];
            const numeroFila = i + 2; // +2 porque Excel empieza en 1 y tiene header

            try {
                // Validar campos requeridos
                const camposRequeridos = ['Carnet', 'Nombres', 'Apellidos', 'Fecha_nacimiento', 'ID_Grado_Seccion'];
                const camposFaltantes = camposRequeridos.filter(campo => !fila[campo]);

                if (camposFaltantes.length > 0) {
                    resultados.errores.push({
                        fila: numeroFila,
                        carnet: fila.Carnet || 'N/A',
                        error: `Campos faltantes: ${camposFaltantes.join(', ')}`
                    });
                    continue;
                }

                // Validar grado-sección
                if (!gradosValidos.has(parseInt(fila.ID_Grado_Seccion))) {
                    resultados.errores.push({
                        fila: numeroFila,
                        carnet: fila.Carnet,
                        error: `Grado-sección inválido: ${fila.ID_Grado_Seccion}`
                    });
                    continue;
                }

                // Verificar si ya existe inscripción activa
                const existingInscription = await client.query(
                    'SELECT id_inscripcion FROM Inscripciones WHERE carnet = $1 AND estado_inscripcion = $2',
                    [fila.Carnet, 'inscrito']
                );

                if (existingInscription.rows.length > 0) {
                    resultados.errores.push({
                        fila: numeroFila,
                        carnet: fila.Carnet,
                        error: 'Ya existe una inscripción activa para este carnet'
                    });
                    continue;
                }

                // Crear o actualizar estudiante
                const studentCheck = await client.query(
                    'SELECT id_estudiante FROM Estudiantes WHERE carnet = $1',
                    [fila.Carnet]
                );

                if (studentCheck.rows.length === 0) {
                    // Crear nuevo estudiante
                    await client.query(`
                        INSERT INTO Estudiantes (carnet, nombres, apellidos, fecha_nacimiento)
                        VALUES ($1, $2, $3, $4)
                    `, [fila.Carnet, fila.Nombres, fila.Apellidos, fila.Fecha_nacimiento]);
                } else {
                    // Actualizar estudiante existente
                    await client.query(`
                        UPDATE Estudiantes 
                        SET nombres = $1, apellidos = $2, fecha_nacimiento = $3
                        WHERE carnet = $4
                    `, [fila.Nombres, fila.Apellidos, fila.Fecha_nacimiento, fila.Carnet]);
                }

                // Crear inscripción
                const inscripcionResult = await client.query(`
                    INSERT INTO Inscripciones (
                        carnet, nombres, apellidos, fecha_nacimiento, 
                        id_grado_seccion, sire, correo_padres, estado_inscripcion
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, 'inscrito')
                    RETURNING id_inscripcion
                `, [
                    fila.Carnet,
                    fila.Nombres,
                    fila.Apellidos,
                    fila.Fecha_nacimiento,
                    parseInt(fila.ID_Grado_Seccion),
                    fila.SIRE || null,
                    fila.Correo_padres || null
                ]);

                resultados.exitosos.push({
                    fila: numeroFila,
                    carnet: fila.Carnet,
                    nombres: fila.Nombres,
                    apellidos: fila.Apellidos,
                    id_inscripcion: inscripcionResult.rows[0].id_inscripcion
                });

            } catch (error) {
                resultados.errores.push({
                    fila: numeroFila,
                    carnet: fila.Carnet || 'N/A',
                    error: error.message
                });
            }
        }

        await client.query('COMMIT');

        // Eliminar archivo temporal
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error al eliminar archivo temporal:', err);
        });

        res.json({
            success: true,
            message: `Procesamiento completado. ${resultados.exitosos.length} inscripciones creadas, ${resultados.errores.length} errores`,
            data: resultados
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al procesar archivo Excel:', error);
        
        // Eliminar archivo temporal en caso de error
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error al eliminar archivo temporal:', err);
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    } finally {
        client.release();
    }
};

module.exports = {
    getInscripciones,
    getInscripcionById,
    createInscripcion,
    updateInscripcion,
    deleteInscripcion,
    convertirAEstudiante,
    getGradosYSecciones,
    processExcelFile,
    uploadMiddleware
};
