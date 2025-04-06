const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'db',
    database: process.env.DB_NAME || 'portalvj_db',
    password: process.env.DB_PASSWORD || 'admin123.',
    port: process.env.DB_PORT || 5432,
});

const saltRounds = 10;

async function hashPasswords() {
    try {
       const padres = await pool.query('SELECT id, password FROM padres');
       for (const padre of padres.rows) {
           const hashedPassword = await bcrypt.hash(padre.password, saltRounds);
           await pool.query('UPDATE padres SET password = $1 WHERE id = $2', [hashedPassword, padre.id]);
       }
       console.log('Padres hashed');

       const maestros = await pool.query('SELECT id, password FROM maestros');
       for (const maestro of maestros.rows) {
           const hashedPassword = await bcrypt.hash(maestro.password, saltRounds);
           await pool.query('UPDATE maestros SET password = $1 WHERE id = $2', [hashedPassword, maestro.id]);
       }
       console.log('Maestros hashed');

       const administrativos = await pool.query('SELECT id, password FROM administrativos');
       for (const admin of administrativos.rows) {
           const hashedPassword = await bcrypt.hash(admin.password, saltRounds);
           await pool.query('UPDATE administrativos SET password = $1 WHERE id = $2', [hashedPassword, admin.id]);
       }
       console.log('Administrativos hashed');
    } catch (error) {
       console.error('Error hashing passwords:', error); 
    } finally {
       await pool.end();
    }
}

hashPasswords();