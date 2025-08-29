# Configuración de Email Service

## 🚀 Desarrollo

En modo desarrollo, el servicio de email:
1. **Intenta crear una cuenta temporal** de Ethereal Email para testing
2. **Si falla**, usa un fallback que muestra el contenido del email en los logs
3. **Siempre muestra** el token y URL de reset en la consola para pruebas

### Logs en desarrollo:
```
=== EMAIL DE DESARROLLO ===
Para: usuario@ejemplo.com
Asunto: Recuperación de Contraseña - Portal Vanguardia Juvenil
URL de reset: http://localhost:5173/reset-password?token=abc123...
========================
```

## 🏭 Producción

Para configurar emails en producción, agregar estas variables de entorno:

### Gmail (Recomendado)
```env
NODE_ENV=production
EMAIL_PROVIDER=gmail
EMAIL_USER=tu_email@gmail.com
EMAIL_APP_PASSWORD=tu_app_password_de_gmail
EMAIL_FROM="Portal Vanguardia Juvenil" <noreply@tudominio.com>
FRONTEND_URL=https://tudominio.com
```

### SendGrid
```env
NODE_ENV=production
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM="Portal Vanguardia Juvenil" <noreply@tudominio.com>
FRONTEND_URL=https://tudominio.com
```

### SMTP Personalizado
```env
NODE_ENV=production
EMAIL_PROVIDER=custom
SMTP_HOST=smtp.tuproveedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu_usuario
SMTP_PASSWORD=tu_password
EMAIL_FROM="Portal Vanguardia Juvenil" <noreply@tudominio.com>
FRONTEND_URL=https://tudominio.com
```

## 📧 Configuración de Gmail

### Paso 1: Habilitar autenticación de 2 factores
1. Ve a [myaccount.google.com](https://myaccount.google.com)
2. Seguridad → Verificación en 2 pasos
3. Activa la verificación en 2 pasos

### Paso 2: Crear contraseña de aplicación
1. Ve a [myaccount.google.com](https://myaccount.google.com)
2. Seguridad → Contraseñas de aplicaciones
3. Selecciona "Correo" y "Otros"
4. Genera la contraseña
5. Usa esta contraseña en `EMAIL_APP_PASSWORD`

## 🔍 Testing

### Desarrollo
```bash
# El servicio siempre funciona en desarrollo
curl -X POST http://localhost:3000/api/password/request-reset \
  -H "Content-Type: application/json" \
  -d '{"email": "test@ejemplo.com"}'
```

### Producción
```bash
# Verificar que las variables de entorno estén configuradas
echo $EMAIL_PROVIDER
echo $EMAIL_USER

# Probar el endpoint
curl -X POST https://tudominio.com/api/password/request-reset \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario_real@ejemplo.com"}'
```

## 🛠️ Troubleshooting

### Error: "Missing credentials for PLAIN"
- **Causa**: Credenciales de SMTP incorrectas o faltantes
- **Solución**: Verificar las variables de entorno de email

### Error: "Invalid login"
- **Causa**: Contraseña incorrecta o autenticación de 2 factores no configurada
- **Solución**: Usar contraseña de aplicación para Gmail

### Email no llega
- **Verificar**: Carpeta de spam
- **Verificar**: Variables `EMAIL_FROM` y `FRONTEND_URL`
- **Testing**: Usar un servicio como [MailHog](https://github.com/mailhog/MailHog) localmente

## 📋 Variables de Entorno Completas

```env
# Ambiente
NODE_ENV=production

# Email Configuration
EMAIL_PROVIDER=gmail
EMAIL_USER=noreply@tudominio.com
EMAIL_APP_PASSWORD=contraseña_de_aplicacion_gmail
EMAIL_FROM="Portal Vanguardia Juvenil" <noreply@tudominio.com>

# Frontend
FRONTEND_URL=https://tudominio.com

# Database (ya configuradas)
DB_HOST=db
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=admin123.
DB_NAME=portalvj_db

# JWT
JWT_SECRET=tu_jwt_secret_super_seguro
```

## ✅ Funcionalidades

- ✅ **Desarrollo**: Funciona sin configuración externa
- ✅ **Producción**: Soporte para Gmail, SendGrid, SMTP personalizado
- ✅ **Fallback**: Si falla el email, muestra el token en logs (solo desarrollo)
- ✅ **Templates**: HTML y texto plano incluidos
- ✅ **Seguridad**: Links con expiración de 1 hora
- ✅ **Logging**: Información detallada para debugging
