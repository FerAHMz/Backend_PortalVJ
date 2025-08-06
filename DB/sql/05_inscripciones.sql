-- Creación de tabla Inscripciones para gestión de inscripciones de estudiantes
CREATE TABLE IF NOT EXISTS Inscripciones (
    id_inscripcion SERIAL PRIMARY KEY,
    carnet VARCHAR(20) NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    id_grado_seccion INT NOT NULL,
    sire VARCHAR(20),
    correo_padres VARCHAR(100),
    estado_inscripcion VARCHAR(20) DEFAULT 'inscrito', -- valores: 'inscrito', 'estudiante_activo', 'eliminado'
    fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_grado_seccion) REFERENCES Grado_seccion(id_grado_seccion)
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_inscripciones_carnet ON Inscripciones(carnet);
CREATE INDEX IF NOT EXISTS idx_inscripciones_sire ON Inscripciones(sire);
CREATE INDEX IF NOT EXISTS idx_inscripciones_estado ON Inscripciones(estado_inscripcion);
CREATE INDEX IF NOT EXISTS idx_inscripciones_grado_seccion ON Inscripciones(id_grado_seccion);

-- Comentarios para documentación
COMMENT ON TABLE Inscripciones IS 'Tabla para gestión completa de inscripciones de estudiantes con datos adicionales';
COMMENT ON COLUMN Inscripciones.carnet IS 'Carnet único del estudiante';
COMMENT ON COLUMN Inscripciones.nombres IS 'Nombres completos del estudiante';
COMMENT ON COLUMN Inscripciones.apellidos IS 'Apellidos completos del estudiante';
COMMENT ON COLUMN Inscripciones.fecha_nacimiento IS 'Fecha de nacimiento del estudiante';
COMMENT ON COLUMN Inscripciones.id_grado_seccion IS 'Referencia al grado y sección asignada';
COMMENT ON COLUMN Inscripciones.sire IS 'Código SIRE del estudiante (opcional)';
COMMENT ON COLUMN Inscripciones.correo_padres IS 'Correo electrónico de contacto de los padres (opcional)';
COMMENT ON COLUMN Inscripciones.estado_inscripcion IS 'Estados: inscrito, estudiante_activo, eliminado';

-- Función para convertir inscripción a estudiante activo
CREATE OR REPLACE FUNCTION convertir_inscripcion_a_estudiante(inscripcion_id INT)
RETURNS JSON AS $$
DECLARE
    carnet_est VARCHAR(20);
    grado_seccion_id INT;
    id_estudiante INT;
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
    
    -- Obtener ID del estudiante
    SELECT e.id_estudiante INTO id_estudiante
    FROM Estudiantes e
    WHERE e.carnet = carnet_est;
    
    IF NOT FOUND THEN
        resultado := json_build_object(
            'success', false,
            'message', 'Estudiante no encontrado en la tabla Estudiantes'
        );
        RETURN resultado;
    END IF;
    
    -- Verificar si ya existe en Estudiante_grado_seccion
    IF EXISTS (
        SELECT 1 FROM Estudiante_grado_seccion 
        WHERE id_estudiante = id_estudiante AND id_grado_seccion = grado_seccion_id
    ) THEN
        resultado := json_build_object(
            'success', false,
            'message', 'El estudiante ya está activo en este grado-sección'
        );
        RETURN resultado;
    END IF;
    
    -- Insertar en Estudiante_grado_seccion para activar al estudiante
    INSERT INTO Estudiante_grado_seccion (id_estudiante, id_grado_seccion, fecha)
    VALUES (id_estudiante, grado_seccion_id, CURRENT_DATE);
    
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