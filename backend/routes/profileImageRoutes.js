const express = require('express');
const { 
  uploadProfileImage, 
  updateProfileImageUrl, 
  deleteProfileImage, 
  getProfileWithImage,
  upload 
} = require('../controllers/profileImageController');
const { verifyToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(verifyToken);

// Ruta para subir imagen de perfil
router.post('/upload-image', upload.single('profileImage'), uploadProfileImage);

// Ruta para actualizar URL de imagen en perfil
router.put('/image', updateProfileImageUrl);

// Ruta para eliminar imagen de perfil
router.delete('/image', deleteProfileImage);

// Ruta para obtener perfil con imagen
router.get('/with-image', getProfileWithImage);

module.exports = router;
