-- Таблица «Защиты» — финальная защита проектов в конце семестра.
-- Pixel-port из admin.html (view-grading, tab «Защиты»): дата, место,
-- список проектов и экспертов. Привязки к проектам/экспертам — через
-- ассоциативные таблицы.
--
-- Защита — это календарное событие; в одну защиту входит несколько
-- проектов, каждый проект защищается одной или несколькими командами,
-- но команды берутся из project_id (без отдельного N-N с teams).
CREATE TABLE IF NOT EXISTS defenses (
    id           SERIAL PRIMARY KEY,
    title        VARCHAR(255) NOT NULL,
    starts_at    TIMESTAMP NOT NULL,
    ends_at      TIMESTAMP,
    location     VARCHAR(255),
    description  TEXT,
    semester_label VARCHAR(64),       -- «Весенний семестр 2025/2026»
    completed    BOOLEAN NOT NULL DEFAULT FALSE,
    created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS defense_projects (
    defense_id   INTEGER NOT NULL REFERENCES defenses(id) ON DELETE CASCADE,
    project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    PRIMARY KEY (defense_id, project_id)
);

CREATE TABLE IF NOT EXISTS defense_experts (
    defense_id   INTEGER NOT NULL REFERENCES defenses(id) ON DELETE CASCADE,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (defense_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_defenses_starts_at ON defenses(starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_defense_projects_project_id ON defense_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_defense_experts_user_id ON defense_experts(user_id);
