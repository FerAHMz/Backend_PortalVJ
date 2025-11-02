/**
 * Script para limpieza automática de tokens expirados
 * Ejecutar como cron job o tarea programada
 */

const { autoCleanupTokens } = require('./controllers/passwordResetController');

const runCleanup = async () => {
  try {
    console.log('🧹 Iniciando limpieza de tokens expirados...');
    
    const tokensRemoved = await autoCleanupTokens();
    
    console.log(`✅ Limpieza completada. ${tokensRemoved} tokens eliminados.`);
    
    // Programar siguiente limpieza en 1 hora
    setTimeout(runCleanup, 60 * 60 * 1000); // 1 hora
    
  } catch (error) {
    console.error('❌ Error en limpieza automática:', error);
    
    // Reintentar en 10 minutos si hay error
    setTimeout(runCleanup, 10 * 60 * 1000); // 10 minutos
  }
};

// Solo ejecutar si este archivo es llamado directamente
if (require.main === module) {
  console.log('🚀 Iniciando servicio de limpieza automática...');
  runCleanup();
}

module.exports = { runCleanup };
