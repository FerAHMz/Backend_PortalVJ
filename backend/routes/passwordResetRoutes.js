const express = require('express');
const router = express.Router();
const {
  generateResetToken,
  validateResetToken,
  resetPassword,
  cleanupExpiredTokens
} = require('../controllers/passwordResetController');

// Generar token de reset (público)
router.post('/request-reset', generateResetToken);

// Validar token (público)
router.get('/validate-token/:token', validateResetToken);

// Resetear contraseña (público) - ruta que espera el frontend
router.post('/reset', resetPassword);

// Limpiar tokens expirados (endpoint administrativo)
router.delete('/cleanup-tokens', cleanupExpiredTokens);

module.exports = router;
