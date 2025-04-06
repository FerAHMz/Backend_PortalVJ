
const { Pool } = require('pg');

class Database {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,  
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });

    // Verificar conexión al crear la instancia
    this.pool.query('SELECT NOW()')
      .then(() => console.log('PostgreSQL conectado'))
      .catch(err => console.error('Error PostgreSQL:', err));
  }

  // Método para obtener el pool 
  getPool() {
    return this.pool;
  }
}

// Exportamos una instancia de la DB
module.exports = new Database();
