const db = require('../database_cn');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../services/emailService');

// Generar token de reset de contraseña
const generateResetToken = async (req, res) => {
    const { email } = req.body;
    let client;

    try {
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'El email es requerido'
            });
        }

        // Validación básica de formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Formato de email inválido'
            });
        }

        client = await db.getPool().connect();

        // Buscar el usuario en todas las tablas
        const userQuery = `
            SELECT 'SUP' as rol, id, email, nombre, apellido FROM SuperUsuarios WHERE email = $1 AND activo = true
            UNION ALL
            SELECT 'Administrativo' as rol, id, email, nombre, apellido FROM Administrativos WHERE email = $1 AND activo = true
            UNION ALL
            SELECT 'Maestro' as rol, id, email, nombre, apellido FROM Maestros WHERE email = $1 AND activo = true
            UNION ALL
            SELECT 'Padre' as rol, id, email, nombre, apellido FROM Padres WHERE email = $1 AND activo = true
            UNION ALL
            SELECT 'Director' as rol, id, email, nombre, apellido FROM Directores WHERE email = $1 AND activo = true
        `;

        const userResult = await client.query(userQuery, [email.toLowerCase()]);

        if (userResult.rows.length === 0) {
            // Por seguridad, devolvemos success incluso si el email no existe
            return res.json({
                success: true,
                message: 'Si el email existe en nuestro sistema, recibirás las instrucciones para resetear tu contraseña.'
            });
        }

        const user = userResult.rows[0];

        // Generar token único
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

        // Verificar si ya existe un token de reset para este usuario
        const existingToken = await client.query(
            'SELECT id FROM password_reset_tokens WHERE user_id = $1 AND user_role = $2',
            [user.id, user.rol]
        );

        if (existingToken.rows.length > 0) {
            // Actualizar token existente
            await client.query(
                'UPDATE password_reset_tokens SET token = $1, expires_at = $2, used = false, created_at = CURRENT_TIMESTAMP WHERE user_id = $3 AND user_role = $4',
                [resetToken, resetTokenExpiry, user.id, user.rol]
            );
        } else {
            // Crear nuevo token
            await client.query(
                'INSERT INTO password_reset_tokens (user_id, user_role, token, expires_at) VALUES ($1, $2, $3, $4)',
                [user.id, user.rol, resetToken, resetTokenExpiry]
            );
        }

        // Enviar email con el token
        try {
            const userName = `${user.nombre} ${user.apellido}`;
            const emailResult = await sendPasswordResetEmail(email, resetToken, userName);
            
            console.log(`Reset token para ${email}: ${resetToken}`);
            console.log(`Email enviado exitosamente:`, emailResult.messageId);
            
            if (emailResult.previewUrl) {
                console.log(`Preview URL (desarrollo): ${emailResult.previewUrl}`);
            }
            
            res.json({
                success: true,
                message: 'Si el email existe en nuestro sistema, recibirás las instrucciones para resetear tu contraseña.',
                // Solo para desarrollo - remover en producción
                ...(process.env.NODE_ENV !== 'production' && {
                    developmentToken: resetToken,
                    previewUrl: emailResult.previewUrl
                })
            });
            
        } catch (emailError) {
            console.error('Error enviando email:', emailError);
            
            // Aunque falle el email, no revelamos información sobre la existencia del usuario
            res.json({
                success: true,
                message: 'Si el email existe en nuestro sistema, recibirás las instrucciones para resetear tu contraseña.',
                // En caso de error, mostrar el token solo en desarrollo
                ...(process.env.NODE_ENV !== 'production' && {
                    developmentToken: resetToken,
                    emailError: 'Error enviando email - usando modo desarrollo'
                })
            });
        }

    } catch (error) {
        console.error('Error generating reset token:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    } finally {
        if (client) client.release();
    }
};

