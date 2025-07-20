INSERT INTO Usuarios (rol) VALUES 
('SUP'),
('Padre'),
('Maestro'),
('Administrativo'),
('Director');

INSERT INTO SuperUsuarios (rol, nombre, apellido, email, telefono, password, activo) VALUES 
(1, 'Admin', 'Principal', 'superadmin@example.com', '0000000000', 'password1', True);

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

INSERT INTO Padres (carnet_estudiante, rol, nombre, apellido, email, telefono, password, activo) VALUES 
(1001, 2, 'Carlos',     'Gomez',     'padre1@example.com', '12345678', 'password1', True),
(1002, 2, 'Luis',       'Lopez',     'padre2@example.com', '23456789', 'password2', True),
(1003, 2, 'Ricardo',    'Martinez',  'padre3@example.com', '34567890', 'password3', True),
(1004, 2, 'Jorge',      'Perez',     'padre4@example.com', '45678901', 'password4', True),
(1005, 2, 'Alejandro',  'Gonzalez',  'padre5@example.com', '56789012', 'password5', True);


INSERT INTO Administrativos (rol, nombre, apellido, email, telefono, password, activo) VALUES 
(4, 'Roberto', 'Mendoza', 'admin1@example.com', '11223344', 'password1', True),
(4, 'Patricia', 'Vargas', 'admin2@example.com', '22334455', 'password2', True),
(4, 'Fernando', 'Castro', 'admin3@example.com', '33445566', 'password3', True),
(4, 'Gabriela', 'Rojas', 'admin4@example.com', '44556677', 'password4', True),
(4, 'Ricardo', 'Silva', 'admin5@example.com', '55667788', 'password5', True);

INSERT INTO Directores (rol, nombre, apellido, email, telefono, password, activo) VALUES 
(5, 'Miguel', 'Herrera', 'director1@example.com', '13579246', 'password1', True),
(5, 'Carmen', 'Delgado', 'director2@example.com', '24681357', 'password2', True),
(5, 'Antonio', 'Vega', 'director3@example.com', '35792468', 'password3', True);

INSERT INTO Familias (id_padre, carnet_estudiante) VALUES
(1, 1001),
(2, 1002),
(3, 1003),
(4, 1004),
(5, 1005);

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
(5, 1005);

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
(5, 12349, 1, 500.00, 'Mayo', '2023-05-15');

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
('Experimento de Química', 'Realizar práctica de laboratorio', 25.0, '2023-02-10', 1),
('Hoja de trabajo 1', 'Resolver problemas de álgebra capitulo 1', 3.0, '2023-05-07', 1),
('Hoja de trabajo 2', 'Resolver problemas de álgebra capitulo 2', 3.0, '2023-05-14', 1),
('Hoja de trabajo 3', 'Resolver problemas de álgebra capitulo 3', 3.0, '2023-05-21', 1), 
('Hoja de trabajo 4', 'Resolver problemas de álgebra capitulo 4', 3.0, '2023-05-28', 1), 
('Hoja de trabajo 5', 'Resolver problemas de álgebra capitulo 5', 3.0, '2023-06-04', 1), 
('Hoja de trabajo 6', 'Resolver problemas de álgebra capitulo 6', 3.0, '2023-06-11', 1), 
('Hoja de trabajo 7', 'Resolver problemas de álgebra capitulo 7', 3.0, '2023-06-18', 1), 
('Hoja de trabajo 8', 'Resolver problemas de álgebra capitulo 8', 3.0, '2023-06-25', 1), 
('Hoja de trabajo 9', 'Resolver problemas de álgebra capitulo 9', 3.0, '2023-07-02', 1), 
('Hoja de trabajo 10', 'Resolver problemas de álgebra capitulo 10', 3.0, '2023-07-09', 1);

