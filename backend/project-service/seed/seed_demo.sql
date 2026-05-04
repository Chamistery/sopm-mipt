-- Demo seed data for СУПП ВШПИ МФТИ.
--
-- Run via `make seed` from repo root. Idempotent — safe to re-run.
-- Mirrors what the frontend prototypes / Storybook stories show:
-- mentor "Тимохин В.Н.", coordinator "Петров К.А.", 4 students forming
-- one team in an active project running its 2nd sprint of 3.
--
-- Dashboard fixture: 6 active projects + 1 archived predecessor; mirrors
-- the projects array in /home/alex/MIPT_Project_Management_System/common.js
-- (see prototype mentor.html view-dashboard).

-- Defensive ALTERs: keep `make seed` runnable on volumes that already
-- ran 001+002 but not 003. No-op when migration 003 has been applied.
ALTER TABLE teams
    ADD COLUMN IF NOT EXISTS launched BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS predecessor_project_id INTEGER NULL REFERENCES projects(id) ON DELETE SET NULL;

-- ─── Users ──────────────────────────────────────────────────────────────
INSERT INTO users (id, first_name, last_name, middle_name, email, role, company, course, "group", gpa, direction) VALUES
  (1,  'Владимир',  'Тимохин',    'Николаевич', 'timokhin@mipt.ru',   'mentor',      'МФТИ', NULL,    NULL,      NULL, 'КТ'),
  (2,  'Константин','Петров',     'Алексеевич', 'petrov@mipt.ru',     'coordinator', 'МФТИ', NULL,    NULL,      NULL, NULL),
  (3,  'Александр', 'Стародубов', 'Юрьевич',    'starodubov@mipt.ru', 'student',     NULL,   '2',     'Б05-211',  7.2, 'ПИ'),
  (4,  'Михаил',    'Кузнецов',   'Игоревич',   'kuznetsov@mipt.ru',  'student',     NULL,   '2',     'Б05-212',  6.8, 'ПИ'),
  (5,  'Наталья',   'Лебедева',   'Сергеевна',  'lebedeva@mipt.ru',   'student',     NULL,   '2',     'Б05-211',  8.1, 'ПИ'),
  (6,  'Дмитрий',   'Волков',     'Андреевич',  'volkov@mipt.ru',     'student',     NULL,   '2',     'Б05-213',  5.9, 'ПИ'),
  -- Dashboard team leaders / members. Imitate prototype `common.js` names.
  (10, 'Дмитрий',   'Козлов',     'Сергеевич',  'kozlov@mipt.ru',     'student',     NULL,   '2',     'Б05-221',  7.0, 'ПИ'),
  (11, 'Екатерина', 'Петрова',    'Игоревна',   'petrova@mipt.ru',    'student',     NULL,   '2',     'Б05-222',  7.5, 'ПИ'),
  (12, 'Мария',     'Иванова',    'Дмитриевна', 'ivanova-m@mipt.ru',  'student',     NULL,   '2',     'Б05-223',  7.8, 'ПИ'),
  (13, 'Кирилл',    'Сидоров',    'Олегович',   'sidorov-k@mipt.ru',  'student',     NULL,   '2',     'Б05-224',  6.4, 'ПИ'),
  (14, 'Антон',     'Новиков',    'Юрьевич',    'novikov@mipt.ru',    'student',     NULL,   '2',     'Б05-225',  7.6, 'ПИ'),
  (15, 'Светлана',  'Белова',     'Андреевна',  'belova@mipt.ru',     'student',     NULL,   '2',     'Б05-226',  8.2, 'ПИ'),
  (16, 'Иван',      'Фёдоров',    'Викторович', 'fedorov-i@mipt.ru',  'student',     NULL,   '2',     'Б05-227',  6.9, 'ПИ'),
  (17, 'Виктория',  'Орлова',     'Сергеевна',  'orlova@mipt.ru',     'student',     NULL,   '2',     'Б05-228',  7.1, 'ПИ'),
  (18, 'Пётр',      'Григорьев',  'Андреевич',  'grigoriev@mipt.ru',  'student',     NULL,   '2',     'Б05-229',  6.6, 'ПИ'),
  (19, 'Лариса',    'Морозова',   'Васильевна', 'morozova@mipt.ru',   'student',     NULL,   '2',     'Б05-230',  8.0, 'ПИ'),
  (20, 'Никита',    'Тарасов',    'Михайлович', 'tarasov@mipt.ru',    'student',     NULL,   '2',     'Б05-231',  6.3, 'ПИ')
