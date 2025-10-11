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
    if (!req.file || !req.file.buffer) {
      console.log('Invalid file upload');
      return res.status(400).json({
        success: false,
        error: 'Archivo inválido o vacío'
      });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      console.log('Invalid Excel format');
      return res.status(400).json({
        success: false,
        error: 'Formato de Excel inválido o archivo vacío'
      });
    }

    const validation = validateExcelContent(workbook);

    if (!validation || !validation.isValid) {
      return res.status(400).json({
        success: false,
        errors: validation?.errors || ['Error al validar el archivo']
      });
    }

    client = await db.getPool().connect();
    await client.query('BEGIN');

    const result = {
      insertedCount: 0,
      duplicates: []
    };

    for (const payment of validation.data) {
      try {
        // Verificar si el pago ya existe
        const existingPayment = await client.query(
          `SELECT id FROM Solvencias 
                     WHERE carnet_estudiante = $1 
                     AND mes_solvencia_new = $2 
                     AND no_boleta = $3`,
          [payment.carne, payment.mes_solvencia, payment.no_boleta]
        );

        if (existingPayment.rows.length > 0) {
          result.duplicates.push({
            carne: payment.carne,
            mes_solvencia: payment.mes_solvencia,
            no_boleta: payment.no_boleta
          });
          continue; // Salta al siguiente pago
        }

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

        result.insertedCount++;
      } catch (error) {
        console.error('Error processing payment:', error);
        throw error;
      }
    }

    await client.query('COMMIT');
    res.status(200).json({
      success: true,
      message: 'Pagos procesados exitosamente',
      insertedCount: result.insertedCount,
      duplicatesCount: result.duplicates.length,
      duplicates: result.duplicates
    });
  } catch (error) {
    console.error('Upload error:', error);
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
