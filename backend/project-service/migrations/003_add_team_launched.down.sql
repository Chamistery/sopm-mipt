DROP INDEX IF EXISTS idx_teams_launched;
ALTER TABLE teams DROP COLUMN IF EXISTS launched;
