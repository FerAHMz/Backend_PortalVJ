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
router.get('/students', async (req, res) => {
    try {
        const result = await db.getPool().query(`
            SELECT 
                e.carnet AS id,
                CONCAT(e.nombre, ' ', e.apellido) AS name,
                CASE 
                    WHEN COUNT(s.id) = 12 THEN 'Al día'
                    ELSE 'Pendiente'
                END AS estado,
                g.grado AS grade
            FROM estudiantes e
            LEFT JOIN solvencias s ON e.carnet = s.id_pagos
            LEFT JOIN grados g ON e.id_grado_seccion = g.id
            GROUP BY e.carnet, e.nombre, e.apellido, g.grado
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching students payments:', error);
        res.status(500).json({ error: 'Error fetching students payments' });
    }
});

module.exports = router;