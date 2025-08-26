-- Add planification_files table for file uploads
-- This table stores metadata about files uploaded for planifications

CREATE TABLE IF NOT EXISTS planification_files (
    id SERIAL PRIMARY KEY,
    planification_id INTEGER NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    description TEXT,
    uploaded_by INTEGER NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_planification_files_planification_id 
        FOREIGN KEY (planification_id) REFERENCES planificaciones(id) ON DELETE CASCADE,
    CONSTRAINT fk_planification_files_uploaded_by 
        FOREIGN KEY (uploaded_by) REFERENCES maestros(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_planification_files_planification_id 
    ON planification_files(planification_id);
    
CREATE INDEX IF NOT EXISTS idx_planification_files_uploaded_by 
    ON planification_files(uploaded_by);
    
CREATE INDEX IF NOT EXISTS idx_planification_files_uploaded_at 
    ON planification_files(uploaded_at);

-- Add comments for documentation
COMMENT ON TABLE planification_files IS 'Stores metadata about files uploaded for planifications';
COMMENT ON COLUMN planification_files.planification_id IS 'Reference to the planification this file belongs to';
COMMENT ON COLUMN planification_files.file_name IS 'Unique file name stored in the system (with timestamp)';
COMMENT ON COLUMN planification_files.original_name IS 'Original file name uploaded by user';
COMMENT ON COLUMN planification_files.file_url IS 'URL or path to access the file';
COMMENT ON COLUMN planification_files.file_size IS 'File size in bytes';
COMMENT ON COLUMN planification_files.mime_type IS 'MIME type of the file (e.g., application/pdf)';
COMMENT ON COLUMN planification_files.description IS 'Optional description of the file';
COMMENT ON COLUMN planification_files.uploaded_by IS 'ID of the teacher who uploaded the file';
