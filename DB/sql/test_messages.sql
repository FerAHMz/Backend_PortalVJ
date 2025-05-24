INSERT INTO messages (sender_id, sender_role, recipient_id, recipient_role, subject, content, created_at, read)
VALUES
  (1, 'Maestro', 2, 'Maestro', 'Bienvenida', '¡Hola! Bienvenido al sistema de mensajes.', NOW(), false),
  (2, 'Maestro', 1, 'Maestro', 'Bienvenida', '¡Gracias! Me alegra estar aquí.', NOW(), false),
  (1, 'Maestro', 3, 'Padre', 'Reunión', 'Estimado padre, le invito a una reunión el viernes.', NOW(), false),
  (3, 'Padre', 1, 'Maestro', 'Reunión', 'Gracias por la invitación, asistiré.', NOW(), false);
