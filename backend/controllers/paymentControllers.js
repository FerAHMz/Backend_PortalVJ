const multer = require('multer');
const XLSX = require('xlsx');
const { validateExcelContent } = require('../utils/excelValidators');
const db = require('../database_cn');

const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
            file.mimetype === 'application/vnd.ms-excel' ||
            file.mimetype === 'text/csv') {
            cb(null, true);
        } else {
            cb(new Error('Formato de archivo no soportado. Use .xlsx, .xls o .csv'));
        }
    }
}).single('file');

const uploadPayments = async (req, res) => {
    let client;
    try {
        client = await db.getPool().connect();
        
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const validation = validateExcelContent(workbook);
        
        if (!validation.isValid) {
            return res.status(400).json({ 
                success: false, 
                errors: validation.errors 
            });
        }

        await client.query('BEGIN');

        for (const payment of validation.data) {
            // Verify student exists
            const studentExists = await client.query(
                'SELECT carnet FROM Estudiantes WHERE carnet = $1',
                [payment.carne]
            );

            if (studentExists.rows.length === 0) {
                throw new Error(`El estudiante con carné ${payment.carne} no existe`);
            }

            // Convert date from DD/MM/YYYY to YYYY-MM-DD
            const [day, month, year] = payment.fecha_pago.split('/');
            const date = new Date(year, month - 1, day);
            if (isNaN(date.getTime())) {
                throw new Error(`Fecha inválida para el pago: ${payment.fecha_pago}`);
            }
            const formattedDate = `${year}-${month}-${day}`;

            await client.query(
                `INSERT INTO Solvencias (
                    carnet_estudiante, 
                    mes_solvencia_new, 
                    fecha_pago, 
                    monto, 
                    no_boleta, 
                    id_metodo_pago
                ) VALUES ($1, $2, $3, $4, $5, 
                    (SELECT id FROM Metodo_pago WHERE metodo_pago = $6)
                )`,
                [
                    payment.carne,
                    payment.mes_solvencia,
                    formattedDate,
                    payment.monto,
                    payment.no_boleta,
                    payment.metodo_pago
                ]
            );
        }

        await client.query('COMMIT');
        res.status(200).json({ 
            success: true, 
            message: 'Pagos procesados exitosamente',
            count: validation.data.length
        });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        res.status(500).json({ 
            success: false, 
            error: 'Error al procesar el archivo: ' + error.message 
        });
    } finally {
        if (client) client.release();
    }
};

module.exports = {
    upload,
    uploadPayments
};