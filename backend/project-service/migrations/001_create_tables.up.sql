-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    fields JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    template_id VARCHAR(36) NOT NULL,
    field_values JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'Черновик',
    mentor_id INTEGER NOT NULL,
    creator_id INTEGER NOT NULL,
    max_slots INTEGER NOT NULL DEFAULT 0,
    company VARCHAR(100),
    course VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE RESTRICT
);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    priority INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Ожидает',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, student_id),
    UNIQUE(student_id, priority)
);

-- Create indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_mentor_id ON projects(mentor_id);
CREATE INDEX idx_projects_creator_id ON projects(creator_id);
CREATE INDEX idx_projects_company ON projects(company);
CREATE INDEX idx_projects_course ON projects(course);
CREATE INDEX idx_applications_student_id ON applications(student_id);
CREATE INDEX idx_applications_project_id ON applications(project_id);
CREATE INDEX idx_applications_status ON applications(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
