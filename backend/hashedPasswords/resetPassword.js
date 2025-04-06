const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'db',
    database: process.env.DB_NAME || 'portalvj_db',
    password: process.env.DB_PASSWORD || 'admin123.',
    port: process.env.DB_PORT || 5432,
});

async function resetAllPasswords() {
    try {
        const maestros = await pool.query('SELECT id, email FROM maestros');
        for (const maestro of maestros.rows) {
            const originalPassword = `password${maestro.id}`;
            const hashedPassword = await bcrypt.hash(originalPassword, 10);
            await pool.query(
                'UPDATE maestros SET password = $1 WHERE id = $2',
                [hashedPassword, maestro.id]
            );
            console.log(`Reset password for teacher: ${maestro.email} to ${originalPassword}`);
        }

        const padres = await pool.query('SELECT id, email FROM padres');
        for (const padre of padres.rows) {
            const originalPassword = `password${padre.id}`;
            const hashedPassword = await bcrypt.hash(originalPassword, 10);
            await pool.query(
                'UPDATE padres SET password = $1 WHERE id = $2',
                [hashedPassword, padre.id]
            );
            console.log(`Reset password for parent: ${padre.email} to ${originalPassword}`);
        }

        const administrativos = await pool.query('SELECT id, email FROM administrativos');
        for (const admin of administrativos.rows) {
            const originalPassword = `password${admin.id}`;
            const hashedPassword = await bcrypt.hash(originalPassword, 10);
            await pool.query(
                'UPDATE administrativos SET password = $1 WHERE id = $2',
                [hashedPassword, admin.id]
            );
            console.log(`Reset password for admin: ${admin.email} to ${originalPassword}`);
        }

        console.log('All passwords have been reset successfully');
    } catch (error) {
        console.error('Error resetting passwords:', error);
    } finally {
        await pool.end();
    }
}

resetAllPasswords();