-- probar boleta_calificaciones
-- Matemáticas
INSERT INTO Tareas (titulo, descripcion, valor, fecha_entrega, trimestre_id) VALUES 
('Álgebra básica', 'Resolver ecuaciones de primer grado', 10, '2023-09-15', 1),
('Geometría', 'Calcular áreas de figuras geométricas', 10, '2023-09-22', 1),
('Fracciones', 'Realizar operaciones con fracciones', 10, '2023-10-05', 1),
('Teorema de Pitágoras', 'Demostrar y aplicar el teorema', 10, '2023-10-12', 1),
('Estadística', 'Crear gráficos de barras', 10, '2023-10-19', 1),
('Ecuaciones cuadráticas', 'Resolver usando fórmula general', 10, '2023-11-02', 1),
('Trigonometría', 'Problemas con seno y coseno', 10, '2023-11-09', 1),
('Probabilidad', 'Calcular probabilidades simples', 10, '2023-11-16', 1),
('Logaritmos', 'Aplicar propiedades de logaritmos', 10, '2023-11-30', 1),
('Funciones', 'Graficar funciones lineales', 10, '2023-12-07', 1);

-- Ciencias
INSERT INTO Tareas (titulo, descripcion, valor, fecha_entrega, trimestre_id) VALUES 
('Sistema solar', 'Maqueta de los planetas', 10, '2023-09-18', 1),
('Estados de la materia', 'Experimento con hielo y vapor', 10, '2023-09-25', 1),
('Circuitos eléctricos', 'Construir circuito simple', 10, '2023-10-09', 1),
('Fotosíntesis', 'Informe sobre el proceso', 10, '2023-10-16', 1),
('Leyes de Newton', 'Ejemplos de cada ley', 10, '2023-10-23', 1),
('Energías renovables', 'Presentación sobre tipos', 10, '2023-11-06', 1),
('Tabla periódica', 'Memorizar primeros 20 elementos', 10, '2023-11-13', 1),
('Ecosistemas', 'Diagrama de cadena alimenticia', 10, '2023-11-20', 1),
('Volcanes', 'Simulación con bicarbonato', 10, '2023-12-04', 1),
('Magnetismo', 'Experimentos con imanes', 10, '2023-12-11', 1);

-- Historia
INSERT INTO Tareas (titulo, descripcion, valor, fecha_entrega, trimestre_id) VALUES 
('Revolución Francesa', 'Linea de tiempo de eventos', 10, '2023-09-20', 1),
('Civilizaciones antiguas', 'Comparar Egipto y Mesopotamia', 10, '2023-09-27', 1),
('Descubrimiento de América', 'Ensayo sobre el impacto', 10, '2023-10-11', 1),
('Guerras mundiales', 'Mapa de países participantes', 10, '2023-10-18', 1),
('Independencia nacional', 'Analizar causas y consecuencias', 10, '2023-10-25', 1),
('Edad Media', 'Investigar vida cotidiana', 10, '2023-11-08', 1),
('Revolución Industrial', 'Cambios tecnológicos', 10, '2023-11-15', 1),
('Culturas precolombinas', 'Maqueta de ciudad azteca', 10, '2023-11-22', 1),
('Derechos humanos', 'Cronología de su desarrollo', 10, '2023-12-06', 1),
('Globalización', 'Debate sobre efectos', 10, '2023-12-13', 1);

-- Literatura
INSERT INTO Tareas (titulo, descripcion, valor, fecha_entrega, trimestre_id) VALUES 
('Análisis poético', 'Identificar figuras literarias en un poema de Neruda', 10, '2023-09-14', 1),
('Géneros literarios', 'Presentación sobre diferencias entre lírico, épico y dramático', 10, '2023-09-21', 1),
('Don Quijote', 'Resumen y análisis de capítulos 1-5', 10, '2023-10-06', 1),
('Realismo mágico', 'Ensayo sobre "Cien años de soledad"', 10, '2023-10-13', 1),
('Haikus', 'Crear 3 haikus originales', 10, '2023-10-20', 1),
('Teatro griego', 'Comparar tragedias de Sófocles y Eurípides', 10, '2023-11-03', 1),
('Metáforas visuales', 'Dibujar una metáfora literaria', 10, '2023-11-10', 1),
('Biografía autor', 'Investigación sobre Gabriela Mistral', 10, '2023-11-17', 1),
('Cuento corto', 'Escribir un relato de 500 palabras', 10, '2023-12-01', 1),
('Crítica literaria', 'Analizar un artículo de opinión', 10, '2023-12-08', 1);