ON CONFLICT (email) DO NOTHING;

SELECT setval('users_id_seq', GREATEST((SELECT MAX(id) FROM users), 1));

-- Extended profile for the team lead so the profile page is non-empty.
INSERT INTO user_profiles (user_id, telegram, phone, about, skills, links) VALUES
  (3, '@starodubov_a', '+7 999 123-45-67',
      'Backend-разработчик, интересуюсь DevOps. Владею Python, Django, PostgreSQL, Docker.',
      '["Python","Django","PostgreSQL","Docker","REST API"]'::jsonb,
      '[{"type":"GitLab","url":"https://gitlab.com/starodubov"},{"type":"GitHub","url":"https://github.com/starodubov-a"}]'::jsonb)
ON CONFLICT (user_id) DO NOTHING;

-- ─── Projects ───────────────────────────────────────────────────────────
-- Predecessor projects (archived). Used by `Открыть предшественника` ссылка.
INSERT INTO projects (
  id, title, status, mentor_id, company, courses,
  description, technologies, team_size_min, team_size_max, num_teams, min_gpa,
  duration_semesters, predecessor_project_id, created_at
) VALUES
  (100, 'Система управления проектным практикумом ВШПИ (1 семестр)',
        'Завершён', 1, 'МФТИ', '{2,4}',
        'Первый семестр инициативы: каркас, авторизация, прототипы UI.',
        '["Go","React","TypeScript","PostgreSQL"]'::jsonb,
        3, 5, 2, 5.0, 2, NULL, '2025-09-01 09:00:00'),
  (101, 'Сервис статического анализа студенческого кода (MVP)',
        'Завершён', 1, 'МФТИ', '{2,3}',
        'MVP сервиса: AST, 15 правил, GitLab CI.',
        '["Python","AST","Docker","GitLab API"]'::jsonb,
        3, 4, 1, 5.0, 2, NULL, '2025-09-01 09:00:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (
  id, title, status, mentor_id, company, courses,
  description, full_description, technologies,
  team_size_min, team_size_max, num_teams, min_gpa,
  goal, expected_result, acceptance_criteria, competencies, edu_result,
  duration_semesters, predecessor_project_id, created_at
) VALUES
  (1,
   'Система управления проектным практикумом ВШПИ',
   'Активный', 1, 'МФТИ', '{2,4}',
   'Веб-система для управления дисциплиной «Проектный практикум». Автоматизирует подачу заявок, распределение, спринты, отчётность, защиту.',
   'Полный цикл управления ПП: личные кабинеты ролей, каталог проектов, заявки, формирование команд, спринты с задачами и Гант-диаграммой, командные и индивидуальные отчёты, оценивание ментором, итоговая защита экспертами.',
   '["Go","React","TypeScript","PostgreSQL","Docker","nginx"]'::jsonb,
   3, 5, 4, 5.0,
   'Автоматизация всех процессов проектного практикума ВШПИ.',
   'Развёрнутая на VDI МФТИ веб-система со всеми ролями и процессами.',
   'Покрытие тестами ≥ 70%. Все ключевые сценарии (распределение, спринты, задачи, отчёты) покрыты API.',
   'Backend (Go), Frontend (React), DevOps (Docker, nginx).',
   'Студенты получают опыт работы в распределённой команде, освоение современного стека и DevOps-практик.',
   2, 100, '2026-02-15 09:00:00'),
  (2,
   'Платформа автоматизации тестирования ПО',
   'Активный', 1, 'Яндекс', '{2,3}',
   'Платформа для автоматизации регрессионного тестирования веб-сервисов с генерацией отчётов.',
   'YAML-сценарии, расписание, отчёты покрытия.',
   '["Python","FastAPI","Selenium","Docker"]'::jsonb,
   4, 5, 2, 5.5, NULL, NULL, NULL, NULL, NULL,
   1, NULL, '2026-02-15 10:00:00'),
  (3,
   'Рекомендательная система подбора элективных курсов',
   'Активный', 1, 'МФТИ', '{2,3}',
   'ML-система для персонализированных рекомендаций элективов на основе профиля студента.',
   'NDCG@5 ≥ 0.65, объяснимость рекомендаций.',
   '["Python","scikit-learn","FastAPI","React"]'::jsonb,
   3, 5, 4, 5.0, NULL, NULL, NULL, NULL, NULL,
   1, NULL, '2026-02-15 11:00:00'),
  (4,
   'Мобильное приложение расписания МФТИ',
   'Активный', 1, 'Т-Банк', '{2}',
   'Кроссплатформенное мобильное приложение с расписанием, уведомлениями и интеграцией с LMS.',
   'Офлайн-расписание, push-уведомления, оценки из LMS.',
   '["React Native","TypeScript","Node.js","Firebase"]'::jsonb,
   3, 4, 1, 5.0, NULL, NULL, NULL, NULL, NULL,
   2, NULL, '2026-03-05 09:00:00'),
  (5,
   'Сервис статического анализа студенческого кода',
   'Активный', 1, 'МФТИ', '{2,3}',
   'Инструмент для автоматической проверки качества кода с интеграцией в GitLab CI/CD.',
   '40+ правил, AutoFix для 20+, ложноположительных < 5%.',
   '["Python","AST","GitLab API","Docker"]'::jsonb,
   3, 4, 3, 5.0, NULL, NULL, NULL, NULL, NULL,
   2, 101, '2026-02-15 12:00:00'),
  (6,
   'Модуль анализа успеваемости студентов',
   'Черновик', 1, 'МФТИ', '{2}',
   'Веб-модуль для отображения успеваемости студентов с дашбордами и прогнозом.',
   '',
   '["Python","Django","React"]'::jsonb,
   3, 4, 1, 5.0, NULL, NULL, NULL, NULL, NULL,
   1, NULL, '2026-03-25 14:00:00')
