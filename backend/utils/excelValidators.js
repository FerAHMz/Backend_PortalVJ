const XLSX = require('xlsx');

const validateExcelContent = (workbook) => {
    if (!workbook || !workbook.Sheets || !workbook.SheetNames || workbook.SheetNames.length === 0) {
        return {
            isValid: false,
            errors: ['Archivo Excel inválido o corrupto'],
            data: null
        };
    }

    const errors = [];
    const requiredColumns = [
        'carne',
        'apellido_estudiante',
        'nombre_estudiante',
        'mes_solvencia',
        'fecha_pago',
        'monto',
        'no_boleta',
        'metodo_pago'
    ];

    // Valid payment methods from Metodo_pago
    const validPaymentMethods = ['Efectivo', 'Tarjeta', 'Transferencia', 'Serbipagos'];

    // Valid months from Solvencias
    const validMonths = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet);
    
    if (data.length === 0) {
        errors.push('No se encontraron datos en el archivo Excel.');
        return { isValid: false, errors };
    }

    const headers = Object.keys(data[0]);
    requiredColumns.forEach(column => {
        if (!headers.includes(column)) {
            errors.push(`La columna "${column}" es requerida.`);
        }
    });

    data.forEach((row, index) => {
        // Validate carnet
        if (!row.carne || typeof row.carne !== 'number') {
            errors.push(`Fila ${index + 1}: El carné debe ser un número válido.`);
        }

        // Validate required text fields
        if (!row.apellido_estudiante || row.apellido_estudiante.trim() === '') {
            errors.push(`Fila ${index + 1}: El apellido del estudiante es requerido.`);
        }
        if (!row.nombre_estudiante || row.nombre_estudiante.trim() === '') {
            errors.push(`Fila ${index + 1}: El nombre del estudiante es requerido.`);
        }

        // Validate mes_solvencia
        if (!row.mes_solvencia || row.mes_solvencia.trim() === '') {
            errors.push(`Fila ${index + 1}: El mes de solvencia es requerido.`);
        } else if (!validMonths.includes(row.mes_solvencia)) {
            errors.push(`Fila ${index + 1}: Mes de solvencia inválido. Debe ser uno de: ${validMonths.join(', ')}`);
        }

        // Validate fecha_pago
        if (!row.fecha_pago || !/^\d{2}\/\d{2}\/\d{4}$/.test(row.fecha_pago)) {
            errors.push(`Fila ${index + 1}: La fecha de pago debe estar en formato DD/MM/YYYY`);
        } else {
            const [day, month, year] = row.fecha_pago.split('/');
            const date = new Date(year, month - 1, day);
            if (isNaN(date.getTime())) {
                errors.push(`Fila ${index + 1}: La fecha de pago no es válida`);
            }
        }

        // Validate monto
        if (!row.monto || typeof row.monto !== 'number' || row.monto <= 0) {
            errors.push(`Fila ${index + 1}: El monto debe ser un número positivo.`);
        } else if (!Number.isInteger(row.monto * 100) || row.monto > 99999999.99) {
            errors.push(`Fila ${index + 1}: El monto debe tener máximo 2 decimales y no exceder 99,999,999.99`);
        }

        // Validate no_boleta
        if (!row.no_boleta) {
            errors.push(`Fila ${index + 1}: El número de boleta es requerido.`);
        } else if (!Number.isInteger(Number(row.no_boleta))) {
            errors.push(`Fila ${index + 1}: El número de boleta debe ser un número entero.`);
        }

        // Validate metodo_pago
        if (!row.metodo_pago || row.metodo_pago.trim() === '') {
            errors.push(`Fila ${index + 1}: El método de pago es requerido.`);
        } else if (!validPaymentMethods.includes(row.metodo_pago)) {
            errors.push(`Fila ${index + 1}: Método de pago inválido. Debe ser uno de: ${validPaymentMethods.join(', ')}`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
        data: errors.length === 0 ? data : null
    }
}

module.exports = {
    validateExcelContent
}