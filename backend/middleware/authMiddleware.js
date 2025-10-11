const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    console.log('Auth Header:', authHeader); // Debug log

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token no proporcionado'
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded); // Debug log

    // Set the user object in the request
    req.user = {
      id: decoded.id,
      rol: decoded.rol || decoded.role, // Check both possible fields
      type: decoded.type
    };

    console.log('User set in request:', req.user); // Debug log

    if (!req.user.rol) {
      return res.status(403).json({
        success: false,
        error: 'Token no contiene información del rol'
      });
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
};

module.exports = { verifyToken };
