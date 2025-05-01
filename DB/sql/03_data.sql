INSERT INTO Usuarios (rol) VALUES 
('SUP'),
('Padre'),
('Maestro'),
('Administrativo'),
('Padre'),
('Maestro'),
('Administrativo'),
('Padre'),
('Maestro'),
('Administrativo');

INSERT INTO SuperUsuarios (rol, nombre, apellido, email, telefono, password) VALUES 
(1, 'Admin', 'Principal', 'superadmin@example.com', '0000000000', 'password1');

INSERT INTO Grados (grado) VALUES 
('Primer Grado'),
('Segundo Grado'),
('Tercer Grado'),
('Cuarto Grado'),
('Quinto Grado'),
('Sexto Grado'),
('Séptimo Grado'),
('Octavo Grado'),
('Noveno Grado'),
('Décimo Grado');

INSERT INTO Secciones (seccion) VALUES 
('A'),
('B'),
('C'),
('D'),
('E'),
('F'),
('G'),
('H'),
('I'),
('J');

INSERT INTO Grado_seccion (id_grado, id_seccion) VALUES 
(1, 1),
(2, 2),
(3, 3),
(4, 4),
(5, 5),
(6, 6),
(7, 7),
(8, 8),
(9, 9),
(10, 10);

INSERT INTO Estudiantes (carnet, nombre, apellido, fecha_nacimiento, id_grado_seccion) VALUES 
(1001, 'Juan', 'Gomez', '2010-05-15', 1),
(1002, 'Maria', 'Lopez', '2011-06-20', 2),
(1003, 'Carlos', 'Martinez', '2010-07-25', 3),
(1004, 'Ana', 'Perez', '2011-08-30', 4),
(1005, 'Luis', 'Gonzalez', '2010-09-10', 5),
(1006, 'Sofia', 'Rodriguez', '2011-10-15', 6),
(1007, 'Diego', 'Fernandez', '2010-11-20', 7),
(1008, 'Laura', 'Sanchez', '2011-12-25', 8),
(1009, 'Pedro', 'Ramirez', '2010-01-30', 9),
(1010, 'Lucia', 'Torres', '2011-02-05', 10);

INSERT INTO Padres (carnet_estudiante, rol, nombre, apellido, email, telefono, password) VALUES 
(1001, 2, 'Carlos',     'Gomez',     'padre1@example.com', '1234567890', 'password1'),
(1002, 5, 'Luis',       'Lopez',     'padre2@example.com', '2345678901', 'password2'),
(1003, 8, 'Ricardo',    'Martinez',  'padre3@example.com', '3456789012', 'password3'),
(1004, 2, 'Jorge',      'Perez',     'padre4@example.com', '4567890123', 'password4'),
(1005, 5, 'Alejandro',  'Gonzalez',  'padre5@example.com', '5678901234', 'password5'),
(1006, 8, 'Eduardo',    'Rodriguez', 'padre6@example.com', '6789012345', 'password6'),
(1007, 2, 'Roberto',    'Fernandez', 'padre7@example.com', '7890123456', 'password7'),
(1008, 5, 'Mario',      'Sanchez',   'padre8@example.com', '8901234567', 'password8'),
(1009, 8, 'Daniel',     'Ramirez',   'padre9@example.com', '9012345678', 'password9'),
(1010, 2, 'Fernando',   'Torres',    'padre10@example.com','0123456789', 'password10');


INSERT INTO Administrativos (rol, nombre, apellido, email, telefono, password) VALUES 
(4, 'Roberto', 'Mendoza', 'admin1@example.com', '1122334455', 'password1'),
(7, 'Patricia', 'Vargas', 'admin2@example.com', '2233445566', 'password2'),
(10, 'Fernando', 'Castro', 'admin3@example.com', '3344556677', 'password3'),
(4, 'Gabriela', 'Rojas', 'admin4@example.com', '4455667788', 'password4'),
(7, 'Ricardo', 'Silva', 'admin5@example.com', '5566778899', 'password5'),
(10, 'Isabel', 'Fuentes', 'admin6@example.com', '6677889900', 'password6'),
(4, 'Oscar', 'Navarro', 'admin7@example.com', '7788990011', 'password7'),
(7, 'Adriana', 'Miranda', 'admin8@example.com', '8899001122', 'password8'),
(10, 'Javier', 'Peña', 'admin9@example.com', '9900112233', 'password9'),
(4, 'Monica', 'Cordero', 'admin10@example.com', '0011223344', 'password10');

