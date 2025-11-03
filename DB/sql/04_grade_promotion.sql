-- ===================================
-- SISTEMA DE PROMOCIÓN AUTOMÁTICA DE ESTUDIANTES
-- ===================================
-- Este archivo contiene las funciones y procedimientos para 
-- la promoción automática de estudiantes basada en sus calificaciones

-- 1. Función para calcular el promedio general de un estudiante por trimestre
CREATE OR REPLACE FUNCTION calcular_promedio_estudiante(
    p_carnet_estudiante VARCHAR(20),
    p_trimestre_id INT
) RETURNS DECIMAL(5,2) AS $$
DECLARE
    promedio_general DECIMAL(5,2);
BEGIN
    -- Calcular el promedio de todas las materias del estudiante en un trimestre específico
    SELECT COALESCE(AVG(c.nota), 0)
    INTO promedio_general
    FROM Calificaciones c
    INNER JOIN Cursos cu ON c.id_curso = cu.id
    INNER JOIN Cursos_tareas ct ON cu.id = ct.id_curso
    INNER JOIN Tareas t ON ct.id_tareas = t.id
    WHERE c.carnet_estudiante = p_carnet_estudiante
      AND t.trimestre_id = p_trimestre_id;
    
    RETURN ROUND(promedio_general, 2);
END;
$$ LANGUAGE plpgsql;

-- 2. Función para obtener el siguiente grado
CREATE OR REPLACE FUNCTION obtener_siguiente_grado(p_grado_actual_id INT) 
RETURNS INT AS $$
DECLARE
    siguiente_grado_id INT;
BEGIN
    -- Obtener el ID del siguiente grado basado en el orden numérico
    -- Asumiendo que los grados están en orden: 1º, 2º, 3º, etc.
    SELECT id INTO siguiente_grado_id
    FROM Grados 
    WHERE id = p_grado_actual_id + 1;
    
    -- Si no existe el siguiente grado (ej: después de 10º grado), retorna NULL
    RETURN siguiente_grado_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Función para obtener la sección disponible en el siguiente grado
CREATE OR REPLACE FUNCTION obtener_seccion_disponible(p_grado_id INT) 
RETURNS INT AS $$
DECLARE
    seccion_id INT;
BEGIN
    -- Buscar la primera sección disponible en el grado especificado
    -- Por simplicidad, tomamos la sección 'A' (id = 1) por defecto
    SELECT gs.id INTO seccion_id
    FROM Grado_seccion gs
    WHERE gs.id_grado = p_grado_id
    LIMIT 1;
    
    RETURN seccion_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Procedimiento principal para promover estudiantes
CREATE OR REPLACE FUNCTION promover_estudiantes_por_trimestre(
    p_trimestre_id INT,
    p_nota_minima DECIMAL(5,2) DEFAULT 60.0
) RETURNS TABLE (
    carnet_estudiante VARCHAR(20),
    nombre_completo VARCHAR(101),
    grado_anterior VARCHAR(50),
    grado_nuevo VARCHAR(50),
    promedio_final DECIMAL(5,2),
    estado_promocion VARCHAR(20)
) AS $$
DECLARE
    estudiante_record RECORD;
    promedio_estudiante DECIMAL(5,2);
    grado_actual_id INT;
    siguiente_grado_id INT;
    nueva_seccion_id INT;
    grado_actual_nombre VARCHAR(50);
    grado_nuevo_nombre VARCHAR(50);
