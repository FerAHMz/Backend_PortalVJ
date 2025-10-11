const db = require('../database_cn');
const { validatePaymentData } = require('./paymentValidator');

// Función auxiliar para manejar errores
const handleError = (res, error, defaultMessage = 'Error en el servidor') => {
  console.error('Payment Error:', error.message, error.stack);
  res.status(500).json({
    success: false,
    error: error.message || defaultMessage
  });
};

// Agregar un nuevo pago
const addPayment = async (req, res) => {
  const { nombre_padre, apellido_padre, carnet_estudiante, mes_solvencia, fecha_pago, no_boleta, id_metodo_pago, monto } = req.body;
  let client;

  try {
    // Validación de datos
    const validationErrors = validatePaymentData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        errors: validationErrors
      });
    }

    client = await db.getPool().connect();
    await client.query('BEGIN');

    // Obtener el id_padre
    const padreResult = await client.query(`
            SELECT p.id 
            FROM padres p
            JOIN familias f ON p.id = f.id_padre
            WHERE p.nombre = $1 
              AND p.apellido = $2
              AND f.carnet_estudiante = $3
            LIMIT 1
        `, [nombre_padre, apellido_padre, carnet_estudiante]);

    if (padreResult.rows.length === 0) {
      throw new Error('No se encontró un padre/tutor con los datos proporcionados');
    }

    const id_padre = padreResult.rows[0].id;

    // Verificar existencia del estudiante y método de pago
    const [studentExists, methodExists] = await Promise.all([
      client.query('SELECT carnet FROM estudiantes WHERE carnet = $1', [carnet_estudiante]),
      client.query('SELECT id FROM metodo_pago WHERE id = $1', [id_metodo_pago])
    ]);

    if (studentExists.rows.length === 0) {
      throw new Error('El estudiante no existe en el sistema');
    }
    if (methodExists.rows.length === 0) {
      throw new Error('El método de pago no existe');
    }

    // Verificar duplicados de boleta
    const boletaExists = await client.query(
      'SELECT id FROM solvencias WHERE no_boleta = $1',
      [no_boleta]
    );
    if (boletaExists.rows.length > 0) {
      throw new Error('El número de boleta ya está registrado');
    }

    // Insertar en Pagos
    const paymentResult = await client.query(
      `INSERT INTO pagos (id_padre, carnet_estudiante) 
             VALUES ($1, $2) RETURNING id`,
      [id_padre, carnet_estudiante]
    );
    const id_pagos = paymentResult.rows[0].id;

    // Insertar en Solvencias
    await client.query(
      `INSERT INTO solvencias 
             (id_pagos, mes_solvencia_new, fecha_pago, no_boleta, id_metodo_pago, monto) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
      [id_pagos, mes_solvencia, fecha_pago, no_boleta, id_metodo_pago, monto]
    );

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      id_pagos,
      message: 'Pago registrado exitosamente'
    });
  } catch (error) {
    await client?.query('ROLLBACK');
    handleError(res, error, 'Error al registrar el pago');
  } finally {
    client?.release();
  }
};

const getPayments = async (req, res) => {
  let client;
  try {
    client = await db.getPool().connect();
    const result = await client.query(`
                SELECT 
                    e.carnet AS id,
                    CONCAT(e.nombre, ' ', e.apellido) AS name,
                    g.grado AS grade,
                    p.id AS id_pago,
                    s.mes_solvencia_new as mes_solvencia,
                    s.monto,
                    s.id_metodo_pago,
                    s.no_boleta,
                    s.fecha_pago,
                    pa.nombre as nombre_padre,
                    pa.apellido as apellido_padre,
                    CASE 
                         WHEN COUNT(s.id) = 12 THEN 'Solvente'
                         ELSE 'No Solvente'
                     END AS status
                FROM pagos p
                LEFT JOIN estudiantes e ON e.carnet = p.carnet_estudiante
                LEFT JOIN padres pa ON p.id_padre = pa.id
                LEFT JOIN solvencias s ON p.id = s.id_pagos AND s.estado = TRUE
                LEFT JOIN grado_seccion gs ON e.id_grado_seccion = gs.id
                LEFT JOIN grados g ON gs.id_grado = g.id
                WHERE p.estado = TRUE
                GROUP BY e.carnet, e.nombre, e.apellido, g.grado, p.id, s.mes_solvencia_new, s.monto, s.id_metodo_pago, s.no_boleta, s.fecha_pago, pa.nombre, pa.apellido;
            `);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching students payments:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal Server Error' 
    });
  } finally {
    client?.release();
  }
};

// Editar pago existente
const updatePayment = async (req, res) => {
  const { id } = req.params;
  const paymentData = req.body;
  let client;

  try {
    // Validación de datos
    const validationErrors = validatePaymentData(paymentData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        errors: validationErrors
      });
    }

    client = await db.getPool().connect();
    await client.query('BEGIN');

    // Verificar que el pago existe
    const paymentExists = await client.query(
      'SELECT id FROM pagos WHERE id = $1',
      [id]
    );
    if (paymentExists.rows.length === 0) {
      throw new Error('El pago no existe');
    }

    // Obtener el id_padre
    const padreResult = await client.query(`
            SELECT p.id 
            FROM padres p
            JOIN familias f ON p.id = f.id_padre
            WHERE p.nombre = $1 
              AND p.apellido = $2
              AND f.carnet_estudiante = $3
            LIMIT 1
        `, [paymentData.nombre_padre, paymentData.apellido_padre, paymentData.carnet_estudiante]);

    if (padreResult.rows.length === 0) {
      throw new Error('No se encontró un padre/tutor con los datos proporcionados');
    }

    const id_padre = padreResult.rows[0].id;


    const [studentExists, methodExists] = await Promise.all([
      client.query('SELECT carnet FROM estudiantes WHERE carnet = $1', [paymentData.carnet_estudiante]),
      client.query('SELECT id FROM metodo_pago WHERE id = $1', [paymentData.id_metodo_pago])
    ]);

    if (studentExists.rows.length === 0) {
      throw new Error('No se encontró al estudiante');
    }
    if (methodExists.rows.length === 0) {
      throw new Error('No se encontró el metodo de pago');
    }

    // Verificar duplicados de número de boleta
    const boletaExists = await client.query(
      `SELECT id FROM solvencias 
             WHERE no_boleta = $1 AND id_pagos != $2`,
      [paymentData.no_boleta, id]
    );
    if (boletaExists.rows.length > 0) {
      throw new Error('El número de boleta ya está registrado en otro pago');
    }

    // Actualizar Pagos
    await client.query(
      `UPDATE pagos 
             SET id_padre = $1, carnet_estudiante = $2 
             WHERE id = $3`,
      [id_padre, paymentData.carnet_estudiante, id]
    );

    // Actualizar Solvencias
    await client.query(
      `UPDATE solvencias 
             SET mes_solvencia_new = $1, 
                 fecha_pago = $2, 
                 no_boleta = $3, 
                 id_metodo_pago = $4, 
                 monto = $5
             WHERE id_pagos = $6`,
      [
        paymentData.mes_solvencia,
        paymentData.fecha_pago,
        paymentData.no_boleta,
        paymentData.id_metodo_pago,
        paymentData.monto,
        id
      ]
    );

    await client.query('COMMIT');
    res.json({
      success: true,
      message: 'Pago actualizado exitosamente'
    });
  } catch (error) {
    await client?.query('ROLLBACK');
    handleError(res, error, 'Error al actualizar el pago');
  } finally {
    client?.release();
  }
};

// Invalidar un pago
const invalidatePayment = async (req, res) => {
  const { id } = req.params;
  const { razon, usuarioId, tipoUsuario } = req.body;
  let client;

  if (!razon || razon.trim() === '') {
    return res.status(400).json({ error: 'Debe proporcionar una razón válida.' });
  }

  try {
    client = await db.getPool().connect();
    await client.query('BEGIN');

    // Verificar que el pago existe
    const paymentExists = await client.query(
      'SELECT id FROM pagos WHERE id = $1 AND estado = TRUE',
      [id]
    );
    if (paymentExists.rows.length === 0) {
      throw new Error('El pago no existe o ya está invalidado');
    }

    // Invalidar Solvencias
    const solvenciaResult = await client.query(
      'UPDATE solvencias SET estado = FALSE WHERE id_pagos = $1',
      [id]
    );

    if (solvenciaResult.rowCount === 0) {
      throw new Error('No se encontraron solvencias para este pago');
    }

    // Invalidar el pago y guardar la razón
    await client.query(
      'UPDATE pagos SET estado = FALSE, razon_invalidacion = $1 WHERE id = $2',
      [razon, id]
    );

    // Registrar en auditoria_pagos
    await client.query(
      `INSERT INTO auditoria_pagos 
                (usuario_id, tipo_usuario, accion, descripcion, entidad_afectada, id_entidad_afectada) 
             VALUES 
                ($1, $2, 'Invalidación de pago', $3, 'pagos', $4)`,
      [usuarioId, tipoUsuario, razon, id]
    );

    await client.query('COMMIT');
    res.json({
      success: true,
      message: 'Pago invalidado exitosamente'
    });
  } catch (error) {
    await client?.query('ROLLBACK');
    handleError(res, error, 'Error al invalidar el pago');
  } finally {
    client?.release();
  }
};

module.exports = {
  addPayment,
  getPayments,
  updatePayment,
  invalidatePayment
};
