const express = require('express');
const router = express.Router();
const { upload, uploadPayments } = require('../controllers/paymentControllers');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');
const {
  addPayment,
  getPayments: getManualPayments,
  updatePayment,
  invalidatePayment
} = require('../controllers/manualPaymentsController');
const {
  createPayment,
  getPayments
} = require('../controllers/paymentController');
const db = require('../database_cn');

router.post('/upload', verifyToken, isAdmin, (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
    uploadPayments(req, res).catch(next);
  });
});

// Student payments route
router.get('/students-payments', async (req, res) => {
  try {
    const result = await db.getPool().query(`
            SELECT 
                e.carnet AS id,
                CONCAT(e.nombre, ' ', e.apellido) AS name,
                g.grado AS grade,
                CASE 
                    WHEN COUNT(s.id) = 12 THEN 'Solvente'
                    ELSE 'No Solvente'
                END AS status
            FROM estudiantes e
            LEFT JOIN pagos p ON e.carnet = p.carnet_estudiante
            LEFT JOIN solvencias s ON p.id = s.id_pagos
            LEFT JOIN grado_seccion gs ON e.id_grado_seccion = gs.id
            LEFT JOIN grados g ON gs.id_grado = g.id
            GROUP BY e.carnet, e.nombre, e.apellido, g.grado
        `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching students payments:', error);
    res.status(500).json({ error: 'Error fetching students payments' });
  }
});

// Student status route
router.get('/students-status', async (req, res) => {
  try {
    const result = await db.getPool().query(`
            SELECT 
                e.carnet AS id,
                CONCAT(e.nombre, ' ', e.apellido) AS name,
                g.grado AS grade,
                CASE 
                    WHEN COUNT(s.id) = 12 THEN 'Solvente'
                    ELSE 'No Solvente'
                END AS status
            FROM estudiantes e
            LEFT JOIN pagos p ON e.carnet = p.carnet_estudiante
            LEFT JOIN solvencias s ON p.id = s.id_pagos
            LEFT JOIN grado_seccion gs ON e.id_grado_seccion = gs.id
            LEFT JOIN grados g ON gs.id_grado = g.id
            GROUP BY e.carnet, e.nombre, e.apellido, g.grado
        `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching students status:', error);
    res.status(500).json({ error: 'Error fetching students status' });
  }
});

router.post('/report', async (req, res) => {
  const { searchQuery, carnetQuery, grade, startDate, endDate } = req.body;

  try {
    const query = `
            SELECT 
                e.carnet AS carnet,
                CONCAT(e.nombre, ' ', e.apellido) AS student,
                g.grado AS grade,
                s.monto AS amount,
                s.mes_solvencia_new AS month,
                COALESCE(TO_CHAR(s.fecha_pago, 'DD/MM/YYYY'), 'No Pagado') AS paymentdate
            FROM estudiantes e
            LEFT JOIN pagos p ON e.carnet = p.carnet_estudiante
            LEFT JOIN solvencias s ON p.id = s.id_pagos
            LEFT JOIN grado_seccion gs ON e.id_grado_seccion = gs.id
            LEFT JOIN grados g ON gs.id_grado = g.id
            WHERE ($1::text IS NULL OR CONCAT(e.nombre, ' ', e.apellido) ILIKE '%' || $1 || '%')
              AND ($2::text IS NULL OR e.carnet::text ILIKE '%' || $2 || '%')
              AND ($3::text IS NULL OR g.grado = $3)
              AND ($4::date IS NULL OR s.fecha_pago >= $4)
              AND ($5::date IS NULL OR s.fecha_pago <= $5)
        `;

    const values = [
      searchQuery || null,
      carnetQuery || null,
      grade || null,
      startDate || null,
      endDate || null,
    ];

    const result = await db.getPool().query(query, values);

    // Add logic to identify unpaid months
    const updatedRows = result.rows.map(row => {
      if (row.paymentdate === 'No Pagado') {
        return {
          ...row,
          month: row.month ? `Mes pendiente: ${row.month}` : 'Mes no especificado',
          paymentdate: 'No se ha realizado el pago de este mes'
        };
      }
      return row;
    });

    res.json(updatedRows);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Error al generar el reporte' });
  }
});

router.get('/grades', async (req, res) => {
  try {
    const result = await db.getPool().query('SELECT id, grado FROM grados');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({ error: 'Error fetching grades' });
  }
});

// Full report route
router.get('/full-report', async (req, res) => {
  try {
    const paymentsQuery = `
            SELECT 
                e.carnet AS carnet,
                CONCAT(e.nombre, ' ', e.apellido) AS student,
                g.grado AS grade,
                s.monto AS amount,
                s.mes_solvencia_new AS month,
                COALESCE(TO_CHAR(s.fecha_pago, 'DD/MM/YYYY'), 'No Pagado') AS paymentdate
            FROM estudiantes e
            LEFT JOIN pagos p ON e.carnet = p.carnet_estudiante
            LEFT JOIN solvencias s ON p.id = s.id_pagos
            LEFT JOIN grado_seccion gs ON e.id_grado_seccion = gs.id
            LEFT JOIN grados g ON gs.id_grado = g.id
        `;

    const summaryQuery = `
            SELECT 
                g.grado AS grade,
                COUNT(DISTINCT CASE 
                    WHEN student_payments.payment_count = 12 THEN student_payments.carnet 
                    ELSE NULL 
                END) AS upToDate
            FROM grados g
            LEFT JOIN grado_seccion gs ON g.id = gs.id_grado
            LEFT JOIN estudiantes e ON gs.id = e.id_grado_seccion
            LEFT JOIN (
                SELECT 
                    p.carnet_estudiante as carnet,
                    COUNT(s.id) as payment_count
                FROM pagos p
                LEFT JOIN solvencias s ON p.id = s.id_pagos
                WHERE s.fecha_pago IS NOT NULL
                GROUP BY p.carnet_estudiante
            ) student_payments ON e.carnet = student_payments.carnet
            GROUP BY g.grado, g.id
            ORDER BY g.grado
        `;

    const [paymentsResult, summaryResult] = await Promise.all([
      db.getPool().query(paymentsQuery),
      db.getPool().query(summaryQuery),
    ]);

    res.json({
      summary: summaryResult.rows,
      payments: paymentsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching full report:', error);
    res.status(500).json({ error: 'Error al generar el reporte completo' });
  }
});

//Basic payment CRUD
router.post('/', verifyToken, isAdmin, createPayment);
router.get('/', verifyToken, isAdmin, getPayments);

//Manual payments CRUD  
router.post('/manual', verifyToken, isAdmin, addPayment);
router.put('/manual/:id', verifyToken, isAdmin, updatePayment);
router.put('/manual/invalidate/:id', verifyToken, isAdmin, invalidatePayment);
router.get('/manual', verifyToken, isAdmin, getManualPayments);

module.exports = router;


