const db = require('../database_cn');

// Obtener hijos del padre autenticado usando la tabla Familias
exports.getChildren = async (req, res) => {
  try {
    const parentId = req.user.id;
    const result = await db.getPool().query(
      `SELECT e.carnet, e.nombre, e.apellido
       FROM Familias f
       JOIN Estudiantes e ON f.carnet_estudiante = e.carnet
       WHERE f.id_padre = $1`,
      [parentId]
    );
    res.json({ success: true, children: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener hijos' });
  }
};

// Obtener calificaciones por hijo y asignatura
exports.getStudentGrades = async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await db.getPool().query(
      `SELECT m.id AS materia_id, m.nombre AS materia, t.trimestre_id, SUM(g.nota) AS total
       FROM calificaciones g
       JOIN cursos c ON g.id_curso = c.id
       JOIN materias m ON c.id_materia = m.id
       JOIN tareas t ON g.id_tarea = t.id
       WHERE g.carnet_estudiante = $1
       GROUP BY m.id, m.nombre, t.trimestre_id
       ORDER BY m.nombre, t.trimestre_id`,
      [studentId]
    );
    res.json({ success: true, grades: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener calificaciones' });
  }
};

// Obtener desglose de calificaciones por tarea en una asignatura
exports.getStudentTaskGrades = async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    const result = await db.getPool().query(
      `SELECT t.id AS tarea_id, t.titulo, t.trimestre_id, g.nota
       FROM calificaciones g
       JOIN tareas t ON g.id_tarea = t.id
       JOIN cursos c ON g.id_curso = c.id
       WHERE g.carnet_estudiante = $1 AND c.id_materia = $2
       ORDER BY t.trimestre_id, t.titulo`,
      [studentId, subjectId]
    );
    res.json({ success: true, tasks: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener calificaciones de tareas' });
  }
};

// Obtener historial de pagos por hijo
exports.getChildPaymentHistory = async (req, res) => {
  try {
    const parentId = req.user.id;
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    // Verificar que el estudiante pertenece al padre
    const childVerification = await db.getPool().query(
      `SELECT e.carnet FROM Familias f
       JOIN Estudiantes e ON f.carnet_estudiante = e.carnet
       WHERE f.id_padre = $1 AND e.carnet = $2`,
      [parentId, studentId]
    );

    if (childVerification.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'No tiene permisos para ver los pagos de este estudiante' 
      });
    }

    // Construir query con filtros de fecha opcionales
    const currentYear = new Date().getFullYear();
    
    let query = `
      SELECT 
        s.id,
        s.mes_solvencia_new as mes,
        s.fecha_pago,
        s.monto,
        s.no_boleta,
        mp.metodo_pago,
        s.estado,
        p.estado as pago_estado,
        CASE 
          WHEN s.estado = FALSE OR p.estado = FALSE THEN 'Invalidado'
          WHEN s.estado = TRUE AND p.estado = TRUE AND s.monto >= 500.00 THEN 'Pagado'
          WHEN s.estado = TRUE AND p.estado = TRUE AND s.monto < 500.00 THEN 'Pago Parcial'
          ELSE 'Pendiente'
        END as estado_descriptivo
      FROM Pagos p
      JOIN Solvencias s ON p.id = s.id_pagos
      JOIN Metodo_pago mp ON s.id_metodo_pago = mp.id
      WHERE p.carnet_estudiante = $1 AND p.id_padre = $2
    `;

    const queryParams = [studentId, parentId];
    let paramCount = 2;

    // Si no hay filtros de fecha, mostrar solo el año actual
    // Si hay filtros de fecha, permitir búsqueda histórica
    if (!startDate && !endDate) {
      paramCount++;
      query += ` AND EXTRACT(YEAR FROM s.fecha_pago) = $${paramCount}`;
      queryParams.push(currentYear);
    }

    if (startDate) {
      paramCount++;
      query += ` AND s.fecha_pago >= $${paramCount}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND s.fecha_pago <= $${paramCount}`;
      queryParams.push(endDate);
    }

    query += ` ORDER BY s.fecha_pago DESC`;

    const result = await db.getPool().query(query, queryParams);

    // Obtener resumen de pagos con la misma lógica de filtrado
    let summaryQuery = `
      SELECT 
        COUNT(*) as total_pagos,
        COUNT(CASE WHEN s.estado = TRUE AND p.estado = TRUE AND s.monto >= 500.00 THEN 1 END) as pagos_realizados,
        COUNT(CASE WHEN s.estado = TRUE AND p.estado = TRUE AND s.monto < 500.00 THEN 1 END) as pagos_parciales,
        COUNT(CASE WHEN s.estado = FALSE OR p.estado = FALSE THEN 1 END) as pagos_invalidados,
        COALESCE(SUM(CASE WHEN s.estado = TRUE AND p.estado = TRUE THEN s.monto ELSE 0 END), 0) as total_pagado
      FROM Pagos p
      JOIN Solvencias s ON p.id = s.id_pagos
      WHERE p.carnet_estudiante = $1 AND p.id_padre = $2
    `;

    let summaryParams = [studentId, parentId];
    let summaryParamCount = 2;

    // Si no hay filtros de fecha, mostrar solo el año actual
    // Si hay filtros de fecha, permitir búsqueda histórica
    if (!startDate && !endDate) {
      summaryParamCount++;
      summaryQuery += ` AND EXTRACT(YEAR FROM s.fecha_pago) = $${summaryParamCount}`;
      summaryParams.push(currentYear);
    }

    if (startDate) {
      summaryParamCount++;
      summaryQuery += ` AND s.fecha_pago >= $${summaryParamCount}`;
      summaryParams.push(startDate);
    }

    if (endDate) {
      summaryParamCount++;
      summaryQuery += ` AND s.fecha_pago <= $${summaryParamCount}`;
      summaryParams.push(endDate);
    }

    const summaryResult = await db.getPool().query(summaryQuery, summaryParams);

    res.json({ 
      success: true, 
      payments: result.rows,
      summary: summaryResult.rows[0]
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ success: false, error: 'Error al obtener historial de pagos' });
  }
};