INSERT INTO Familias (id_padre, carnet_estudiante) VALUES
(1, 1001),
(2, 1002),
(3, 1003),
(4, 1004),
(5, 1005),
(6, 1006),
(7, 1007),
(8, 1008),
(9, 1009),
(10, 1010);

INSERT INTO Materias (nombre) VALUES 
('Matemáticas'),
('Ciencias'),
('Historia'),
('Literatura'),
('Inglés'),
('Arte'),
('Educación Física'),
('Geografía'),
('Biología'),
('Química');

INSERT INTO Pagos (id_padre, carnet_estudiante) VALUES
(1, 1001),
(2, 1002),
(3, 1003),
(4, 1004),
(5, 1005),
(6, 1006),
(7, 1007),
(8, 1008),
(9, 1009),
(10, 1010);

INSERT INTO Metodo_pago (metodo_pago) VALUES 
('Efectivo'),
('Tarjeta de Crédito'),
('Tarjeta de Débito'),
('Transferencia'),
('Cheque'),
('PayPal'),
('Bitcoin'),
('Apple Pay'),
('Google Pay'),
('Pago Móvil');

INSERT INTO Solvencias (id_pagos, no_boleta, id_metodo_pago, monto, mes_solvencia_new, fecha_pago) VALUES
(1, 12345, 1, 500.00, 'Enero', '2023-01-15'),
(2, 12346, 2, 500.00, 'Febrero', '2023-02-15'),
(3, 12347, 1, 500.00, 'Marzo', '2023-03-15'),
(4, 12348, 2, 500.00, 'Abril', '2023-04-15'),
(5, 12349, 1, 500.00, 'Mayo', '2023-05-15'),
(6, 12350, 2, 500.00, 'Junio', '2023-06-15'),
(7, 12351, 1, 500.00, 'Julio', '2023-07-15'),
(8, 12352, 2, 500.00, 'Agosto', '2023-08-15'),
(9, 12353, 1, 500.00, 'Septiembre', '2023-09-15'),
(10, 12354, 2, 500.00, 'Octubre', '2023-10-15');

INSERT INTO Trimestres (nombre, fecha_inicio, fecha_fin) VALUES
('Primer Trimestre', '2023-01-01', '2023-03-31'), 
('Segundo Trimestre', '2023-04-01', '2023-06-30'), 
('Tercer Trimestre', '2023-07-01', '2023-09-30'),
('Cuarto Trimestre', '2023-10-01', '2023-12-31'); 

INSERT INTO Tareas (titulo, descripcion, valor, fecha_entrega, trimestre_id) VALUES
('Tarea de Álgebra', 'Resolver ejercicios de ecuaciones lineales', 10.0, '2023-01-20', 1), 
('Informe de Laboratorio', 'Documentar experimento de física', 15.0, '2023-01-22', 1),
('Ensayo sobre la Revolución', 'Analizar causas y consecuencias', 20.0, '2023-01-25', 1), 
('Análisis de Poema', 'Interpretar elementos literarios', 10.0, '2023-01-27', 1), 
('Presentación en Inglés', 'Exponer tema de interés en inglés', 15.0, '2023-01-30', 1), 
('Proyecto de Arte', 'Crear obra usando técnicas mixtas', 25.0, '2023-02-01', 1), 
('Rutina de Ejercicios', 'Desarrollar plan de ejercicios semanal', 10.0, '2023-02-03', 1), 
('Mapa de América', 'Dibujar y etiquetar países y capitales', 15.0, '2023-02-05', 1), 
('Informe de Biología', 'Investigar sistemas del cuerpo humano', 20.0, '2023-02-07', 1), 
('Experimento de Química', 'Realizar práctica de laboratorio', 25.0, '2023-02-10', 1); 

