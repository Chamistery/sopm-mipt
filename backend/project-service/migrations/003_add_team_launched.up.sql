-- Add launched flag to teams. Mirrors the prototype "Ожидает запуска"
-- placeholder cards on the mentor dashboard: a team can be formed
-- (имеет members + leader) but не запущена в работу.
ALTER TABLE teams
    ADD COLUMN IF NOT EXISTS launched BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_teams_launched ON teams(launched);