--ingles
INSERT INTO Tareas (titulo, descripcion, valor, fecha_entrega, trimestre_id) VALUES 
('Verb "to be"', 'Ejercicios de conjugación en presente', 10, '2023-09-16', 1),
('Family tree', 'Crear árbol genealógico con descripciones en inglés', 10, '2023-09-23', 1),
('Irregular verbs', 'Memorizar lista de 20 verbos', 10, '2023-10-07', 1),
('Job interview', 'Grabar un diálogo simulando una entrevista', 10, '2023-10-14', 1),
('Travel brochure', 'Diseñar folleto turístico de un país', 10, '2023-10-21', 1),
('Past tense', 'Redactar un diario personal (1 semana)', 10, '2023-11-04', 1),
('Movie review', 'Reseña de una película en inglés', 10, '2023-11-11', 1),
('Debate', 'Discutir tema "Technology in education"', 10, '2023-11-18', 1),
('Idioms', 'Ilustrar 5 modismos comunes', 10, '2023-12-02', 1),
('News report', 'Presentar noticiero en inglés (video)', 10, '2023-12-09', 1);

--arte
INSERT INTO Tareas (titulo, descripcion, valor, fecha_entrega, trimestre_id) VALUES 
('Autorretrato', 'Dibujo con lápiz usando espejo', 10, '2023-09-15', 1),
('Arte rupestre', 'Recrear pintura en cartón piedra', 10, '2023-09-22', 1),
('Círculo cromático', 'Pintar y explicar relaciones de color', 10, '2023-10-06', 1),
('Collage surrealista', 'Composición con revistas', 10, '2023-10-13', 1),
('Maqueta arquitectónica', 'Construir edificio con material reciclado', 10, '2023-10-20', 1),
('Fotografía', 'Serie de 5 fotos con tema "Sombras"', 10, '2023-11-03', 1),
('Mural colectivo', 'Participar en pintura mural del aula', 10, '2023-11-10', 1),
('Escultura', 'Figura abstracta con arcilla', 10, '2023-11-17', 1),
('Arte digital', 'Diseñar portada para libro en Illustrator', 10, '2023-12-01', 1),
('Exposición virtual', 'Crear galería online con obras propias', 10, '2023-12-08', 1);

-- educación física
INSERT INTO Tareas (titulo, descripcion, valor, fecha_entrega, trimestre_id) VALUES 
('Plan de entrenamiento', 'Diseñar rutina semanal de ejercicios', 10, '2023-09-17', 1),
('Deportes de equipo', 'Ensayo sobre reglas del fútbol', 10, '2023-09-24', 1),
('Nutrición deportiva', 'Investigar dieta de un atleta famoso', 10, '2023-10-08', 1),
('Yoga y meditación', 'Practicar y escribir experiencia personal', 10, '2023-10-15', 1),
('Historia del deporte', 'Presentación sobre los Juegos Olímpicos', 10, '2023-10-22', 1),
('Técnicas de respiración', 'Ejercicios prácticos y reflexiones', 10, '2023-11-05', 1),
('Atletismo', 'Competencia de carreras cortas y largas', 10, '2023-11-12', 1),
('Deportes alternativos', 'Investigar un deporte poco conocido', 10, '2023-11-19', 1),
('Primeros auxilios', 'Simulación de atención a lesiones comunes', 10, '2023-12-03', 1),
('Evaluación física', 'Test de resistencia y fuerza personal', 10, '2023-12-10', 1);

