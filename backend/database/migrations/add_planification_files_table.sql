-- Migration: Add planification_files table
-- This table stores information about files uploaded for planifications

CREATE TABLE IF NOT EXISTS planification_files (
    id SERIAL PRIMARY KEY,
    planification_id INTEGER NOT NULL,
    file_name VARCHAR(255) NOT NULL, -- File name in Cloudflare R2
    original_name VARCHAR(255) NOT NULL, -- Original file name
    file_url TEXT NOT NULL, -- Full URL to access the file
    file_size BIGINT NOT NULL, -- File size in bytes
    mime_type VARCHAR(100) NOT NULL, -- MIME type (application/pdf, etc.)
    description TEXT, -- Optional description
    uploaded_by INTEGER NOT NULL, -- User ID who uploaded the file
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_planification_files_planification 
        FOREIGN KEY (planification_id) 
        REFERENCES Planificaciones(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_planification_files_user 
        FOREIGN KEY (uploaded_by) 
        REFERENCES usuarios(id) 
        ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_planification_files_planification_id ON planification_files(planification_id);
CREATE INDEX idx_planification_files_uploaded_by ON planification_files(uploaded_by);
CREATE INDEX idx_planification_files_uploaded_at ON planification_files(uploaded_at);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_planification_files_updated_at 
    BEFORE UPDATE ON planification_files 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE planification_files IS 'Stores information about files uploaded for course planifications';
COMMENT ON COLUMN planification_files.file_name IS 'Unique file name stored in Cloudflare R2';
COMMENT ON COLUMN planification_files.original_name IS 'Original file name as uploaded by user';
COMMENT ON COLUMN planification_files.file_url IS 'Public URL to access the file from Cloudflare R2';
COMMENT ON COLUMN planification_files.file_size IS 'File size in bytes';
COMMENT ON COLUMN planification_files.mime_type IS 'MIME type of the file (e.g., application/pdf)';
COMMENT ON COLUMN planification_files.description IS 'Optional description provided by the teacher';
COMMENT ON COLUMN planification_files.uploaded_by IS 'ID of the user (teacher) who uploaded the file';
