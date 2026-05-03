ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS predecessor_project_id INTEGER NULL REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_predecessor_id ON projects(predecessor_project_id);