-- geografía
INSERT INTO Tareas (titulo, descripcion, valor, fecha_entrega, trimestre_id) VALUES 
('Mapa de continentes', 'Dibujar y etiquetar continentes y océanos', 10, '2023-09-18', 1),
('Climas del mundo', 'Presentación sobre zonas climáticas', 10, '2023-09-25', 1),
('Capitales del mundo', 'Juego de memoria con capitales', 10, '2023-10-09', 1),
('Recursos naturales', 'Investigar recursos de un país específico', 10, '2023-10-16', 1),
('Geografía física', 'Mapa topográfico de una región local', 10, '2023-10-23', 1),
('Población mundial', 'Gráfico de crecimiento poblacional', 10, '2023-11-07', 1),
('Cultura y geografía', 'Ensayo sobre influencia cultural en geografía', 15, '2023-11-14', 1),
('Desastres naturales', 'Informe sobre terremotos y tsunamis', 10, '2023-11-21', 1),
('Geopolítica actual', 'Debate sobre conflictos territoriales actuales', 10, '2023-12-05', 1),
('Proyectos geográficos', 'Crear un proyecto sobre un país elegido', 10, '2023-12-12', 1);

-- biología
INSERT INTO Tareas (titulo, descripcion, valor, fecha_entrega, trimestre_id) VALUES 
('Células', 'Dibujar y etiquetar partes de una célula', 10, '2023-09-19', 1),
('Ecosistemas', 'Crear diagrama de cadena alimentaria', 10, '2023-09-26', 1),
('Genética', 'Explorar herencia mendeliana con plantas', 10, '2023-10-10', 1),
('Anatomía humana', 'Estudiar sistemas del cuerpo humano', 10, '2023-10-17', 1),
('Biodiversidad', 'Investigar especies en peligro de extinción', 10, '2023-10-24', 1),
('Microorganismos', 'Experimento con cultivo de bacterias', 10, '2023-11-08', 1),
('Plantas medicinales', 'Informe sobre usos y propiedades', 10, '2023-11-15', 1),
('Ecología urbana', 'Estudio de flora y fauna local', 10, '2023-11-22', 1),
('Biotecnología', 'Debate sobre ética en biotecnología moderna', 10, '2023-12-06', 1),
('Proyecto final de biología', 'Presentación sobre un tema biológico elegido', 10, '2023-12-13', 1);

-- química
INSERT INTO Tareas (titulo, descripcion, valor, fecha_entrega, trimestre_id) VALUES 
('Tabla periódica', 'Memorizar primeros 20 elementos', 10, '2023-09-20', 1),
('Reacciones químicas', 'Experimento con reacciones ácido-base', 10, '2023-09-27', 1),
('Moles y masa molar', 'Calcular moles de diferentes sustancias', 10, '2023-10-11', 1),
('Soluciones y concentraciones', 'Preparar soluciones de diferentes concentraciones', 10, '2023-10-18', 1),
('Ecuaciones químicas', 'Balancear ecuaciones químicas simples', 10, '2023-10-25', 1),
('Propiedades de los gases', 'Experimento con presión y volumen de gases', 10, '2023-11-09', 1),
('Ácidos y bases', 'Investigar propiedades de ácidos y bases comunes', 10, '2023-11-16', 1),
('Química orgánica', 'Dibujar estructuras de compuestos orgánicos', 10, '2023-11-23', 1),
('Polímeros', 'Crear un proyecto sobre plásticos y su reciclaje', 10, '2023-12-07', 1),
('Proyecto final de química', 'Presentación sobre un tema químico elegido', 10, '2023-12-14', 1);

INSERT INTO Maestros (id, rol, nombre, apellido, email, telefono, password, activo) VALUES
(1, 3, 'Juan', 'Pérez', 'maestro1@example.com', '12345678', 'password1', True),
(2, 3, 'María', 'Gómez', 'maestro2@example.com', '23456789', 'password2', True),
(3, 3, 'Carlos', 'López', 'maestro3@example.com', '34567890', 'password3', True),
(4, 3, 'Ana', 'Martínez', 'maestro4@example.com', '45678901', 'password4', True),
(5, 3, 'Pedro', 'Sánchez', 'maestro5@example.com', '56789012', 'password5', True);

INSERT INTO Estudiante_grado_seccion (id_estudiante, id_grado_seccion)
VALUES
(1001, 1),
(1002, 2),
(1003, 3),
(1004, 4),
(1005, 5),
(1006, 6),
(1007, 7),
(1008, 8),
(1009, 9),
(1010, 10);

INSERT INTO Cursos (id_materia, id_maestro, id_grado_seccion) VALUES
(1, 1, 1), 
(2, 2, 2), 
(3, 3, 3), 
(4, 4, 4), 
(5, 5, 5); 

