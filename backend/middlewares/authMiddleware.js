const jwt = require('jsonwebtoken');
const db = require('../database_cn');
const { JWT_SECRET } = require('../config/config');

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.rol }; // Attach user details to the request
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token.' });
  }
};

const isAdmin = async (req, res, next) => {
    try {
        if (req.user.role === 'Administrativo') {
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

const isTeacher = (req, res, next) => {
    if (req.user.rol === 'Maestro') {
      next();
    } else {
      res.status(403).json({ error: 'Acceso denegado. Se requiere rol Maestro' });
    }
  };

module.exports = {
    verifyToken,
    isAdmin,
    isSup,
    isTeacher
};