ON CONFLICT (id) DO NOTHING;

SELECT setval('projects_id_seq', GREATEST((SELECT MAX(id) FROM projects), 1));

-- Update the canonical demo project (id=1) to point at its archive
-- predecessor (id=100). Idempotent: won't change anything once set.
UPDATE projects
   SET predecessor_project_id = 100,
       duration_semesters = 2,
       num_teams = GREATEST(num_teams, 4)
 WHERE id = 1;

-- ─── Teams ──────────────────────────────────────────────────────────────
-- Project 1 — СУПП: 3 команды launched + 1 ожидает запуска (id=4).
-- Project 2 — Тестирование ПО: 2 команды
-- Project 3 — Рекомендательная: 4 команды
-- Project 4 — Мобильное расписание: 1 команда
-- Project 5 — Стат. анализ: 2 команды + 1 launched=false
-- Project 6 — Черновик: команд нет
INSERT INTO teams (id, project_id, name, leader_id, launched) VALUES
  (1,  1, 'Команда 1', 3,  TRUE),
  (2,  1, 'Команда 2', 10, TRUE),
  (3,  1, 'Команда 3', 11, TRUE),
  (4,  1, 'Команда 4', 12, FALSE),
  (5,  2, 'Команда 1', 12, TRUE),
  (6,  2, 'Команда 2', 13, TRUE),
  (7,  3, 'Команда 1', 14, TRUE),
  (8,  3, 'Команда 2', 15, TRUE),
  (9,  3, 'Команда 3', 16, TRUE),
  (10, 3, 'Команда 4', 17, TRUE),
  (11, 4, 'Команда 1', 18, TRUE),
  (12, 5, 'Команда 1', 19, TRUE),
  (13, 5, 'Команда 2', 20, TRUE),
  (14, 5, 'Команда 3', 13, FALSE)
ON CONFLICT (id) DO NOTHING;

SELECT setval('teams_id_seq', GREATEST((SELECT MAX(id) FROM teams), 1));

