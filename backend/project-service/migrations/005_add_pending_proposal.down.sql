DROP INDEX IF EXISTS idx_projects_pending_changes;

ALTER TABLE projects
    DROP COLUMN IF EXISTS pending_submitted_by_id,
    DROP COLUMN IF EXISTS pending_submitted_at,
    DROP COLUMN IF EXISTS pending_proposal_data;
