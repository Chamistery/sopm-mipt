DROP INDEX IF EXISTS idx_projects_predecessor_id;

ALTER TABLE projects
    DROP COLUMN IF EXISTS predecessor_project_id;
