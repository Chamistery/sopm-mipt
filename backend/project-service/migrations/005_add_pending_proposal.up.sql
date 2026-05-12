-- Заявка на изменение существующего проекта. Ментор, отредактировавший
-- активный/опубликованный проект через view-create в режиме edit, кладёт
-- сюда «черновик» новой версии заявки. Это change request — сам проект
-- остаётся неизменным; координатор увидит pending и решит, применять или
-- отклонить (apply/reject — будет отдельный endpoint в задаче coordinator).
--
-- Зачем отдельные колонки, а не отдельная таблица change_requests:
--   * на проект единовременно — максимум одна pending-заявка (ментор
--     перезаписывает её, если передумал); множественные предложения не
--     нужны бизнес-логике;
--   * нет необходимости в истории — нет принятых/отклонённых записей;
--   * есть «свежий проект» и «pending изменение» — оба на одной строке
--     `projects`, что упрощает выдачу одним SELECT'ом.
--
-- pending_proposal_data — точно такая же структура, как `proposal_data`
-- (ProposalData в frontend/web/src/features/mentor-dashboard/lib/projectFormState.ts).
-- pending_submitted_by_id — кто отправил заявку (ментор или координатор
-- может проксировать в каких-то edge cases; пока — только ментор проекта).

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS pending_proposal_data JSONB,
    ADD COLUMN IF NOT EXISTS pending_submitted_at TIMESTAMP WITHOUT TIME ZONE,
    ADD COLUMN IF NOT EXISTS pending_submitted_by_id INTEGER REFERENCES users(id);

-- Частичный индекс — позволяет координатору быстро получить «все
-- проекты, ожидающие утверждения изменений» одним SELECT'ом.
CREATE INDEX IF NOT EXISTS idx_projects_pending_changes
    ON projects (pending_submitted_at)
    WHERE pending_proposal_data IS NOT NULL;