// Validar token de reset
const validateResetToken = async (req, res) => {
    const { token } = req.params;
    let client;

    try {
        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token es requerido'
            });
        }

        client = await db.getPool().connect();

        const tokenResult = await client.query(
            'SELECT user_id, user_role, expires_at, used FROM password_reset_tokens WHERE token = $1',
            [token]
        );

        if (tokenResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Token inválido'
            });
        }

        const tokenData = tokenResult.rows[0];

        if (tokenData.used) {
            return res.status(400).json({
                success: false,
                message: 'El token ya ha sido utilizado'
            });
        }

        if (new Date() > new Date(tokenData.expires_at)) {
            return res.status(400).json({
                success: false,
                message: 'El token ha expirado'
            });
        }

        res.json({
            success: true,
            message: 'Token válido'
        });

    } catch (error) {
        console.error('Error validating reset token:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    } finally {
        if (client) client.release();
    }
};

// Resetear contraseña
const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
    let client;

    try {
        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token y nueva contraseña son requeridos'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 8 caracteres'
            });
        }

        // Validación adicional de contraseña
        if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe contener al menos una letra y un número'
            });
        }

        client = await db.getPool().connect();
        await client.query('BEGIN');

        // Verificar token
        const tokenResult = await client.query(
            'SELECT user_id, user_role, expires_at, used FROM password_reset_tokens WHERE token = $1',
            [token]
        );

        if (tokenResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Token inválido'
            });
        }

        const tokenData = tokenResult.rows[0];

        if (tokenData.used) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'El token ya ha sido utilizado'
            });
        }

        if (new Date() > new Date(tokenData.expires_at)) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'El token ha expirado'
            });
        }

        // Hash de la nueva contraseña usando pgcrypto para compatibilidad
        // Usar el mismo método que el sistema de login
        const hashQuery = "SELECT crypt($1, gen_salt('bf')) as hashed_password";
        const hashResult = await client.query(hashQuery, [newPassword]);
        const hashedPassword = hashResult.rows[0].hashed_password;

        // Actualizar contraseña según el rol del usuario
        const updateQueries = {
            'SUP': 'UPDATE SuperUsuarios SET password = $1 WHERE id = $2',
            'Administrativo': 'UPDATE Administrativos SET password = $1 WHERE id = $2',
            'Maestro': 'UPDATE Maestros SET password = $1 WHERE id = $2',
            'Padre': 'UPDATE Padres SET password = $1 WHERE id = $2',
            'Director': 'UPDATE Directores SET password = $1 WHERE id = $2'
        };

        const updateQuery = updateQueries[tokenData.user_role];
        if (!updateQuery) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Rol de usuario inválido'
            });
        }

        await client.query(updateQuery, [hashedPassword, tokenData.user_id]);

        // Marcar token como usado
        await client.query(
            'UPDATE password_reset_tokens SET used = true WHERE token = $1',
            [token]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error resetting password:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    } finally {
        if (client) client.release();
    }
};

// Función para limpiar tokens expirados
const cleanupExpiredTokens = async (req, res) => {
    let client;

    try {
        client = await db.getPool().connect();

        const result = await client.query(
            'DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP OR used = true'
        );

        res.json({
            success: true,
            message: `${result.rowCount} tokens eliminados`,
            tokensRemoved: result.rowCount
        });

    } catch (error) {
        console.error('Error cleaning up tokens:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    } finally {
        if (client) client.release();
    }
};

// Función automática para limpiar tokens (sin respuesta HTTP)
const autoCleanupTokens = async () => {
    let client;

    try {
        client = await db.getPool().connect();

        const result = await client.query(
            'DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP OR used = true'
        );

        return result.rowCount;

    } catch (error) {
        console.error('Error in auto cleanup tokens:', error);
        throw error;
    } finally {
        if (client) client.release();
    }
};

module.exports = {
    generateResetToken,
    validateResetToken,
    resetPassword,
    cleanupExpiredTokens,
    autoCleanupTokens
};
