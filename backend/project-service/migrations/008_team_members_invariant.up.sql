-- Инвариант: team_members(team_id, user_id) существует тогда и только
-- тогда, когда есть applications(student_id=user_id, team_id=team_id,
-- status='Принят'). Поддерживается двумя триггерами:
--   1) trg_team_members_require_accepted_app — BEFORE INSERT/UPDATE на
--      team_members проверяет, что accepted-заявка существует;
--   2) trg_applications_sync_team_members — AFTER INSERT/UPDATE/DELETE
--      на applications синхронизирует team_members в обе стороны.
--
-- Цель: closing of the gap, через который legacy-seed клал студентов
-- в команды без accepted-заявки (66 из 76 строк в demo-БД оказались
-- orphan'ами). После этой миграции БД сама не позволит таких
-- расхождений — независимо от того, кто пишет (Go-сервис, seed,
-- внешний clean-up, ручной psql).

BEGIN;

-- ─── Шаг 1: очистить существующие orphan'ы ─────────────────────────────
-- Без этого CREATE TRIGGER пройдёт, но первый же INSERT на этих
-- таблицах легко сломается. Кроме того, оставлять некорректные
-- данные нельзя — фронт по ним строит «студент в команде».
DELETE FROM team_members
WHERE NOT EXISTS (
    SELECT 1 FROM applications a
    WHERE a.student_id = team_members.user_id
      AND a.team_id = team_members.team_id
      AND a.status = 'Принят'
);

-- ─── Шаг 2: дописать team_members для всех accepted без записи ──────────
-- Если Go-сервис в какой-то момент пропустил AddMember (raceless код,
-- но defence-in-depth) — здесь устраняем.
INSERT INTO team_members (team_id, user_id)
SELECT a.team_id, a.student_id
FROM applications a
WHERE a.status = 'Принят'
  AND a.team_id IS NOT NULL
ON CONFLICT (team_id, user_id) DO NOTHING;

-- ─── Шаг 3: триггер 1 — защита от orphan team_members ──────────────────
CREATE OR REPLACE FUNCTION enforce_team_members_have_accepted_app()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM applications a
        WHERE a.student_id = NEW.user_id
          AND a.team_id = NEW.team_id
          AND a.status = 'Принят'
    ) THEN
        RAISE EXCEPTION 'team_members(team_id=%, user_id=%) requires applications(status=''Принят'', team_id=%) but none found',
            NEW.team_id, NEW.user_id, NEW.team_id
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_team_members_require_accepted_app
BEFORE INSERT OR UPDATE OF team_id, user_id ON team_members
FOR EACH ROW EXECUTE FUNCTION enforce_team_members_have_accepted_app();

-- ─── Шаг 4: триггер 2 — sync applications → team_members ───────────────
-- Сам делает INSERT/DELETE в team_members при переходах статуса заявки.
-- Триггер 1 в это время сработает на INSERT — увидит свежий статус
-- 'Принят' в той же транзакции и пропустит. Это безопасно: AFTER на
-- applications срабатывает до того, как BEFORE на team_members
-- проверит инвариант (мы INSERT'им в team_members уже после того,
-- как UPDATE applications зафиксировался в текущей транзакции).
CREATE OR REPLACE FUNCTION sync_team_members_from_applications()
RETURNS TRIGGER AS $$
BEGIN
    -- DELETE заявки: если была accepted — убрать из команды.
    IF TG_OP = 'DELETE' THEN
        IF OLD.status = 'Принят' AND OLD.team_id IS NOT NULL THEN
            DELETE FROM team_members
            WHERE team_id = OLD.team_id AND user_id = OLD.student_id;
        END IF;
        RETURN OLD;
    END IF;

    -- UPDATE: бывший accepted перестаёт им быть или меняет команду —
    -- старая запись team_members уже не валидна.
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'Принят' AND OLD.team_id IS NOT NULL
           AND (NEW.status <> 'Принят' OR NEW.team_id IS DISTINCT FROM OLD.team_id) THEN
            DELETE FROM team_members
            WHERE team_id = OLD.team_id AND user_id = OLD.student_id;
        END IF;
    END IF;

    -- INSERT или UPDATE: стал accepted в команде — гарантируем team_members.
    IF NEW.status = 'Принят' AND NEW.team_id IS NOT NULL THEN
        INSERT INTO team_members (team_id, user_id)
        VALUES (NEW.team_id, NEW.student_id)
        ON CONFLICT (team_id, user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_applications_sync_team_members
AFTER INSERT OR UPDATE OR DELETE ON applications
FOR EACH ROW EXECUTE FUNCTION sync_team_members_from_applications();

COMMIT;
