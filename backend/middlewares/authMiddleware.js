const jwt = require('jsonwebtoken');
const db = require('../database_cn');
const { JWT_SECRET } = require('../config/config');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

const isAdmin = async (req, res, next) => {
    try {
        if (req.user.rol === 'Administrativo') {
            next();
        } else {
            res.status(403).json({ error: 'Acceso denegado. Se requiere rol Administrativo' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al verificar permisos' });
    }
};

const isSup = async (req, res, next) => {
    try {
       if (req.user.rol === 'SUP') {
            next();
        } else {
            res.status(403).json({ error: 'Acceso denegado. Se requiere rol Super Usuario' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al verificar permisos' });
    }
}

module.exports = {
    verifyToken,
    isAdmin,
    isSup
};