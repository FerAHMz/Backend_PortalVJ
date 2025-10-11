const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function setupTestUsers() {
  console.log('Configurando usuarios de prueba para load testing...');

  const testUsers = [
    {
      email: 'test@example.com',
      password: 'testpassword',
      name: 'Test User',
      role: 'student'
    },
    {
      email: 'admin@example.com',
      password: 'adminpassword',
      name: 'Admin User',
      role: 'admin'
    },
    {
      email: 'parent@example.com',
      password: 'parentpassword',
      name: 'Parent User',
      role: 'parent'
    }
  ];

  for (const user of testUsers) {
    try {
      // Intentar crear el usuario
      const _response = await axios.post(`${BASE_URL}/api/users/register`, user);
      console.log(`✓ Usuario creado: ${user.email}`);
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log(`- Usuario ya existe: ${user.email}`);
      } else {
        console.log(`✗ Error creando usuario ${user.email}:`, error.message);
      }
    }
  }

  console.log('\nConfiguración completada. Puedes ejecutar las pruebas con:');
  console.log('artillery run load-test.yml');
}

// Verificar que el servidor esté ejecutándose
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/health`);
    console.log('✓ Servidor está ejecutándose');
    return true;
  } catch {
    console.log('✗ Servidor no está ejecutándose. Ejecuta: docker compose up -d');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await setupTestUsers();
  }
}

main().catch(console.error);
