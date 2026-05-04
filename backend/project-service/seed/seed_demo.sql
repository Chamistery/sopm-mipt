-- Demo seed data for СУПП ВШПИ МФТИ.
--
-- Run via `make seed` from repo root. Idempotent — safe to re-run.
-- Mirrors what the frontend prototypes / Storybook stories show:
-- mentor "Тимохин В.Н.", coordinator "Петров К.А.", 4 students forming
-- one team in an active project running its 2nd sprint of 3.

-- ─── Users ──────────────────────────────────────────────────────────────
INSERT INTO users (id, first_name, last_name, middle_name, email, role, company, course, "group", gpa, direction) VALUES
  (1, 'Владимир', 'Тимохин',   'Николаевич', 'timokhin@mipt.ru',   'mentor',      'МФТИ', NULL,    NULL,      NULL, 'КТ'),
  (2, 'Константин','Петров',   'Алексеевич', 'petrov@mipt.ru',     'coordinator', 'МФТИ', NULL,    NULL,      NULL, NULL),
  (3, 'Александр','Стародубов','Юрьевич',    'starodubov@mipt.ru', 'student',     NULL,   '2',     'Б05-211',  7.2, 'ПИ'),
  (4, 'Михаил',   'Кузнецов',  'Игоревич',   'kuznetsov@mipt.ru',  'student',     NULL,   '2',     'Б05-212',  6.8, 'ПИ'),
  (5, 'Наталья',  'Лебедева',  'Сергеевна',  'lebedeva@mipt.ru',   'student',     NULL,   '2',     'Б05-211',  8.1, 'ПИ'),
  (6, 'Дмитрий',  'Волков',    'Андреевич',  'volkov@mipt.ru',     'student',     NULL,   '2',     'Б05-213',  5.9, 'ПИ')
ON CONFLICT (email) DO NOTHING;

SELECT setval('users_id_seq', GREATEST((SELECT MAX(id) FROM users), 1));

-- Extended profile for the team lead so the profile page is non-empty.
INSERT INTO user_profiles (user_id, telegram, phone, about, skills, links) VALUES
  (3, '@starodubov_a', '+7 999 123-45-67',
      'Backend-разработчик, интересуюсь DevOps. Владею Python, Django, PostgreSQL, Docker.',
      '["Python","Django","PostgreSQL","Docker","REST API"]'::jsonb,
      '[{"type":"GitLab","url":"https://gitlab.com/starodubov"},{"type":"GitHub","url":"https://github.com/starodubov-a"}]'::jsonb)
ON CONFLICT (user_id) DO NOTHING;

-- ─── Project ────────────────────────────────────────────────────────────
INSERT INTO projects (
  id, title, status, mentor_id, company, courses,
  description, full_description, technologies,
  team_size_min, team_size_max, num_teams, min_gpa,
  goal, expected_result, acceptance_criteria, competencies, edu_result,
  duration_semesters
) VALUES (1,
  'Система управления проектным практикумом ВШПИ',
  'Активный', 1, 'МФТИ', '{2,4}',
  'Веб-система для управления дисциплиной «Проектный практикум». Автоматизирует подачу заявок, распределение, спринты, отчётность, защиту.',
  'Полный цикл управления ПП: личные кабинеты ролей, каталог проектов, заявки, формирование команд, спринты с задачами и Гант-диаграммой, командные и индивидуальные отчёты, оценивание ментором, итоговая защита экспертами.',
  '["Go","React","TypeScript","PostgreSQL","Docker","nginx"]'::jsonb,
  3, 5, 1, 5.0,
  'Автоматизация всех процессов проектного практикума ВШПИ.',
  'Развёрнутая на VDI МФТИ веб-система со всеми ролями и процессами.',
  'Покрытие тестами ≥ 70%. Все ключевые сценарии (распределение, спринты, задачи, отчёты) покрыты API.',
  'Backend (Go), Frontend (React), DevOps (Docker, nginx).',
  'Студенты получают опыт работы в распределённой команде, освоение современного стека и DevOps-практик.',
  1
)
ON CONFLICT (id) DO NOTHING;

SELECT setval('projects_id_seq', GREATEST((SELECT MAX(id) FROM projects), 1));

-- ─── Team ───────────────────────────────────────────────────────────────
INSERT INTO teams (id, project_id, name, leader_id) VALUES
  (1, 1, 'Команда 1', 3)
ON CONFLICT (id) DO NOTHING;

SELECT setval('teams_id_seq', GREATEST((SELECT MAX(id) FROM teams), 1));

INSERT INTO team_members (team_id, user_id, role_in_team) VALUES
  (1, 3, 'Backend-разработчик'),
  (1, 4, 'Frontend-разработчик'),
  (1, 5, 'Аналитик'),
  (1, 6, 'Тестировщик')
ON CONFLICT (team_id, user_id) DO NOTHING;

-- ─── Applications (all accepted into the team) ──────────────────────────
INSERT INTO applications (project_id, student_id, priority, status, team_id) VALUES
  (1, 3, 1, 'Принят', 1),
  (1, 4, 1, 'Принят', 1),
  (1, 5, 1, 'Принят', 1),
  (1, 6, 1, 'Принят', 1)
ON CONFLICT (project_id, student_id) DO NOTHING;

-- ─── Sprints ────────────────────────────────────────────────────────────
INSERT INTO sprints (id, project_id, number, start_date, end_date, status) VALUES
  (1, 1, 1, '2026-02-17', '2026-03-16', 'Завершён'),
  (2, 1, 2, '2026-03-17', '2026-04-13', 'Активный'),
  (3, 1, 3, '2026-04-14', '2026-05-04', 'Запланирован')
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

-- ─── Team report for sprint 1 (already reviewed by mentor) ──────────────
INSERT INTO team_reports (sprint_id, team_id, summary, problems, next_plan, status, mentor_comment, submitted_at, reviewed_at) VALUES
  (1, 1,
    'Развёрнут backend-каркас, базовые CRUD-эндпоинты, Docker-окружение. Frontend-команда подняла Vite + React + TS, перенесла каталог проектов на новый стек.',
    'Был простой 2 дня из-за проблем доступа к VDI. Аналитик догнал спецификацию в выходные.',
    'Реализовать модуль авторизации, страницу команды с Гант-диаграммой, командный отчёт.',
    'Проверен',
    'Хорошая работа на старте. Правильный выбор Django. Увеличьте покрытие тестами до 70%.',
    '2026-03-15 18:00:00', '2026-03-16 10:00:00')
ON CONFLICT (sprint_id, team_id) DO NOTHING;

-- ─── Done ───────────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM users)         AS users,
  (SELECT COUNT(*) FROM projects)      AS projects,
  (SELECT COUNT(*) FROM teams)         AS teams,
  (SELECT COUNT(*) FROM team_members)  AS team_members,
  (SELECT COUNT(*) FROM applications)  AS applications,
  (SELECT COUNT(*) FROM sprints)       AS sprints,
  (SELECT COUNT(*) FROM tasks)         AS tasks,
  (SELECT COUNT(*) FROM team_reports)  AS team_reports;