INSERT INTO Maestros (id, rol, nombre, apellido, email, telefono, password) VALUES
(1, 3, 'Juan', 'Pérez', 'maestro1@example.com', '1234567890', 'password1'),
(2, 6, 'María', 'Gómez', 'maestro2@example.com', '2345678901', 'password2'),
(3, 9, 'Carlos', 'López', 'maestro3@example.com', '3456789012', 'password3'),
(4, 3, 'Ana', 'Martínez', 'maestro4@example.com', '4567890123', 'password4'),
(5, 6, 'Pedro', 'Sánchez', 'maestro5@example.com', '5678901234', 'password5'),
(6, 9, 'Laura', 'Rodríguez', 'maestro6@example.com', '6789012345', 'password6'),
(7, 3, 'Diego', 'Fernández', 'maestro7@example.com', '7890123456', 'password7'),
(8, 6, 'Sofía', 'García', 'maestro8@example.com', '8901234567', 'password8'),
(9, 9, 'Lucía', 'Torres', 'maestro9@example.com', '9012345678', 'password9'),
(10, 3, 'Luis', 'Ramírez', 'maestro10@example.com', '0123456789', 'password10');

INSERT INTO Cursos (id_materia, id_maestro, id_grado_seccion) VALUES
(1, 1, 1), 
(2, 2, 2), 
(3, 3, 3), 
(4, 4, 4), 
(5, 5, 5), 
(6, 6, 6),
(7, 7, 7), 
(8, 8, 8), 
(9, 9, 9), 
(10, 10, 10); 

INSERT INTO Cursos_tareas (id_curso, id_tareas) VALUES
(1, 1), 
(2, 2), 
(3, 3), 
(4, 4), 
(5, 5), 
(6, 6),
(7, 7), 
(8, 8),
(9, 9), 
(10, 10); 


INSERT INTO Calificaciones (carnet_estudiante, id_curso, nota, id_boleta, id_tarea) VALUES--
(1001, 1, 85.5, null, 1), 
(1002, 2, 90.0, null, 2), 
(1003, 3, 78.0, null, 3), 
(1004, 4, 92.5, null, 4), 
(1005, 5, 88.0, null, 5), 
(1006, 6, 95.0, null, 6), 
(1007, 7, 81.5, null, 7), 
(1008, 8, 89.0, null, 8), 
(1009, 9, 76.5, null, 9), 
(1010, 10, 94.0, null, 10); 

INSERT INTO Asistencia (id_curso, carnet_estudiante, fecha) VALUES
(1, 1001, '2023-01-10 08:00:00'), 
(2, 1002, '2023-01-11 08:00:00'), 
(3, 1003, '2023-01-12 08:00:00'), 
(4, 1004, '2023-01-13 08:00:00'), 
(5, 1005, '2023-01-14 08:00:00'), 
(6, 1006, '2023-01-15 08:00:00'), 
(7, 1007, '2023-01-16 08:00:00'), 
(8, 1008, '2023-01-17 08:00:00'), 
(9, 1009, '2023-01-18 08:00:00'), 
(10, 1010, '2023-01-19 08:00:00'); 

INSERT INTO Observaciones (carnet_estudiante, id_curso, observaciones, puntos_de_accion, id_calificacion) VALUES
(1001, 1, 'Necesita mejorar en álgebra.', 'Reforzar temas de álgebra.', 1), 
(1002, 2, 'Excelente desempeño en laboratorios.', 'Seguir así.', 2), 
(1003, 3, 'Falta participación en clase.', 'Incentivar participación.', 3), 
(1004, 4, 'Muy buena comprensión lectora.', 'Leer más libros.', 4), 
(1005, 5, 'Dificultad en pronunciación.', 'Practicar pronunciación.', 5), 
(1006, 6, 'Creatividad destacada.', 'Explorar más técnicas artísticas.', 6), 
(1007, 7, 'Falta puntualidad en entregas.', 'Organizar mejor el tiempo.', 7), 
(1008, 8, 'Buen manejo de mapas.', 'Profundizar en geografía física.', 8), 
(1009, 9, 'Dificultad en temas de genética.', 'Reforzar genética.', 9),
(1010, 10, 'Excelente en experimentos.', 'Participar en ferias científicas.', 10); 

INSERT INTO Boleta_calificaciones (carnet_estudiante, fecha, ciclo_escolar, trimestre_id) VALUES
(1001, '2023-03-31', '2023', 1),
(1002, '2023-03-31', '2023', 1),
(1003, '2023-03-31', '2023', 1),
(1004, '2023-03-31', '2023', 1),
(1005, '2023-03-31', '2023', 1),
(1006, '2023-03-31', '2023', 1),
(1007, '2023-03-31', '2023', 1),
(1008, '2023-03-31', '2023', 1),
(1009, '2023-03-31', '2023', 1),
(1010, '2023-03-31', '2023', 1);