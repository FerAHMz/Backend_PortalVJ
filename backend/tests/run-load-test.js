#!/usr/bin/env node
const { execSync } = require('child_process');

console.log(' Iniciando pruebas de carga para Backend PortalVJ\n');

// Verificar que Artillery esté instalado
try {
  execSync('artillery version', { stdio: 'ignore' });
} catch {
  console.log(' Artillery no está instalado. Instalando...');
  execSync('npm install -g artillery', { stdio: 'inherit' });
}

console.log('1️ Verificando que el servidor esté ejecutándose...');
try {
  execSync('curl -f http://localhost:3000/health', { stdio: 'ignore' });
  console.log(' Servidor está ejecutándose\n');
} catch {
  console.log(' Servidor no responde. Asegúrate de que esté ejecutándose:');
  console.log(' docker compose up -d\n');
  process.exit(1);
}

console.log('2️   Ejecutando pruebas de carga...\n');
console.log('    Fases de prueba:');
console.log('   - Calentamiento: 5 usuarios/seg por 1 minuto');
console.log('   - Carga normal: 20 usuarios/seg por 3 minutos');
console.log('   - Prueba de estrés: 50 usuarios/seg por 2 minutos\n');

try {
  execSync('artillery run load-test.yml', { stdio: 'inherit' });
  console.log('\n Pruebas completadas exitosamente!');
} catch (error) {
  console.log('\n Error durante las pruebas:', error.message);
  process.exit(1);
}