-- Team 1 (СУПП Команда 1) — наша основная демо-команда (4 чел., прежний состав).
INSERT INTO team_members (team_id, user_id, role_in_team) VALUES
  (1, 3, 'Backend-разработчик'),
  (1, 4, 'Frontend-разработчик'),
  (1, 5, 'Аналитик'),
  (1, 6, 'Тестировщик'),
  -- Прочие команды — синтетические составы (имена/роли с прицелом на лидеров).
  (2, 10, 'Тимлид'), (2, 13, 'Backend'), (2, 16, 'Frontend'),
  (3, 11, 'Тимлид'), (3, 14, 'Backend'), (3, 17, 'Frontend'), (3, 18, 'QA'), (3, 19, 'Аналитик'),
  (4, 12, 'Тимлид'), (4, 15, 'Backend'),
  (5, 12, 'Тимлид'), (5, 14, 'Backend'), (5, 16, 'QA'), (5, 17, 'Frontend'), (5, 19, 'DevOps'),
  (6, 13, 'Тимлид'), (6, 18, 'Backend'), (6, 20, 'Frontend'), (6, 11, 'Аналитик'),
  (7, 14, 'Тимлид'), (7, 11, 'ML'), (7, 16, 'Backend'), (7, 18, 'Frontend'),
  (8, 15, 'Тимлид'), (8, 19, 'ML'), (8, 17, 'Backend'),
  (9, 16, 'Тимлид'), (9, 12, 'ML'), (9, 13, 'Backend'), (9, 11, 'Frontend'), (9, 19, 'Аналитик'),
  (10, 17, 'Тимлид'), (10, 14, 'ML'), (10, 18, 'Backend'), (10, 20, 'QA'),
  (11, 18, 'Тимлид'), (11, 10, 'iOS'), (11, 11, 'Android'), (11, 13, 'Backend'), (11, 16, 'QA'),
  (12, 19, 'Тимлид'), (12, 13, 'Backend'), (12, 17, 'DevOps'),
  (13, 20, 'Тимлид'), (13, 12, 'Backend'), (13, 14, 'Frontend'), (13, 18, 'QA'),
  (14, 13, 'Тимлид'), (14, 15, 'Backend'), (14, 19, 'Frontend')
ON CONFLICT (team_id, user_id) DO NOTHING;

-- ─── Applications (only for the demo team — others created without заявок) ─
INSERT INTO applications (project_id, student_id, priority, status, team_id) VALUES
  (1, 3, 1, 'Принят', 1),
  (1, 4, 1, 'Принят', 1),
  (1, 5, 1, 'Принят', 1),
  (1, 6, 1, 'Принят', 1)
ON CONFLICT (project_id, student_id) DO NOTHING;

-- ─── Sprints ────────────────────────────────────────────────────────────
-- Project 1 — 5 sprints x 3 weeks; sprint 2 active.
-- Project 2 — 4 sprints x 2 weeks; sprint 3 active.
-- Project 3 — 6 sprints x 2 weeks; sprint 2 active.
-- Project 4 — 5 sprints x 3 weeks; sprint 1 active.
-- Project 5 — 3 sprints x 4 weeks; sprint 2 active.
INSERT INTO sprints (id, project_id, number, start_date, end_date, status) VALUES
  -- Project 1
  (1,  1, 1, '2026-02-24', '2026-03-16', 'Завершён'),
  (2,  1, 2, '2026-03-17', '2026-04-06', 'Активный'),
  (3,  1, 3, '2026-04-07', '2026-04-27', 'Запланирован'),
  (4,  1, 4, '2026-04-28', '2026-05-18', 'Запланирован'),
  (5,  1, 5, '2026-05-19', '2026-06-08', 'Запланирован'),
  -- Project 2
  (6,  2, 1, '2026-02-24', '2026-03-09', 'Завершён'),
  (7,  2, 2, '2026-03-10', '2026-03-23', 'Завершён'),
  (8,  2, 3, '2026-03-24', '2026-04-06', 'Активный'),
  (9,  2, 4, '2026-04-07', '2026-04-20', 'Запланирован'),
  -- Project 3
  (10, 3, 1, '2026-03-03', '2026-03-16', 'Завершён'),
  (11, 3, 2, '2026-03-17', '2026-03-30', 'Активный'),
  (12, 3, 3, '2026-03-31', '2026-04-13', 'Запланирован'),
  (13, 3, 4, '2026-04-14', '2026-04-27', 'Запланирован'),
  (14, 3, 5, '2026-04-28', '2026-05-11', 'Запланирован'),
  (15, 3, 6, '2026-05-12', '2026-05-25', 'Запланирован'),
  -- Project 4
  (16, 4, 1, '2026-03-10', '2026-03-30', 'Активный'),
  (17, 4, 2, '2026-03-31', '2026-04-20', 'Запланирован'),
  (18, 4, 3, '2026-04-21', '2026-05-11', 'Запланирован'),
  (19, 4, 4, '2026-05-12', '2026-06-01', 'Запланирован'),
  (20, 4, 5, '2026-06-02', '2026-06-22', 'Запланирован'),
  -- Project 5
  (21, 5, 1, '2026-02-10', '2026-03-09', 'Завершён'),
  (22, 5, 2, '2026-03-10', '2026-04-06', 'Активный'),
  (23, 5, 3, '2026-04-07', '2026-05-04', 'Запланирован')
