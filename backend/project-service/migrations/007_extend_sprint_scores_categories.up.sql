-- Расширение sprint_scores категориями оценщиков.
--
-- Положение о ПП: итоговая оценка = Ментор(0.4)×КТУ + Трекер(0.3) +
-- Защита(0.2) + Peer(0.1). До этого изменения таблица хранила только
-- ментор-оценки (одна строка на (sprint, student)). Теперь храним
-- по одной строке на (sprint, student, category) — четыре источника:
-- mentor / tracker / defense / peer. КТУ имеет смысл только для
-- ментор-оценки.

ALTER TABLE sprint_scores
    ADD COLUMN IF NOT EXISTS category VARCHAR(20) NOT NULL DEFAULT 'mentor'
        CHECK (category IN ('mentor','tracker','defense','peer')),
    ADD COLUMN IF NOT EXISTS ktu REAL
        CHECK (ktu IS NULL OR (ktu >= 0 AND ktu <= 2));

ALTER TABLE sprint_scores
    DROP CONSTRAINT IF EXISTS sprint_scores_sprint_id_student_id_key;

ALTER TABLE sprint_scores
    ADD CONSTRAINT sprint_scores_sprint_student_category_key
        UNIQUE (sprint_id, student_id, category);