BEGIN
    -- Crear tabla temporal para resultados
    CREATE TEMP TABLE IF NOT EXISTS temp_promociones (
        carnet_estudiante VARCHAR(20),
        nombre_completo VARCHAR(101),
        grado_anterior VARCHAR(50),
        grado_nuevo VARCHAR(50),
        promedio_final DECIMAL(5,2),
        estado_promocion VARCHAR(20)
    );
    
    -- Limpiar tabla temporal
    DELETE FROM temp_promociones;
    
    -- Procesar cada estudiante activo
    FOR estudiante_record IN 
        SELECT DISTINCT e.carnet, e.nombre, e.apellido, e.id_grado_seccion,
               gs.id_grado, g.grado as nombre_grado
        FROM Estudiantes e
        INNER JOIN Grado_seccion gs ON e.id_grado_seccion = gs.id
        INNER JOIN Grados g ON gs.id_grado = g.id
        WHERE e.estado = 'estudiante_activo'
    LOOP
        -- Calcular promedio del estudiante
        promedio_estudiante := calcular_promedio_estudiante(estudiante_record.carnet, p_trimestre_id);
        grado_actual_id := estudiante_record.id_grado;
        grado_actual_nombre := estudiante_record.nombre_grado;
        
        -- Verificar si el estudiante pasa o repite
        IF promedio_estudiante >= p_nota_minima THEN
            -- El estudiante pasa - buscar siguiente grado
            siguiente_grado_id := obtener_siguiente_grado(grado_actual_id);
            
            IF siguiente_grado_id IS NOT NULL THEN
                -- Hay un siguiente grado disponible
                nueva_seccion_id := obtener_seccion_disponible(siguiente_grado_id);
                
                IF nueva_seccion_id IS NOT NULL THEN
                    -- Actualizar el grado del estudiante
                    UPDATE Estudiantes 
                    SET id_grado_seccion = nueva_seccion_id
                    WHERE carnet = estudiante_record.carnet;
                    
                    -- Obtener nombre del nuevo grado
                    SELECT g.grado INTO grado_nuevo_nombre
                    FROM Grados g
                    INNER JOIN Grado_seccion gs ON g.id = gs.id_grado
                    WHERE gs.id = nueva_seccion_id;
                    
                    -- Registrar la promoción
                    INSERT INTO temp_promociones VALUES (
                        estudiante_record.carnet,
                        estudiante_record.nombre || ' ' || estudiante_record.apellido,
                        grado_actual_nombre,
                        grado_nuevo_nombre,
                        promedio_estudiante,
                        'PROMOVIDO'
                    );
                ELSE
                    -- No hay sección disponible en el siguiente grado
                    INSERT INTO temp_promociones VALUES (
                        estudiante_record.carnet,
                        estudiante_record.nombre || ' ' || estudiante_record.apellido,
                        grado_actual_nombre,
                        grado_actual_nombre,
                        promedio_estudiante,
                        'SIN_SECCION'
                    );
                END IF;
            ELSE
                -- Es el último grado - graduado
                -- Cambiar estado del estudiante a inactivo o graduado
                UPDATE Estudiantes 
                SET estado = 'inactivo'
                WHERE carnet = estudiante_record.carnet;
                
                INSERT INTO temp_promociones VALUES (
                    estudiante_record.carnet,
                    estudiante_record.nombre || ' ' || estudiante_record.apellido,
                    grado_actual_nombre,
                    'GRADUADO',
                    promedio_estudiante,
                    'GRADUADO'
                );
            END IF;
        ELSE
            -- El estudiante repite el grado
            INSERT INTO temp_promociones VALUES (
                estudiante_record.carnet,
                estudiante_record.nombre || ' ' || estudiante_record.apellido,
                grado_actual_nombre,
                grado_actual_nombre,
                promedio_estudiante,
                'REPITE'
            );
        END IF;
    END LOOP;
    
    -- Retornar resultados
    RETURN QUERY SELECT * FROM temp_promociones ORDER BY temp_promociones.carnet_estudiante;
END;
$$ LANGUAGE plpgsql;