ON CONFLICT (project_id, number) DO NOTHING;

SELECT setval('sprints_id_seq', GREATEST((SELECT MAX(id) FROM sprints), 1));

-- ─── Tasks for sprint 2 (the active one) ────────────────────────────────
-- mix of statuses so the Gantt chart shows realistic data
INSERT INTO tasks (sprint_id, team_id, assignee_id, created_by_id, name, description, status, hours_estimate, start_date, end_date, mr_link, work_description, mentor_comments, history) VALUES
  -- Стародубов (id=3) — Backend
  (2, 1, 3, 3, 'API управления проектами',     'CRUD-операции для проектов', 'Готово',     12, '2026-03-17', '2026-03-23', '!42', 'Реализовал REST API с 7 эндпоинтами, покрытие тестами 85%.',
   '[{"action":"Аппрув","text":"Задача понятная."},{"action":"Принятие","text":"Отличная работа."}]'::jsonb,
   '[{"day":5,"event":"review"},{"day":6,"event":"accepted"}]'::jsonb),

  (2, 1, 3, 3, 'Модуль авторизации',           'JWT + middleware + роли',    'Готово',     10, '2026-03-24', '2026-03-30', '!45', 'JWT auth с ролевой моделью.',
   '[{"action":"Аппрув","text":""},{"action":"Принятие","text":"Хорошо."}]'::jsonb,
   '[{"day":12,"event":"review"},{"day":13,"event":"accepted"}]'::jsonb),

  (2, 1, 3, 3, 'Сервис распределения',         'Алгоритм распределения студентов', 'В работе', 16, '2026-03-31', '2026-04-10', NULL, NULL,
   '[{"action":"Аппрув","text":""}]'::jsonb, '[]'::jsonb),

  (2, 1, 3, 3, 'Миграции БД v2',               'Новые таблицы для спринтов и задач', 'На ревью', 6, '2026-03-20', '2026-03-22', '!43', 'Миграции для 8 таблиц.',
   '[{"action":"Аппрув","text":""}]'::jsonb,
   '[{"day":6,"event":"review"}]'::jsonb),

  -- Кузнецов (id=4) — Frontend
  (2, 1, 4, 4, 'Компонент каталога проектов',  'React-компонент каталога с фильтрами', 'Готово', 10, '2026-03-17', '2026-03-25', '!51', 'Каталог с карточками и фильтрами.',
   '[{"action":"Аппрув","text":""},{"action":"Принятие","text":""}]'::jsonb,
   '[{"day":7,"event":"review"},{"day":8,"event":"accepted"}]'::jsonb),

  (2, 1, 4, 4, 'Диаграмма Ганта',              'Интерактивная диаграмма с drag-and-drop', 'В работе', 14, '2026-03-26', '2026-04-08', NULL, NULL,
   '[{"action":"Аппрув","text":""}]'::jsonb, '[]'::jsonb),

  (2, 1, 4, 3, 'Дашборд ментора',              'Страница дашборда ментора', 'Назначена', 8, '2026-04-09', '2026-04-13', NULL, NULL,
   '[{"action":"Аппрув","text":""}]'::jsonb, '[]'::jsonb),

  -- Лебедева (id=5) — Аналитик
  (2, 1, 5, 5, 'Анализ требований',            'Спецификация на основе Положения о ПП', 'Готово', 8, '2026-03-17', '2026-03-21', NULL, 'Подготовлена спецификация на 12 страниц.',
   '[{"action":"Аппрув","text":""},{"action":"Принятие","text":"Отлично."}]'::jsonb,
   '[{"day":4,"event":"review"},{"day":5,"event":"accepted"}]'::jsonb),

  (2, 1, 5, 5, 'Проектирование API',           'OpenAPI 3.0 спецификация',     'Готово',  6, '2026-03-22', '2026-03-28', NULL, 'OpenAPI 3.0 спецификация.',
   '[{"action":"Аппрув","text":""},{"action":"Принятие","text":""}]'::jsonb,
   '[{"day":10,"event":"review"},{"day":11,"event":"accepted"}]'::jsonb),

  (2, 1, 5, 5, 'Тестовые сценарии',            'Описание тест-кейсов для всех модулей', 'В работе', 10, '2026-03-29', '2026-04-08', NULL, NULL,
   '[{"action":"Аппрув","text":""}]'::jsonb, '[]'::jsonb),

  -- Волков (id=6) — Тестировщик / DevOps
  (2, 1, 6, 6, 'Настройка CI/CD',              'GitHub Actions + Docker',     'Готово',   8, '2026-03-17', '2026-03-23', '!30', 'Пайплайн: lint, test, build, deploy.',
   '[{"action":"Аппрув","text":""},{"action":"Принятие","text":""}]'::jsonb,
   '[{"day":5,"event":"review"},{"day":6,"event":"accepted"}]'::jsonb)
