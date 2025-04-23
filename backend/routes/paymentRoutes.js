const express = require('express');
const router = express.Router();
const { upload, uploadPayments } = require('../controllers/paymentControllers');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');
const { 
    addPayment,
    getPayments,
    updatePayment,
    deletePayment
  } = require('../controllers/manualPaymentsController');
const db = require('../database_cn'); 

router.post('/upload', verifyToken, isAdmin, (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                error: err.message
            });
        }
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No se ha seleccionado ningún archivo'
            });
        }
        
        await uploadPayments(req, res);
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
      console.error('Error fetching students payments:', error)
      res.status(500).json({ error: 'Error fetching students payments' })
    }
  })

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
                CONCAT(e.nombre, ' ', e.apellido) AS student,
                g.grado AS grade,
                s.monto AS amount,
                s.mes_solvencia_new AS month
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
        res.json(result.rows);
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
})

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
                s.fecha_pago AS paymentDate
            FROM estudiantes e
            LEFT JOIN pagos p ON e.carnet = p.carnet_estudiante
            LEFT JOIN solvencias s ON p.id = s.id_pagos
            LEFT JOIN grado_seccion gs ON e.id_grado_seccion = gs.id
            LEFT JOIN grados g ON gs.id_grado = g.id
        `;

        const summaryQuery = `
            SELECT 
                g.grado AS grade,
                COALESCE(COUNT(DISTINCT e.carnet), 0) AS upToDate
            FROM grados g
            LEFT JOIN grado_seccion gs ON g.id = gs.id_grado
            LEFT JOIN estudiantes e ON gs.id = e.id_grado_seccion
            LEFT JOIN pagos p ON e.carnet = p.carnet_estudiante
            LEFT JOIN solvencias s ON p.id = s.id_pagos AND s.mes_solvencia_new IS NOT NULL
            GROUP BY g.grado
            ORDER BY g.grado
        `;

        const [paymentsResult, summaryResult] = await Promise.all([
            db.getPool().query(paymentsQuery),
            db.getPool().query(summaryQuery),
        ]);

        res.json({
            payments: paymentsResult.rows,
            summary: summaryResult.rows,
        });
    } catch (error) {
        console.error('Error fetching full report:', error);
        res.status(500).json({ error: 'Error al generar el reporte completo' });
    }
});

//CRUD manual de pagos
router.post('/', verifyToken, isAdmin, addPayment);
router.put('/:id', verifyToken, isAdmin, updatePayment);
router.delete('/:id', verifyToken, isAdmin, deletePayment);
router.get('/', verifyToken, isAdmin, getPayments);

module.exports = router;