-- 5. Tabla de auditoría para las promociones
CREATE TABLE IF NOT EXISTS Historial_promociones (
    id SERIAL PRIMARY KEY,
    carnet_estudiante VARCHAR(20) NOT NULL,
    grado_anterior_id INT NOT NULL,
    grado_nuevo_id INT,
    promedio_final DECIMAL(5,2) NOT NULL,
    trimestre_id INT NOT NULL,
    ciclo_escolar VARCHAR(10) NOT NULL,
    estado_promocion VARCHAR(20) NOT NULL CHECK (estado_promocion IN ('PROMOVIDO', 'REPITE', 'GRADUADO', 'SIN_SECCION')),
    fecha_promocion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observaciones TEXT,
    FOREIGN KEY (carnet_estudiante) REFERENCES Estudiantes(carnet),
    FOREIGN KEY (grado_anterior_id) REFERENCES Grados(id),
    FOREIGN KEY (grado_nuevo_id) REFERENCES Grados(id),
    FOREIGN KEY (trimestre_id) REFERENCES Trimestres(id)
);

-- 6. Función mejorada que incluye auditoría
CREATE OR REPLACE FUNCTION ejecutar_promocion_con_auditoria(
    p_trimestre_id INT,
    p_ciclo_escolar VARCHAR(10),
    p_nota_minima DECIMAL(5,2) DEFAULT 60.0,
    p_observaciones TEXT DEFAULT NULL
) RETURNS TABLE (
    total_estudiantes INT,
    promovidos INT,
    repiten INT,
    graduados INT,
    sin_seccion INT
) AS $$
DECLARE
    resultado_promocion RECORD;
    contador_promovidos INT := 0;
    contador_repiten INT := 0;
    contador_graduados INT := 0;
    contador_sin_seccion INT := 0;
    total_procesados INT := 0;
    grado_anterior_id INT;
    grado_nuevo_id INT;
BEGIN
    -- Ejecutar promociones
    FOR resultado_promocion IN 
        SELECT * FROM promover_estudiantes_por_trimestre(p_trimestre_id, p_nota_minima)
    LOOP
        total_procesados := total_procesados + 1;
        
        -- Obtener IDs de grados para auditoría
        SELECT gs.id_grado INTO grado_anterior_id
        FROM Estudiantes e
        INNER JOIN Grado_seccion gs ON e.id_grado_seccion = gs.id
        WHERE e.carnet = resultado_promocion.carnet_estudiante;
        
        -- Determinar grado nuevo ID
        IF resultado_promocion.estado_promocion = 'PROMOVIDO' THEN
            SELECT gs.id_grado INTO grado_nuevo_id
            FROM Estudiantes e
            INNER JOIN Grado_seccion gs ON e.id_grado_seccion = gs.id
            WHERE e.carnet = resultado_promocion.carnet_estudiante;
            contador_promovidos := contador_promovidos + 1;
        ELSIF resultado_promocion.estado_promocion = 'GRADUADO' THEN
            grado_nuevo_id := NULL;
            contador_graduados := contador_graduados + 1;
        ELSIF resultado_promocion.estado_promocion = 'REPITE' THEN
            grado_nuevo_id := grado_anterior_id;
            contador_repiten := contador_repiten + 1;
        ELSIF resultado_promocion.estado_promocion = 'SIN_SECCION' THEN
            grado_nuevo_id := grado_anterior_id;
            contador_sin_seccion := contador_sin_seccion + 1;
        END IF;
        
        -- Insertar en historial de auditoría
        INSERT INTO Historial_promociones (
            carnet_estudiante, grado_anterior_id, grado_nuevo_id, promedio_final,
            trimestre_id, ciclo_escolar, estado_promocion, observaciones
        ) VALUES (
            resultado_promocion.carnet_estudiante, grado_anterior_id, grado_nuevo_id, 
            resultado_promocion.promedio_final, p_trimestre_id, p_ciclo_escolar,
            resultado_promocion.estado_promocion, p_observaciones
        );
    END LOOP;
    
    -- Retornar estadísticas
    RETURN QUERY SELECT 
        total_procesados,
        contador_promovidos,
        contador_repiten,
        contador_graduados,
        contador_sin_seccion;
