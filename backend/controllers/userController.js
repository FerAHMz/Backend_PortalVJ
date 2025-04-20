const db = require('../database_cn');
const bcrypt = require('bcrypt');

const getAllUsers = async (req, res) => {
    let client;
    try {
        client = await db.getPool().connect();
        const result = await client.query(`
            SELECT DISTINCT ON (id, email) 
                id, 
                nombre, 
                apellido, 
                email, 
                telefono, 
                'SUP' as rol,
                1 as rol_order
            FROM SuperUsuarios
            UNION ALL
            SELECT DISTINCT ON (id, email)
                id, 
                nombre, 
                apellido, 
                email, 
                telefono, 
                'Administrativo' as rol,
                2 as rol_order
            FROM Administrativos
            UNION ALL
            SELECT DISTINCT ON (id, email)
                id, 
                nombre, 
                apellido, 
                email, 
                telefono, 
                'Maestro' as rol,
                3 as rol_order
            FROM Maestros
            UNION ALL
            SELECT DISTINCT ON (id, email)
                id, 
                nombre, 
                apellido, 
                email, 
                telefono, 
                'Padre' as rol,
                4 as rol_order
            FROM Padres
            ORDER BY rol_order, nombre
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    } finally {
        if (client) client.release();
    }
};

const createUser = async (req, res) => {
    const { nombre, apellido, email, telefono, password, rol } = req.body;
    let client;
    try {
        if (!nombre || !apellido || !email || !telefono || !password || !rol) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Formato de email inválido' });
        }

        client = await db.getPool().connect();

        // Verificar si el email ya existe
        const emailCheck = await client.query(`
            SELECT email FROM SuperUsuarios WHERE email = $1
            UNION ALL
            SELECT email FROM Administrativos WHERE email = $1
            UNION ALL
            SELECT email FROM Maestros WHERE email = $1
            UNION ALL
            SELECT email FROM Padres WHERE email = $1
        `, [email.toLowerCase()]);

        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        // Obtener ID del rol desde la tabla Usuarios
        const rolResult = await client.query(
            `SELECT id FROM Usuarios WHERE rol = $1 LIMIT 1`,
            [rol]
        );

        if (rolResult.rowCount === 0) {
            return res.status(400).json({ error: `Rol "${rol}" no existe en la tabla Usuarios` });
        }

        const rolId = rolResult.rows[0].id;
        const hashedPassword = await bcrypt.hash(password, 10);
        let result;

        switch (rol) {
            case 'SUP':
                result = await client.query(
                    `INSERT INTO SuperUsuarios (nombre, apellido, email, telefono, password, rol)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING id, nombre, apellido, email, telefono, $6 AS rol`,
                    [nombre, apellido, email, telefono, hashedPassword, rolId]
                );
                break;

            case 'Administrativo':
                result = await client.query(
                    `INSERT INTO Administrativos (nombre, apellido, email, telefono, password, rol)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING id, nombre, apellido, email, telefono, $6 AS rol`,
                    [nombre, apellido, email, telefono, hashedPassword, rolId]
                );
                break;

            case 'Maestro':
                result = await client.query(
                    `INSERT INTO Maestros (nombre, apellido, email, telefono, password, rol)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING id, nombre, apellido, email, telefono, $6 AS rol`,
                    [nombre, apellido, email, telefono, hashedPassword, rolId]
                );
                break;

            case 'Padre':
                result = await client.query(
                    `INSERT INTO Padres (nombre, apellido, email, telefono, password, rol)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING id, nombre, apellido, email, telefono, $6 AS rol`,
                    [nombre, apellido, email, telefono, hashedPassword, rolId]
                );
                break;

            default:
                return res.status(400).json({ error: 'Rol de usuario no válido' });
        }

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating user:', error.message, error.stack);
        res.status(500).json({ error: 'Error al crear usuario' });
    } finally {
        if (client) client.release();
    }
};


const updateUser = async (req, res) => {
    const { id } = req.params;
    const { nombre, apellido, email, telefono, rol } = req.body;
    let client;
    try {
        client = await db.getPool().connect();
        let result;

        switch (rol) {
            case 'SUP':
                result = await client.query(
                    `UPDATE SuperUsuarios 
                     SET nombre = $1, apellido = $2, email = $3, telefono = $4
                     WHERE id = $5 RETURNING id, nombre, apellido, email, telefono, rol`,
                    [nombre, apellido, email, telefono, id]
                );
                break;

            case 'Administrativo':
                result = await client.query(
                    `UPDATE Administrativos 
                     SET nombre = $1, apellido = $2, email = $3, telefono = $4
                     WHERE id = $5 RETURNING id, nombre, apellido, email, telefono, rol`,
                    [nombre, apellido, email, telefono, id]
                );
                break;

            case 'Maestro':
                result = await client.query(
                    `UPDATE Maestros 
                     SET nombre = $1, apellido = $2, email = $3, telefono = $4
                     WHERE id = $5 RETURNING id, nombre, apellido, email, telefono, rol`,
                    [nombre, apellido, email, telefono, id]
                );
                break;

            case 'Padre':
                result = await client.query(
                    `UPDATE Padres 
                     SET nombre = $1, apellido = $2, email = $3, telefono = $4
                     WHERE id = $5 RETURNING id, nombre, apellido, email, telefono, rol`,
                    [nombre, apellido, email, telefono, id]
                );
                break;

            default:
                return res.status(400).json({ error: 'Rol de usuario no válido' });
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Error al actualizar usuario' });
    } finally {
        if (client) client.release();
    }
};

const deleteUser = async (req, res) => {
    const { id } = req.params;
    const { rol } = req.body;
    let client;
    try {
        client = await db.getPool().connect();
        let result;

        switch (rol) {
            case 'SUP':
                result = await client.query(
                    `DELETE FROM SuperUsuarios WHERE id = $1 RETURNING id`,
                    [id]
                );
                break;

            case 'Administrativo':
                result = await client.query(
                    `DELETE FROM Administrativos WHERE id = $1 RETURNING id`,
                    [id]
                );
                break;

            case 'Maestro':
                result = await client.query(
                    `DELETE FROM Maestros WHERE id = $1 RETURNING id`,
                    [id]
                );
                break;

            case 'Padre':
                result = await client.query(
                    `DELETE FROM Padres WHERE id = $1 RETURNING id`,
                    [id]
                );
                break;

            default:
                return res.status(400).json({ error: 'Rol de usuario no válido' });
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json({ message: 'Usuario eliminado exitosamente' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Error al eliminar usuario' });
    } finally {
        if (client) client.release();
    }
};

module.exports = {
    getAllUsers,
    createUser,
    updateUser,
    deleteUser
};