// Obtener pagos pendientes por hijo
exports.getChildPendingPayments = async (req, res) => {
  try {
    const parentId = req.user.id;
    const { studentId } = req.params;

    // Verificar que el estudiante pertenece al padre
    const childVerification = await db.getPool().query(
      `SELECT e.carnet FROM Familias f
       JOIN Estudiantes e ON f.carnet_estudiante = e.carnet
       WHERE f.id_padre = $1 AND e.carnet = $2`,
      [parentId, studentId]
    );

    if (childVerification.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'No tiene permisos para ver los pagos de este estudiante' 
      });
    }

    // Obtener año actual y mes actual
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-11 (Enero = 0)

    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Solo considerar meses que ya han pasado (hasta el mes actual)
    const monthsToCheck = months.slice(0, currentMonth + 1);

    // Monto mínimo esperado para considerar un mes como pagado (Q500.00)
    const MONTO_MINIMO = 500.00;

    // Obtener meses que tienen pago suficiente
    const paidMonthsQuery = `
      SELECT DISTINCT s.mes_solvencia_new 
      FROM Pagos p
      JOIN Solvencias s ON p.id = s.id_pagos
      WHERE p.carnet_estudiante = $1 AND p.id_padre = $2 
      AND s.estado = TRUE AND p.estado = TRUE
      AND s.monto >= $3
      AND EXTRACT(YEAR FROM s.fecha_pago) = $4
    `;

    const paidMonths = await db.getPool().query(paidMonthsQuery, [
      studentId, 
      parentId, 
      MONTO_MINIMO, 
      currentYear
    ]);

    const paidMonthsList = paidMonths.rows.map(row => row.mes_solvencia_new);
    
    // Filtrar solo los meses que ya pasaron y no están pagados
    const pendingMonths = monthsToCheck.filter(month => !paidMonthsList.includes(month));

    res.json({ 
      success: true, 
      pendingMonths: pendingMonths,
      year: currentYear,
      monthsChecked: monthsToCheck.length,
      montoMinimo: MONTO_MINIMO
    });
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({ success: false, error: 'Error al obtener pagos pendientes' });
  }
};
