-- Drop triggers
DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_applications_status;
DROP INDEX IF EXISTS idx_applications_project_id;
DROP INDEX IF EXISTS idx_applications_student_id;
DROP INDEX IF EXISTS idx_projects_course;
DROP INDEX IF EXISTS idx_projects_company;
DROP INDEX IF EXISTS idx_projects_creator_id;
DROP INDEX IF EXISTS idx_projects_mentor_id;
DROP INDEX IF EXISTS idx_projects_status;

-- Drop tables
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS templates;
