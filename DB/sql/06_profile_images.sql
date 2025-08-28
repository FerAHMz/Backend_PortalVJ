-- SuperUsuarios
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'superusuarios' 
        AND column_name = 'profile_image_url'
    ) THEN
        ALTER TABLE SuperUsuarios ADD COLUMN profile_image_url VARCHAR(500) NULL;
        RAISE NOTICE 'Columna profile_image_url agregada a SuperUsuarios';
    ELSE
        RAISE NOTICE 'Columna profile_image_url ya existe en SuperUsuarios';
    END IF;
END $$;

-- Directores
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'directores' 
        AND column_name = 'profile_image_url'
    ) THEN
        ALTER TABLE Directores ADD COLUMN profile_image_url VARCHAR(500) NULL;
        RAISE NOTICE 'Columna profile_image_url agregada a Directores';
    ELSE
        RAISE NOTICE 'Columna profile_image_url ya existe en Directores';
    END IF;
END $$;

-- Maestros
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maestros' 
        AND column_name = 'profile_image_url'
    ) THEN
        ALTER TABLE Maestros ADD COLUMN profile_image_url VARCHAR(500) NULL;
        RAISE NOTICE 'Columna profile_image_url agregada a Maestros';
    ELSE
        RAISE NOTICE 'Columna profile_image_url ya existe en Maestros';
    END IF;
END $$;

-- Padres
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'padres' 
        AND column_name = 'profile_image_url'
    ) THEN
        ALTER TABLE Padres ADD COLUMN profile_image_url VARCHAR(500) NULL;
        RAISE NOTICE 'Columna profile_image_url agregada a Padres';
    ELSE
        RAISE NOTICE 'Columna profile_image_url ya existe en Padres';
    END IF;
END $$;

-- Administrativos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'administrativos' 
        AND column_name = 'profile_image_url'
    ) THEN
        ALTER TABLE Administrativos ADD COLUMN profile_image_url VARCHAR(500) NULL;
        RAISE NOTICE 'Columna profile_image_url agregada a Administrativos';
    ELSE
        RAISE NOTICE 'Columna profile_image_url ya existe en Administrativos';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'superusuarios' AND column_name = 'profile_image_url') THEN
        COMMENT ON COLUMN SuperUsuarios.profile_image_url IS 'URL de la imagen de perfil almacenada en Cloudflare R2';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'directores' AND column_name = 'profile_image_url') THEN
        COMMENT ON COLUMN Directores.profile_image_url IS 'URL de la imagen de perfil almacenada en Cloudflare R2';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maestros' AND column_name = 'profile_image_url') THEN
        COMMENT ON COLUMN Maestros.profile_image_url IS 'URL de la imagen de perfil almacenada en Cloudflare R2';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'padres' AND column_name = 'profile_image_url') THEN
        COMMENT ON COLUMN Padres.profile_image_url IS 'URL de la imagen de perfil almacenada en Cloudflare R2';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administrativos' AND column_name = 'profile_image_url') THEN
        COMMENT ON COLUMN Administrativos.profile_image_url IS 'URL de la imagen de perfil almacenada en Cloudflare R2';
    END IF;
END $$;
