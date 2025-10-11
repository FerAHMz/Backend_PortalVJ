const XLSX = require('xlsx');

const validateExcelContent = (workbook) => {
  if (!workbook || !workbook.Sheets || !workbook.SheetNames || workbook.SheetNames.length === 0) {
    return {
      isValid: false,
      errors: ['Archivo Excel inválido o corrupto'],
      data: null
    };
  }

  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet);

  if (data.length === 0) {
    return {
      isValid: false,
      errors: ['No se encontraron datos en el archivo Excel.'],
      data: null
    };
  }

  const rowErrors = {};
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

  const validPaymentMethods = ['Efectivo', 'Tarjeta', 'Transferencia', 'Serbipagos'];
  const validMonths = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const headers = Object.keys(data[0]);
  const headerErrors = [];

  requiredColumns.forEach(column => {
    if (!headers.includes(column)) {
      headerErrors.push(`La columna "${column}" es requerida`);
    }
  });

  if (headerErrors.length > 0) {
    return {
      isValid: false,
      errors: headerErrors,
      data: null
    };
  }

  const usedBoletas = new Set();

  data.forEach((row, index) => {
    const rowNum = index + 1;
    rowErrors[rowNum] = [];

    if (!row.carne || typeof row.carne !== 'number') {
      rowErrors[rowNum].push('El carné debe ser un número válido');
    }
    if (!row.apellido_estudiante?.trim()) {
      rowErrors[rowNum].push('El apellido del estudiante es requerido');
    }
    if (!row.nombre_estudiante?.trim()) {
      rowErrors[rowNum].push('El nombre del estudiante es requerido');
    }
    if (!row.mes_solvencia?.trim()) {
      rowErrors[rowNum].push('El mes de solvencia es requerido');
    } else if (!validMonths.includes(row.mes_solvencia)) {
      rowErrors[rowNum].push(`Mes de solvencia inválido. Debe ser uno de: ${validMonths.join(', ')}`);
    }
    if (!row.fecha_pago || !/^\d{2}\/\d{2}\/\d{4}$/.test(row.fecha_pago)) {
      rowErrors[rowNum].push('La fecha de pago debe estar en formato DD/MM/YYYY');
    } else {
      const [day, month, year] = row.fecha_pago.split('/');
      const date = new Date(year, month - 1, day);
      if (isNaN(date.getTime())) {
        rowErrors[rowNum].push('La fecha de pago no es válida');
      }
    }
    if (!row.monto || typeof row.monto !== 'number' || row.monto <= 0) {
      rowErrors[rowNum].push('El monto debe ser un número positivo');
    } else if (!Number.isInteger(row.monto * 100) || row.monto > 99999999.99) {
      rowErrors[rowNum].push('El monto debe tener máximo 2 decimales y no exceder 99,999,999.99');
    }
    if (!row.no_boleta) {
      rowErrors[rowNum].push('El número de boleta es requerido');
    } else if (!Number.isInteger(Number(row.no_boleta))) {
      rowErrors[rowNum].push('El número de boleta debe ser un número entero');
    } else if (usedBoletas.has(row.no_boleta)) {
      rowErrors[rowNum].push(`El número de boleta ${row.no_boleta} está duplicado en el archivo`);
    } else {
      usedBoletas.add(row.no_boleta);
    }
    if (!row.metodo_pago?.trim()) {
      rowErrors[rowNum].push('El método de pago es requerido');
    } else if (!validPaymentMethods.includes(row.metodo_pago)) {
      rowErrors[rowNum].push(`Método de pago inválido. Debe ser uno de: ${validPaymentMethods.join(', ')}`);
    }
  });

  const errors = Object.entries(rowErrors)
    .filter(([_, rowErrs]) => rowErrs.length > 0)
    .map(([rowNum, rowErrs]) => `Fila ${rowNum}: ${rowErrs.join('. ')}`);

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : null
  };
};

module.exports = {
  validateExcelContent
};
