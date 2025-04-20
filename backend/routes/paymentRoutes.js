const express = require('express');
const router = express.Router();
const { upload, uploadPayments } = require('../controllers/paymentControllers');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');
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

router.post('/report', async (req, res) => {
    const { searchQuery, grade, startDate, endDate } = req.body

    try {
        const query = `
            SELECT 
                CONCAT(e.nombre, ' ', e.apellido) AS student,
                g.grado AS grade,
                COUNT(s.id) AS totalPayments,
                (12 - COUNT(s.id)) AS pendingPayments
            FROM estudiantes e
            LEFT JOIN pagos p ON e.carnet = p.carnet_estudiante
            LEFT JOIN solvencias s ON p.id = s.id_pagos
            LEFT JOIN grado_seccion gs ON e.id_grado_seccion = gs.id
            LEFT JOIN grados g ON gs.id_grado = g.id
            WHERE ($1::text IS NULL OR CONCAT(e.nombre, ' ', e.apellido) ILIKE '%' || $1 || '%')
              AND ($2::text IS NULL OR g.grado = $2)
              AND ($3::date IS NULL OR s.fecha_pago >= $3)
              AND ($4::date IS NULL OR s.fecha_pago <= $4)
            GROUP BY e.carnet, e.nombre, e.apellido, g.grado
        `

        const values = [
            searchQuery || null,
            grade || null,
            startDate || null,
            endDate || null,
        ]

        const result = await db.getPool().query(query, values)
        res.json(result.rows)
    } catch (error) {
        console.error('Error generating report:', error)
        res.status(500).json({ error: 'Error al generar el reporte' })
    }
})

module.exports = router;