INSERT INTO Cursos (id_materia, id_maestro, id_grado_seccion) VALUES
(2, 1, 1), 
(3, 2, 1), 
(4, 3, 1), 
(5, 4, 1), 
(6, 5, 1); 

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
(10, 10),
(1, 11),
(1, 12),
(1, 13),
(1, 14),
(1, 15),
(1, 16),
(1, 17),
(1, 18),
(1, 19),
(1, 20); 

INSERT INTO Cursos_tareas (id_curso, id_tareas) VALUES
(1, 21), 
(1, 22), 
(1, 23), 
(1, 24), 
(1, 25), 
(1, 26),
(1, 27), 
(1, 28),
(1, 29), 
(1, 30),
(2, 31),
(2, 32),
(2, 33),
(2, 34),
(2, 35),
(2, 36),
(2, 37),
(2, 38),
(2, 39),
(2, 40),
(3, 41),
(3, 42),
(3, 43),
(3, 44),
(3, 45),
(3, 46),
(3, 47),
(3, 48),
(3, 49),
(3, 50),
(4, 51),
(4, 52),
(4, 53),
(4, 54),
(4, 55),
(4, 56),
(4, 57),
(4, 58),
(4, 59),
(4, 60),
(5, 61),
(5, 62),
(5, 63),
(5, 64),
(5, 65),
(5, 66),
(5, 67),
(5, 68),
(5, 69),
(5, 70),
(6, 71),
(6, 72),
(6, 73),
(6, 74),
(6, 75),
(6, 76),
(6, 77),
(6, 78),
(6, 79),
(6, 80),
(7, 81),
(7, 82),
(7, 83),
(7, 84),
(7, 85),
(7, 86),
(7, 87),
(7, 88),
(7, 89),
(7, 90),
(8, 91),
(8, 92),
(8, 93),
(8, 94),
(8, 95),
(8, 96),
(8, 97),
(8, 98),
(8, 99),
(8, 100),
(9, 101),
(9, 102),
(9, 103),
(9, 104),
(9, 105),
(9, 106),
(9, 107),
(9, 108),
(9, 109),
(9, 110),
(10, 111),
(10, 112),
(10, 113),
(10, 114),
(10, 115),
(10, 116),
(10, 117),
(10, 118),
(10, 119),
(10, 120);


INSERT INTO Calificaciones (carnet_estudiante, id_curso, nota, id_boleta, id_tarea) VALUES--
(1002, 2, 90.0, null, 2), 
(1003, 3, 78.0, null, 3), 
(1004, 4, 92.5, null, 4), 
(1005, 5, 88.0, null, 5), 
(1006, 6, 95.0, null, 6), 
(1007, 7, 81.5, null, 7), 
(1008, 8, 89.0, null, 8), 
(1009, 9, 76.5, null, 9), 
(1010, 10, 94.0, null, 10); 

