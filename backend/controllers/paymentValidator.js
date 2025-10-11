const mesesValidos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const validatePaymentData = (data) => {
  const errors = [];
  const requiredFields = [
    'nombre_padre', 'apellido_padre', 'carnet_estudiante', 'mes_solvencia',
    'fecha_pago', 'no_boleta', 'id_metodo_pago', 'monto'
  ];

  // Validar campos requeridos
  requiredFields.forEach(field => {
    if (!data[field] && data[field] !== 0) {
      errors.push(`El campo ${field} es requerido`);
    }
  });

  // Validar mes de solvencia
  if (data.mes_solvencia && !mesesValidos.includes(data.mes_solvencia)) {
    errors.push('Mes de solvencia no válido. Use: ' + mesesValidos.join(', '));
  }

  // Validar monto positivo
  if (data.monto && (isNaN(data.monto) || parseFloat(data.monto) <= 0)) {
    errors.push('El monto debe ser un número positivo');
  }

  // Validar fecha
  if (data.fecha_pago) {
    const date = new Date(data.fecha_pago);
    if (isNaN(date.getTime())) {
      errors.push('Fecha de pago no válida');
    } else if (date > new Date()) {
      errors.push('La fecha de pago no puede ser futura');
    }
  }

  // Validar formato de número de boleta
  if (data.no_boleta && !/^[A-Za-z0-9-]+$/.test(data.no_boleta)) {
    errors.push('Número de boleta solo puede contener letras, números y guiones');
  }

  return errors;
};

module.exports = { validatePaymentData };
