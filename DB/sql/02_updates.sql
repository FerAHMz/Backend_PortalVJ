-- Tabla Metodo_pago
CREATE TABLE Metodo_pago (
    id serial PRIMARY KEY NOT NULL,
    metodo_pago varchar(20)
);

-- Tabla Grado_seccion
CREATE TABLE Grado_seccion (
    id serial PRIMARY KEY NOT NULL,
    id_grado int NOT NULL REFERENCES Grados(id),
    id_seccion int NOT NULL REFERENCES Secciones(id)
);

-- Tabla Estudiante_grado_seccion
CREATE TABLE Estudiante_grado_seccion (
    id serial PRIMARY KEY NOT NULL,
    id_estudiante VARCHAR(20) NOT NULL REFERENCES Estudiantes(carnet),
    id_grado_seccion int NOT NULL REFERENCES Grado_seccion(id),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Tabla Trimestres
CREATE TABLE Trimestres (
    id serial PRIMARY KEY NOT NULL,
    nombre varchar(50) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL
);

-- Tabla Boleta_calificaciones
CREATE TABLE Boleta_calificaciones (
    id serial PRIMARY KEY NOT NULL,
    carnet_estudiante VARCHAR(20) NOT NULL REFERENCES Estudiantes(carnet),
    fecha date NOT NULL,
    ciclo_escolar varchar(4),
    trimestre_id int REFERENCES Trimestres(id)
);



-- Modificar tabla Estudiantes
ALTER TABLE Estudiantes
    ADD COLUMN id_grado_seccion int REFERENCES Grado_seccion(id),
    DROP CONSTRAINT estudiantes_grado_fkey,
    DROP COLUMN grado;

-- Agregar columna estado a la tabla Estudiantes
ALTER TABLE Estudiantes 
ADD COLUMN estado VARCHAR(20) DEFAULT 'estudiante_activo';

-- Agregar constraint para validar valores del estado
ALTER TABLE Estudiantes
ADD CONSTRAINT chk_estudiantes_estado 
CHECK (estado IN ('inscrito', 'estudiante_activo', 'inactivo'));

-- Modificar tabla Secciones
ALTER TABLE Secciones
    ADD COLUMN seccion varchar(5),
    DROP CONSTRAINT secciones_carnet_estudiante_fkey,
    DROP COLUMN carnet_estudiante;

--Modificar la tabla Solvencias
ALTER TABLE Solvencias
    ADD COLUMN no_boleta int NOT NULL,
    ADD COLUMN id_metodo_pago int NOT NULL REFERENCES Metodo_pago(id),
    ADD COLUMN monto decimal (10,2),
    DROP COLUMN mes_solvencia,
    ADD COLUMN mes_solvencia_new VARCHAR(15) NOT NULL CHECK (
        mes_solvencia_new IN (
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        )
    );

-- Modificar tabla Cursos
ALTER TABLE Cursos
    ADD COLUMN id_grado_seccion int NOT NULL REFERENCES Grado_seccion(id),
    DROP CONSTRAINT cursos_id_seccion_fkey,
    DROP COLUMN id_seccion,
    DROP CONSTRAINT cursos_id_grado_fkey,
    DROP COLUMN id_grado;

-- esto no es necesario, ver si lo agregamos
-- Modificar tabla Cursos
/* provisionalmente lo voy a dejar comentado, por pruebas del login
ALTER TABLE Cursos
    ADD COLUMN id_trimestres int NOT NULL REFERENCES Trimestres(id);
*/

-- Modificar tabla Grados
ALTER TABLE Grados
    ALTER COLUMN grado TYPE varchar(255);


-- Modificar tabla Calificaciones
ALTER TABLE Calificaciones
    ADD COLUMN id_boleta int REFERENCES Boleta_calificaciones(id),
    ADD COLUMN id_tarea int NOT NULL REFERENCES Tareas(id);

-- Modificar tabla Tareas
ALTER TABLE Tareas
    ADD COLUMN descripcion text NOT NULL,
    ADD COLUMN trimestre_id int REFERENCES Trimestres(id);

-- Modificar tabla Observaciones
ALTER TABLE Observaciones
    ADD COLUMN id_calificacion int REFERENCES Calificaciones(id);

-- Modificar tabla Metodo pago
ALTER TABLE Metodo_pago
ADD CONSTRAINT metodo_pago_check
CHECK (metodo_pago IN (
  'Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 
  'Transferencia', 'Cheque', 'PayPal', 'Bitcoin', 
  'Apple Pay', 'Google Pay', 'Pago Móvil'
));

ALTER TABLE Asistencia
ADD COLUMN estado VARCHAR(10) CHECK (estado IN ('present', 'absent', 'late'));

ALTER TABLE Asistencia
ADD CONSTRAINT unique_asistencia UNIQUE (id_curso, carnet_estudiante, fecha);

ALTER TABLE Pagos
ADD COLUMN estado BOOLEAN DEFAULT TRUE, -- true es que la solvencia es valida, false invalida
ADD COLUMN razon_invalidacion TEXT;

ALTER TABLE Solvencias
ADD COLUMN estado BOOLEAN DEFAULT TRUE; -- true es que la solvencia es valida, false invalida

CREATE TABLE auditoria_pagos (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL, -- quien hizo la acción
  tipo_usuario VARCHAR(20) CHECK (tipo_usuario IN ('Administrativo', 'SUP')),
  accion VARCHAR(100) NOT NULL,
  descripcion TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  entidad_afectada VARCHAR(50),
  id_entidad_afectada INT
);

-- el atributo estado es para invalidar una solvencia, en lugar de eliminarla

-- Agregar campos adicionales a la tabla Grado_seccion para inscripciones
ALTER TABLE Grado_seccion 
ADD COLUMN IF NOT EXISTS capacidad_maxima INT DEFAULT 30,
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- Creación de tabla Inscripciones para gestión de inscripciones de estudiantes
CREATE TABLE IF NOT EXISTS Inscripciones (
    id_inscripcion SERIAL PRIMARY KEY,
    carnet VARCHAR(20) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    id_grado_seccion INT NOT NULL,
    sire VARCHAR(20),
    correo_padres VARCHAR(100),
    estado_inscripcion VARCHAR(20) DEFAULT 'inscrito', -- valores: 'inscrito', 'estudiante_activo', 'eliminado'
    fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inscripciones_grado_seccion FOREIGN KEY (id_grado_seccion) REFERENCES Grado_seccion(id)
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_inscripciones_carnet ON Inscripciones(carnet);
CREATE INDEX IF NOT EXISTS idx_inscripciones_sire ON Inscripciones(sire);
CREATE INDEX IF NOT EXISTS idx_inscripciones_estado ON Inscripciones(estado_inscripcion);
CREATE INDEX IF NOT EXISTS idx_inscripciones_grado_seccion ON Inscripciones(id_grado_seccion);

-- Comentarios para documentación
COMMENT ON TABLE Inscripciones IS 'Tabla para gestión completa de inscripciones de estudiantes con datos adicionales';
COMMENT ON COLUMN Inscripciones.carnet IS 'Carnet único del estudiante';
COMMENT ON COLUMN Inscripciones.nombre IS 'Nombre completo del estudiante';
COMMENT ON COLUMN Inscripciones.apellido IS 'Apellido completo del estudiante';
COMMENT ON COLUMN Inscripciones.fecha_nacimiento IS 'Fecha de nacimiento del estudiante';
COMMENT ON COLUMN Inscripciones.id_grado_seccion IS 'Referencia al grado y sección asignada';
COMMENT ON COLUMN Inscripciones.sire IS 'Código SIRE del estudiante (opcional)';
COMMENT ON COLUMN Inscripciones.correo_padres IS 'Email de contacto de los padres';
COMMENT ON COLUMN Inscripciones.estado_inscripcion IS 'Estado actual de la inscripción: inscrito, estudiante_activo, eliminado';

-- Agregar índice para el estado de estudiantes
CREATE INDEX IF NOT EXISTS idx_estudiantes_estado ON Estudiantes(estado);

-- Función para convertir inscripción a estudiante activo
CREATE OR REPLACE FUNCTION convertir_inscripcion_a_estudiante(inscripcion_id INT)
RETURNS JSON AS $$
DECLARE
    carnet_est VARCHAR(20);
    grado_seccion_id INT;
    resultado JSON;
BEGIN
    -- Obtener información de la inscripción
    SELECT 
        i.carnet,
        i.id_grado_seccion
    INTO carnet_est, grado_seccion_id
    FROM Inscripciones i
    WHERE i.id_inscripcion = inscripcion_id AND i.estado_inscripcion = 'inscrito';
    
    IF NOT FOUND THEN
        resultado := json_build_object(
            'success', false,
            'message', 'Inscripción no encontrada o no está en estado válido'
        );
        RETURN resultado;
    END IF;
    
    -- Verificar que el estudiante existe
    IF NOT EXISTS (SELECT 1 FROM Estudiantes WHERE carnet = carnet_est) THEN
        resultado := json_build_object(
            'success', false,
            'message', 'Estudiante no encontrado en la tabla Estudiantes'
        );
        RETURN resultado;
    END IF;
    
    -- Verificar si ya existe en Estudiante_grado_seccion
    IF EXISTS (
        SELECT 1 FROM Estudiante_grado_seccion 
        WHERE id_estudiante = carnet_est AND id_grado_seccion = grado_seccion_id
    ) THEN
        resultado := json_build_object(
            'success', false,
            'message', 'El estudiante ya está activo en este grado-sección'
        );
        RETURN resultado;
    END IF;
    
    -- Insertar en Estudiante_grado_seccion para activar al estudiante
    INSERT INTO Estudiante_grado_seccion (id_estudiante, id_grado_seccion, fecha)
    VALUES (carnet_est, grado_seccion_id, CURRENT_DATE);
    
    -- Actualizar estado del estudiante a activo
    UPDATE Estudiantes 
    SET estado = 'estudiante_activo'
    WHERE carnet = carnet_est;
    
    -- Actualizar estado de inscripción
    UPDATE Inscripciones 
    SET estado_inscripcion = 'estudiante_activo', fecha_actualizacion = CURRENT_TIMESTAMP
    WHERE id_inscripcion = inscripcion_id;
    
    resultado := json_build_object(
        'success', true,
        'message', 'Estudiante activado exitosamente',
        'carnet', carnet_est,
        'id_grado_seccion', grado_seccion_id
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql;