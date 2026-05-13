-- Откат расширения sprint_scores категориями.

ALTER TABLE sprint_scores
    DROP CONSTRAINT IF EXISTS sprint_scores_sprint_student_category_key;

ALTER TABLE sprint_scores
    ADD CONSTRAINT sprint_scores_sprint_id_student_id_key
        UNIQUE (sprint_id, student_id);

ALTER TABLE sprint_scores
    DROP COLUMN IF EXISTS ktu,
    DROP COLUMN IF EXISTS category;