END;
$$ LANGUAGE plpgsql;

-- 7. Vista para consultar el estado actual de estudiantes
CREATE OR REPLACE VIEW vista_estudiantes_con_promedio AS
SELECT 
    e.carnet,
    e.nombre,
    e.apellido,
    g.grado,
    s.seccion,
    e.estado,
    COALESCE(ROUND(AVG(c.nota)::NUMERIC, 2), 0) as promedio_actual,
    COUNT(c.nota) as total_calificaciones,
    CASE 
        WHEN COALESCE(AVG(c.nota), 0) >= 60 THEN 'APTO_PROMOCION'
        ELSE 'RIESGO_REPETIR'
    END as estado_academico
FROM Estudiantes e
LEFT JOIN Grado_seccion gs ON e.id_grado_seccion = gs.id
LEFT JOIN Grados g ON gs.id_grado = g.id
LEFT JOIN Secciones s ON gs.id_seccion = s.id
LEFT JOIN Calificaciones c ON e.carnet = c.carnet_estudiante
WHERE e.estado = 'estudiante_activo'
GROUP BY e.carnet, e.nombre, e.apellido, g.grado, g.id, s.seccion, e.estado
ORDER BY g.id, s.seccion, e.apellido, e.nombre;

-- 8. Función para simular promociones (sin ejecutar cambios)
CREATE OR REPLACE FUNCTION simular_promociones(
    p_trimestre_id INT,
    p_nota_minima DECIMAL(5,2) DEFAULT 60.0
) RETURNS TABLE (
    carnet_estudiante VARCHAR(20),
    nombre_completo VARCHAR(101),
    grado_actual VARCHAR(50),
    promedio_calculado DECIMAL(5,2),
    resultado_simulado VARCHAR(20),
    accion_requerida VARCHAR(100)
) AS $$
DECLARE
    estudiante_record RECORD;
    promedio_estudiante DECIMAL(5,2);
    siguiente_grado INT;
    resultado VARCHAR(20);
    accion VARCHAR(100);
BEGIN
    FOR estudiante_record IN 
        SELECT DISTINCT e.carnet, e.nombre, e.apellido, gs.id_grado, g.grado as nombre_grado
        FROM Estudiantes e
        INNER JOIN Grado_seccion gs ON e.id_grado_seccion = gs.id
        INNER JOIN Grados g ON gs.id_grado = g.id
        WHERE e.estado = 'estudiante_activo'
    LOOP
        promedio_estudiante := calcular_promedio_estudiante(estudiante_record.carnet, p_trimestre_id);
        siguiente_grado := obtener_siguiente_grado(estudiante_record.id_grado);
        
        IF promedio_estudiante >= p_nota_minima THEN
            IF siguiente_grado IS NOT NULL THEN
                resultado := 'PROMOVERIA';
                accion := 'Pasaría al siguiente grado';
            ELSE
                resultado := 'GRADUARIA';
                accion := 'Se graduaría del sistema';
            END IF;
        ELSE
            resultado := 'REPETIRIA';
            accion := 'Repetiría el grado actual';
        END IF;
        
        RETURN QUERY SELECT 
            estudiante_record.carnet,
            estudiante_record.nombre || ' ' || estudiante_record.apellido,
            estudiante_record.nombre_grado,
            promedio_estudiante,
            resultado,
            accion;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- INSTRUCCIONES DE USO
-- ===================================

-- Para simular promociones sin ejecutar cambios:
-- SELECT * FROM simular_promociones(1, 60.0);

-- Para ejecutar promociones reales con auditoría:
-- SELECT * FROM ejecutar_promocion_con_auditoria(1, '2025', 60.0, 'Promoción automática trimestre 1');

-- Para ver el estado actual de estudiantes:
-- SELECT * FROM vista_estudiantes_con_promedio;

-- Para ver el historial de promociones:
-- SELECT * FROM Historial_promociones ORDER BY fecha_promocion DESC;