ON CONFLICT DO NOTHING;

-- ─── Team reports — mirror iter-track из прототипа (mentor.html:670-737) ─
-- P1.T1: reviewed, pending-review (s1=Проверен, s2=Отправлен)
-- P1.T2: reviewed, current        (s1=Проверен)
-- P1.T3: reviewed, reviewed       (s1=Проверен, s2=Проверен)
-- P2.T5: reviewed, reviewed, current (s6=Проверен, s7=Проверен)
-- P2.T6: missed, reviewed, pending-review (s7=Проверен, s8=Отправлен)
-- P3.T7: reviewed, reviewed       (s10=Проверен, s11=Проверен)
-- P3.T8: reviewed, pending-review (s10=Проверен, s11=Отправлен)
-- P3.T9: reviewed, current        (s10=Проверен)
-- P3.T10: missed, current
-- P5.T12: reviewed, pending-review (s21=Проверен, s22=Отправлен)
INSERT INTO team_reports (sprint_id, team_id, summary, problems, next_plan, status, mentor_comment, submitted_at, reviewed_at) VALUES
  (1, 1,
    'Развёрнут backend-каркас, базовые CRUD-эндпоинты, Docker-окружение. Frontend-команда подняла Vite + React + TS, перенесла каталог проектов на новый стек.',
    'Был простой 2 дня из-за проблем доступа к VDI. Аналитик догнал спецификацию в выходные.',
    'Реализовать модуль авторизации, страницу команды с Гант-диаграммой, командный отчёт.',
    'Проверен',
    'Хорошая работа на старте. Правильный выбор Django. Увеличьте покрытие тестами до 70%.',
    '2026-03-15 18:00:00', '2026-03-16 10:00:00'),
  (2, 1, 'Спринт 2 в работе: модуль авторизации, частично команда.', '', '', 'Отправлен', NULL, '2026-04-05 17:00:00', NULL),
  (1, 2, 'Готов прототип распределения.', '', '', 'Проверен', 'OK', '2026-03-15 12:00:00', '2026-03-16 09:00:00'),
  (1, 3, 'API заявок и основных списков.', '', '', 'Проверен', 'OK', '2026-03-15 14:00:00', '2026-03-16 11:00:00'),
  (2, 3, 'Завершили UI команды.', '', '', 'Проверен', 'OK', '2026-04-05 13:00:00', '2026-04-06 08:00:00'),
  (6, 5, 'Первый спринт ОК.', '', '', 'Проверен', 'OK', '2026-03-08 10:00:00', '2026-03-09 09:00:00'),
  (7, 5, 'YAML-сценарии готовы.', '', '', 'Проверен', 'OK', '2026-03-22 10:00:00', '2026-03-23 09:00:00'),
  (7, 6, 'Догнали отставание.', '', '', 'Проверен', 'OK', '2026-03-22 11:00:00', '2026-03-23 10:00:00'),
  (8, 6, 'Спринт 3 в ревью.', '', '', 'Отправлен', NULL, '2026-04-05 17:00:00', NULL),
  (10, 7, 'Базовая ML-модель.', '', '', 'Проверен', 'OK', '2026-03-15 12:00:00', '2026-03-16 09:00:00'),
  (11, 7, 'Уточнили факторы.', '', '', 'Проверен', 'OK', '2026-03-29 13:00:00', '2026-03-30 09:00:00'),
  (10, 8, 'Идея и каркас.', '', '', 'Проверен', 'OK', '2026-03-15 13:00:00', '2026-03-16 09:00:00'),
  (11, 8, 'Прототип в ревью.', '', '', 'Отправлен', NULL, '2026-03-29 18:00:00', NULL),
  (10, 9, 'Сбор данных.', '', '', 'Проверен', 'OK', '2026-03-15 14:00:00', '2026-03-16 09:00:00'),
  (21, 12, 'AST-расширение готово.', '', '', 'Проверен', 'OK', '2026-03-08 12:00:00', '2026-03-09 09:00:00'),
  (22, 12, 'AutoFix в ревью.', '', '', 'Отправлен', NULL, '2026-04-05 17:00:00', NULL)
