const nodemailer = require('nodemailer');

// Configuración del transportador de email
const createTransporter = async () => {
  // Verificar si estamos en producción
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Configuración para producción
    if (process.env.EMAIL_PROVIDER === 'gmail') {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_APP_PASSWORD
        }
      });
    } else if (process.env.EMAIL_PROVIDER === 'sendgrid') {
      return nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });
    } else if (process.env.EMAIL_PROVIDER === 'custom') {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
    } else {
      throw new Error('EMAIL_PROVIDER no configurado para producción. Usar: gmail, sendgrid, o custom');
    }
  } else {
    // Para desarrollo - intentar crear cuenta temporal de Ethereal Email
    try {
      console.log('Intentando crear cuenta de prueba de Ethereal Email...');
      const testAccount = await nodemailer.createTestAccount();
      console.log('Cuenta de prueba creada:', testAccount.user);
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    } catch (error) {
      console.warn('No se pudo crear cuenta de Ethereal Email:', error.message);
      // En desarrollo, devolver null para usar el fallback
      return null;
    }
  }
};

// Función para enviar email de reset de contraseña
const sendPasswordResetEmail = async (email, resetToken, userName) => {
  try {
    const transporter = await createTransporter();

    // URL del frontend para reset de contraseña
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Portal Vanguardia Juvenil" <noreply@portalvj.com>',
      to: email,
      subject: 'Recuperación de Contraseña - Portal Vanguardia Juvenil',
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
                        <h1>Portal Vanguardia Juvenil</h1>
                    </div>
                    
                    <div style="padding: 30px; background-color: #f8f9fa;">
                        <h2 style="color: #333;">Recuperación de Contraseña</h2>
                        
                        <p style="color: #666; font-size: 16px;">
                            Hola ${userName || 'Usuario'},
                        </p>
                        
                        <p style="color: #666; font-size: 16px;">
                            Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en el Portal Vanguardia Juvenil.
                        </p>
                        
                        <p style="color: #666; font-size: 16px;">
                            Para restablecer tu contraseña, haz clic en el siguiente botón:
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" 
                               style="background-color: #007bff; color: white; padding: 15px 30px; 
                                      text-decoration: none; border-radius: 5px; font-weight: bold;
                                      display: inline-block;">
                                Cambiar Contraseña
                            </a>
                        </div>
                        
                        <p style="color: #666; font-size: 14px;">
                            Si no puedes hacer clic en el botón, copia y pega el siguiente enlace en tu navegador:
                        </p>
                        
                        <p style="color: #007bff; font-size: 14px; word-break: break-all;">
                            ${resetUrl}
                        </p>
                        
                        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; 
                                    border-radius: 5px; padding: 15px; margin: 20px 0;">
                            <p style="color: #856404; margin: 0; font-size: 14px;">
                                <strong>Importante:</strong> Este enlace expirará en 1 hora por motivos de seguridad.
                            </p>
                        </div>
                        
                        <p style="color: #666; font-size: 14px;">
                            Si no solicitaste este cambio de contraseña, puedes ignorar este email de forma segura. 
                            Tu contraseña no será cambiada.
                        </p>
                        
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        
                        <p style="color: #999; font-size: 12px; text-align: center;">
                            Este es un email automático, por favor no respondas a este mensaje.
                            <br>
                            © 2025 Portal Vanguardia Juvenil
                        </p>
                    </div>
                </div>
            `,
      text: `
                Portal Vanguardia Juvenil - Recuperación de Contraseña
                
                Hola ${userName || 'Usuario'},
                
                Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.
                
                Para restablecer tu contraseña, visita el siguiente enlace:
                ${resetUrl}
                
                Este enlace expirará en 1 hora por motivos de seguridad.
                
                Si no solicitaste este cambio, puedes ignorar este email de forma segura.
                
                © 2025 Portal Vanguardia Juvenil
            `
    };

    // En desarrollo sin SMTP configurado, solo mostrar el contenido del email
    if (process.env.NODE_ENV !== 'production' && !transporter) {
      console.log('=== EMAIL DE DESARROLLO ===');
      console.log('Para:', email);
      console.log('Asunto:', mailOptions.subject);
      console.log('URL de reset:', resetUrl);
      console.log('========================');

      return {
        success: true,
        messageId: 'dev-' + Date.now(),
        resetUrl: resetUrl,
        developmentMode: true
      };
    }

    const info = await transporter.sendMail(mailOptions);

    console.log('Email enviado:', info.messageId);

    if (process.env.NODE_ENV !== 'production') {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: process.env.NODE_ENV !== 'production' ? nodemailer.getTestMessageUrl(info) : null
    };

  } catch (error) {
    console.error('Error enviando email:', error);

    // En desarrollo, si falla el email, continuar con el proceso
    if (process.env.NODE_ENV !== 'production') {
      console.log('=== EMAIL FALLBACK (DESARROLLO) ===');
      console.log('Para:', email);
      console.log('Token de reset:', resetToken);
      console.log('URL de reset:', `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`);
      console.log('===============================');

      return {
        success: true,
        messageId: 'fallback-' + Date.now(),
        resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`,
        developmentMode: true,
        emailFallback: true
      };
    }

    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail
};
