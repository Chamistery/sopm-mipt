-- Откат миграции 008. DROP triggers + functions.
-- Удалённые orphan team_members не восстанавливаются (это были
-- невалидные данные и в новой модели не имеют права на жизнь).

BEGIN;

DROP TRIGGER IF EXISTS trg_applications_sync_team_members ON applications;
DROP FUNCTION IF EXISTS sync_team_members_from_applications();

DROP TRIGGER IF EXISTS trg_team_members_require_accepted_app ON team_members;
DROP FUNCTION IF EXISTS enforce_team_members_have_accepted_app();

COMMIT;