ON CONFLICT (sprint_id, team_id) DO NOTHING;

-- ─── Meetings — для команды 1 проекта 1 (СУПП). ─────────────────────────
-- 2 предстоящие (одна ждёт подтверждения от ментора, одна назначена ментором)
-- + 2 прошедшие со summary. ID прописываем явно ради идемпотентности —
-- ON CONFLICT (id) DO NOTHING пропустит повторный seed.
INSERT INTO meetings (
  id, team_id, sprint_id, title, description, meeting_date, start_time,
  duration_minutes, conference_link, created_by_id, mentor_confirmed,
  confirmed_at, summary, status
) VALUES
  (1, 1, 2,
   'Обзор спринта 2',
   'Обсуждение результатов спринта 2. Демо работающего API и макета дашборда. Планирование спринта 3.',
   '2026-04-01', '16:00:00', 60,
   'https://zoom.us/j/9876543210', 3, NULL, NULL, NULL,
   'Ожидает подтверждения'),
  (2, 1, 3,
   'Постановка спринта 3',
   'Постановка задач на спринт 3. Распределение ролей, уточнение приоритетов.',
   '2026-04-08', '15:00:00', 45,
   NULL, 1, TRUE, '2026-03-30 10:00:00', NULL,
   'Подтверждена'),
  (3, 1, 2,
   'Постановка спринта 2',
   'Установочная встреча второго спринта.',
   '2026-03-17', '16:00:00', 60,
   NULL, 1, TRUE, '2026-03-16 12:00:00',
   'Определены приоритеты: OAuth-авторизация, API проектов, макет дашборда. Стародубов берёт бэкенд, Кузнецов — фронт. Лебедева готовит Swagger-спецификацию до конца первой недели. Волков начинает с тестов для Auth модуля.',
   'Состоялась'),
  (4, 1, 1,
   'Обзор спринта 1',
   'Демонстрация результатов первого спринта.',
   '2026-03-14', '16:00:00', 45,
   NULL, 1, TRUE, '2026-03-13 12:00:00',
   'Демо структуры проекта и прототипа UI. Обсуждён выбор Django vs FastAPI — решили остаться на Django. Ментор рекомендовал увеличить покрытие тестами до 70%.',
   'Состоялась')
ON CONFLICT (id) DO NOTHING;

SELECT setval('meetings_id_seq', GREATEST((SELECT MAX(id) FROM meetings), 1));

-- ─── Done ───────────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM users)         AS users,
  (SELECT COUNT(*) FROM projects)      AS projects,
  (SELECT COUNT(*) FROM teams)         AS teams,
  (SELECT COUNT(*) FROM team_members)  AS team_members,
  (SELECT COUNT(*) FROM applications)  AS applications,
  (SELECT COUNT(*) FROM sprints)       AS sprints,
  (SELECT COUNT(*) FROM tasks)         AS tasks,
  (SELECT COUNT(*) FROM team_reports)  AS team_reports,
  (SELECT COUNT(*) FROM meetings)      AS meetings;
