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

    this.connectWithRetry();
  }

  async connectWithRetry(retries = 5, interval = 2000) {
    for (let i = 0; i < retries; i++) {
      try {
        await this.pool.query('SELECT NOW()');
        console.log('PostgreSQL conectado');
        return;
      } catch {
        console.log(`Intento de conexión ${i + 1}/${retries} fallido. Reintentando en ${interval/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    console.error('Error PostgreSQL: No se pudo establecer la conexión después de varios intentos');
  }

  getPool() {
    return this.pool;
  }
}

module.exports = new Database();
