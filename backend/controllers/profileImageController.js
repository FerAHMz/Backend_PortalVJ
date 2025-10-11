const multer = require('multer');
const cloudflareR2Service = require('../services/cloudflareR2Service');
const db = require('../database_cn');

// Configuración de multer para manejar archivos en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    console.log('File filter - MIME type:', file.mimetype);

    // Permitir tipos de imagen comunes
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG, GIF, WebP)'), false);
    }
  }
});

/**
 * Obtener la tabla correcta basada en el rol del usuario
 */
function getUserTable(userRole) {
  const tableMap = {
    'SUP': 'SuperUsuarios',
    'Director': 'Directores',
    'Maestro': 'Maestros',
    'Padre': 'Padres',
    'Administrativo': 'Administrativos'
  };

  return tableMap[userRole];
}

/**
 * Subir imagen de perfil
 */
async function uploadProfileImage(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.rol || req.user.role;
    const file = req.file;

    console.log('Upload profile image request:', {
      userId,
      userRole,
      hasFile: !!file,
      fileSize: file?.size,
      mimeType: file?.mimetype
    });

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ningún archivo'
      });
    }

    // Validar que el tipo de archivo sea una imagen
    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: 'El archivo debe ser una imagen'
      });
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `profile-${userId}-${timestamp}.${fileExtension}`;

    console.log('Uploading file to Cloudflare R2:', {
      fileName,
      fileSize: file.buffer.length,
      mimeType: file.mimetype
    });

    // Subir a Cloudflare R2 usando el servicio existente
    const uploadResult = await cloudflareR2Service.uploadFile(
      file.buffer,
      fileName,
      file.mimetype,
      'profile-images'
    );

    console.log('Cloudflare upload result:', uploadResult);

    if (uploadResult.success) {
      res.json({
        success: true,
        imageUrl: uploadResult.fileUrl,
        fileName: uploadResult.fileName,
        originalName: uploadResult.originalName,
        message: 'Imagen subida correctamente'
      });
    } else {
      throw new Error('Error al subir archivo a Cloudflare R2');
    }
  } catch (error) {
    console.error('Error uploading profile image:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

/**
 * Actualizar URL de imagen en el perfil del usuario
 */
async function updateProfileImageUrl(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.rol || req.user.role;
    const { profileImageUrl } = req.body;

    console.log('Update profile image URL request:', {
      userId,
      userRole,
      profileImageUrl
    });

    if (!profileImageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere la URL de la imagen'
      });
    }

    // Obtener la tabla correcta basada en el rol
    const userTable = getUserTable(userRole);
    if (!userTable) {
      return res.status(400).json({
        success: false,
        message: 'Rol de usuario no válido'
      });
    }

    // Verificar que el usuario existe y obtener la imagen actual
    const getUserQuery = `SELECT id, profile_image_url FROM ${userTable} WHERE id = $1`;
    const { rows: userRows } = await db.getPool().query(getUserQuery, [userId]);

    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const currentUser = userRows[0];

    // Si hay una imagen anterior y es diferente a la nueva, intentar eliminarla de Cloudflare
    if (currentUser.profile_image_url &&
        currentUser.profile_image_url !== profileImageUrl) {
      try {
        // Extraer el nombre del archivo de la URL
        const oldFileName = currentUser.profile_image_url.split('/').pop();
        if (oldFileName && oldFileName.startsWith('profile-images/')) {
          await cloudflareR2Service.deleteFile(oldFileName);
          console.log('Previous profile image deleted:', oldFileName);
        }
      } catch (error) {
        console.warn('Error eliminando imagen anterior:', error.message);
        // No fallar por esto, continuar con la actualización
      }
    }

    // Actualizar URL en la base de datos
    const updateQuery = `
      UPDATE ${userTable} 
      SET profile_image_url = $1 
      WHERE id = $2
      RETURNING id, profile_image_url
    `;

    const { rows: updatedRows } = await db.getPool().query(updateQuery, [profileImageUrl, userId]);

    if (updatedRows.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar la imagen de perfil'
      });
    }

    res.json({
      success: true,
      message: 'URL de imagen actualizada correctamente',
      profileImageUrl: updatedRows[0].profile_image_url
    });

  } catch (error) {
    console.error('Error updating profile image URL:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

/**
 * Eliminar imagen de perfil
 */
async function deleteProfileImage(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.rol || req.user.role;

    console.log('Delete profile image request:', {
      userId,
      userRole
    });

    // Obtener la tabla correcta basada en el rol
    const userTable = getUserTable(userRole);
    if (!userTable) {
      return res.status(400).json({
        success: false,
        message: 'Rol de usuario no válido'
      });
    }

    // Verificar que el usuario existe y obtener la imagen actual
    const getUserQuery = `SELECT id, profile_image_url FROM ${userTable} WHERE id = $1`;
    const { rows: userRows } = await db.getPool().query(getUserQuery, [userId]);

    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const currentUser = userRows[0];

    // Eliminar imagen de Cloudflare si existe
    if (currentUser.profile_image_url) {
      try {
        // Extraer el nombre del archivo de la URL
        const fileName = currentUser.profile_image_url.split('/').pop();
        if (fileName && fileName.includes('profile-')) {
          await cloudflareR2Service.deleteFile(`profile-images/${fileName}`);
          console.log('Profile image deleted from Cloudflare:', fileName);
        }
      } catch (error) {
        console.warn('Error eliminando imagen de Cloudflare:', error.message);
        // No fallar por esto, continuar con la actualización en BD
      }
    }

    // Remover URL de la base de datos
    const updateQuery = `
      UPDATE ${userTable} 
      SET profile_image_url = NULL 
      WHERE id = $1
      RETURNING id
    `;

    const { rows: updatedRows } = await db.getPool().query(updateQuery, [userId]);

    if (updatedRows.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar la imagen de perfil'
      });
    }

    res.json({
      success: true,
      message: 'Imagen de perfil eliminada correctamente'
    });

  } catch (error) {
    console.error('Error deleting profile image:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

/**
 * Obtener información del perfil incluyendo la imagen
 */
async function getProfileWithImage(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.rol || req.user.role;

    console.log('Get profile with image request:', {
      userId,
      userRole
    });

    // Obtener la tabla correcta basada en el rol
    const userTable = getUserTable(userRole);
    if (!userTable) {
      return res.status(400).json({
        success: false,
        message: 'Rol de usuario no válido'
      });
    }

    // Primero verificar si la columna profile_image_url existe
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1 
      AND column_name = 'profile_image_url'
    `;

    const { rows: columnCheck } = await db.getPool().query(
      checkColumnQuery,
      [userTable.toLowerCase()]
    );

    const hasProfileImageColumn = columnCheck.length > 0;

    // Construir la consulta dinámicamente
    let getUserQuery;
    if (hasProfileImageColumn) {
      getUserQuery = `
        SELECT id, nombre, apellido, email, telefono, profile_image_url
        FROM ${userTable} 
        WHERE id = $1
      `;
    } else {
      getUserQuery = `
        SELECT id, nombre, apellido, email, telefono, NULL as profile_image_url
        FROM ${userTable} 
        WHERE id = $1
      `;
    }

    const { rows: userRows } = await db.getPool().query(getUserQuery, [userId]);

    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const user = userRows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        telefono: user.telefono,
        profileImageUrl: user.profile_image_url,
        rol: userRole
      },
      hasProfileImageSupport: hasProfileImageColumn,
      message: hasProfileImageColumn ?
        'Perfil obtenido con soporte de imágenes' :
        'Perfil obtenido sin soporte de imágenes (ejecutar migración de BD)'
    });

  } catch (error) {
    console.error('Error fetching user profile with image:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      details: 'Posiblemente la columna profile_image_url no existe. Ejecutar migración de BD.'
    });
  }
}

module.exports = {
  uploadProfileImage,
  updateProfileImageUrl,
  deleteProfileImage,
  getProfileWithImage,
  upload
};