INSERT INTO Calificaciones (carnet_estudiante, id_curso, nota, id_boleta, id_tarea) VALUES
(1001, 1, 8, null, 21),
(1001, 1, 9, null, 22),
(1001, 1, 7, null, 23),
(1001, 1, 8, null, 24),
(1001, 1, 10, null, 25),
(1001, 1, 9, null, 26),
(1001, 1, 8, null, 27),
(1001, 1, 10, null, 28),
(1001, 1, 7, null, 29),
(1001, 1, 9, null, 30),
(1001, 2, 9, null, 31),
(1001, 2, 8, null, 32),
(1001, 2, 10, null, 33),
(1001, 2, 9, null, 34),
(1001, 2, 8, null, 35),
(1001, 2, 9, null, 36),
(1001, 2, 10, null, 37),
(1001, 2, 7, null, 38),
(1001, 2, 8, null, 39),
(1001, 2, 8, null, 40),
(1001, 3, 7, null, 41),
(1001, 3, 8, null, 42),
(1001, 3, 9, null, 43),
(1001, 3, 10, null, 44),
(1001, 3, 8, null, 45),
(1001, 3, 9, null, 46),
(1001, 3, 7, null, 47),
(1001, 3, 8, null, 48),
(1001, 3, 8, null, 49),
(1001, 3, 9, null, 50),
(1001, 4, 8, null, 51),
(1001, 4, 9, null, 52),
(1001, 4, 10, null, 53),
(1001, 4, 7, null, 54),
(1001, 4, 8, null, 55),
(1001, 4, 9, null, 56),
(1001, 4, 10, null, 57),
(1001, 4, 8, null, 58),
(1001, 4, 9, null, 59),
(1001, 4, 7, null, 60),
(1001, 5, 8, null, 61),
(1001, 5, 9, null, 62),
(1001, 5, 10, null, 63),
(1001, 5, 7, null, 64),
(1001, 5, 8, null, 65),
(1001, 5, 9, null, 66),
(1001, 5, 10, null, 67),
(1001, 5, 8, null, 68),
(1001, 5, 9, null, 69),
(1001, 5, 7, null, 70),
(1001, 6, 8, null, 71),
(1001, 6, 9, null, 72),
(1001, 6, 10, null, 73),
(1001, 6, 7, null, 74),
(1001, 6, 8, null, 75),
(1001, 6, 9, null, 76),
(1001, 6, 10, null, 77),
(1001, 6, 8, null, 78),
(1001, 6, 9, null, 79),
(1001, 6, 7, null, 80),
(1001, 7, 8, null, 81),
(1001, 7, 9, null, 82),
(1001, 7, 10, null, 83),
(1001, 7, 7, null, 84),
(1001, 7, 8, null, 85),
(1001, 7, 9, null, 86),
(1001, 7, 10, null, 87),
(1001, 7, 8, null, 88),
(1001, 7 ,9 ,null ,89),
(1001, 7 ,10 ,null ,90),
(1001, 8, 9, null, 91),
(1001, 8, 8, null, 92),
(1001, 8, 10, null, 93),
(1001, 8, 7, null, 94),
(1001, 8, 8, null, 95),
(1001, 8, 9, null, 96),
(1001, 8, 10, null, 97),
(1001, 8, 8, null, 98),
(1001, 8 ,9 ,null ,99),
(1001, 8 ,7 ,null ,100),
(1001, 9 ,8 ,null ,101),
(1001, 9 ,9 ,null ,102),
(1001, 9 ,10 ,null ,103),
(1001, 9 ,7 ,null ,104),
(1001, 9 ,8 ,null ,105),
(1001, 9 ,9 ,null ,106),
(1001, 9 ,10 ,null ,107),
(1001, 9 ,8 ,null ,108),
(1001, 9 ,9 ,null ,109),
(1001, 9, 10, null, 110),
(1001, 10, 8, null, 111),
(1001, 10, 9, null, 112),
(1001, 10, 10, null, 113),
(1001, 10, 7, null, 114),
(1001, 10, 8, null, 115),
(1001, 10, 9, null, 116),
(1001, 10, 10, null, 117),
(1001, 10, 8, null, 118),
(1001, 10 ,9 ,null ,119),
(1001, 10 ,7 ,null ,120);


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

INSERT INTO Observaciones (carnet_estudiante, id_curso, observaciones, puntos_de_accion, id_calificacion) VALUES
(1001, 2, 'Necesita mejorar en la escritura.', 'Practicar redacción.', 31),
(1001, 3, 'Buen uso de herramientas digitales.', 'Seguir explorando nuevas tecnologías.', 41),
(1001, 4, 'Falta de atención en clase.', 'Mejorar concentración.', 51),
(1001, 5, 'Excelente en proyectos grupales.', 'Continuar colaborando con compañeros.', 61),
(1001, 6, 'Dificultad en matemáticas avanzadas.', 'Reforzar conceptos básicos.', 71),
(1001, 7, 'Muy buena actitud hacia el aprendizaje.', 'Mantener la motivación.', 81),
(1001, 8, 'Falta de organización en tareas.', 'Usar agenda para planificar tareas.', 91),
(1001, 9, 'Buen desempeño en exposiciones orales.', 'Seguir practicando habilidades de comunicación.', 101);

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