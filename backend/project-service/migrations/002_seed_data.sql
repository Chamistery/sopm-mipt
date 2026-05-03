-- Seed data matching frontend prototypes (common.js mock data)
-- This file is NOT auto-executed by docker-entrypoint-initdb.d (only .up.sql is).
-- Run manually: docker exec -i sopm-postgres psql -U postgres -d sopm < migrations/002_seed_data.sql

-- Users
INSERT INTO users (id, first_name, last_name, email, role, company, course, "group", gpa, direction) VALUES
(1, 'Смирнов', 'И.В.', 'smirnov@mipt.ru', 'mentor', 'МФТИ', NULL, NULL, NULL, 'КТ'),
(2, 'Стародубов', 'А.', 'starodubov@mipt.ru', 'student', NULL, '2', 'Б05-211', 7.2, 'ПИ'),
(3, 'Кузнецов', 'М.', 'kuznetsov@mipt.ru', 'student', NULL, '2', 'Б05-212', 6.8, 'ПИ'),
(4, 'Лебедева', 'Н.', 'lebedeva@mipt.ru', 'student', NULL, '2', 'Б05-211', 8.1, 'ПИ'),
(5, 'Волков', 'Д.', 'volkov@mipt.ru', 'student', NULL, '2', 'Б05-213', 5.9, 'ПИ'),
(6, 'Петров', 'К.А.', 'petrov@mipt.ru', 'coordinator', 'МФТИ', NULL, NULL, NULL, NULL)
ON CONFLICT (email) DO NOTHING;

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- Project
INSERT INTO projects (id, title, status, mentor_id, company, courses, description, full_description, technologies, team_size_min, team_size_max, num_teams, min_gpa, goal, expected_result, competencies, duration_semesters)
VALUES (1, 'СУПП ВШПИ', 'Активный', 1, 'МФТИ', '{2,4}',
  'Система управления проектным практикумом ВШПИ МФТИ',
  'Веб-система для управления дисциплиной "Проектный практикум". Автоматизирует подачу заявок, распределение студентов, спринты, задачи, отчётность, оценивание.',
  '["Go","React","PostgreSQL","Docker"]',
  3, 5, 1, 5.0,
  'Автоматизация проектного практикума',
  'Работающее веб-приложение',
  'Backend (Go), Frontend (React), DevOps',
  1)
ON CONFLICT DO NOTHING;

SELECT setval('projects_id_seq', (SELECT MAX(id) FROM projects));

-- Team
INSERT INTO teams (id, project_id, name, leader_id) VALUES
(1, 1, 'Команда 1', 2)
ON CONFLICT DO NOTHING;

SELECT setval('teams_id_seq', (SELECT MAX(id) FROM teams));

-- Team members
INSERT INTO team_members (team_id, user_id, role_in_team) VALUES
(1, 2, 'Backend-разработчик'),
(1, 3, 'Frontend-разработчик'),
(1, 4, 'Аналитик'),
(1, 5, 'Тестировщик')
ON CONFLICT (team_id, user_id) DO NOTHING;

-- Sprints
INSERT INTO sprints (id, project_id, number, start_date, end_date, status) VALUES
(1, 1, 1, '2025-02-17', '2025-03-16', 'Завершён'),
(2, 1, 2, '2025-03-17', '2025-04-13', 'Активный'),
(3, 1, 3, '2025-04-14', '2025-05-04', 'Запланирован')
ON CONFLICT (project_id, number) DO NOTHING;

SELECT setval('sprints_id_seq', (SELECT MAX(id) FROM sprints));

-- Applications (all accepted)
INSERT INTO applications (project_id, student_id, priority, status, team_id) VALUES
(1, 2, 1, 'Принят', 1),
(1, 3, 1, 'Принят', 1),
(1, 4, 1, 'Принят', 1),
(1, 5, 1, 'Принят', 1)
ON CONFLICT (project_id, student_id) DO NOTHING;

-- Tasks for Sprint 2 (matching common.js sTasks)
INSERT INTO tasks (sprint_id, team_id, assignee_id, created_by_id, name, description, status, hours_estimate, start_date, end_date, mr_link, work_description, mentor_comments, history) VALUES
-- Стародубов (id=2)
(2, 1, 2, 2, 'API управления проектами', 'Реализовать CRUD-операции для проектов', 'Готово', 12, '2025-03-17', '2025-03-23', '!42', 'Реализовал REST API с 7 эндпоинтами, покрытие тестами 85%', '[{"action":"Аппрув","text":"Задача понятная."},{"action":"Принятие","text":"Отличная работа."}]', '[{"day":5,"event":"review"},{"day":6,"event":"accepted"}]'),
(2, 1, 2, 2, 'Модуль авторизации', 'JWT + middleware + роли', 'Готово', 10, '2025-03-24', '2025-03-30', '!45', 'Реализовал JWT auth с ролевой моделью', '[{"action":"Аппрув","text":""},{"action":"Принятие","text":"Хорошо."}]', '[{"day":12,"event":"review"},{"day":13,"event":"accepted"}]'),
(2, 1, 2, 2, 'Сервис распределения', 'Алгоритм распределения студентов по командам', 'В работе', 16, '2025-03-31', '2025-04-10', NULL, NULL, '[{"action":"Аппрув","text":""}]', '[]'),
(2, 1, 2, 2, 'Миграции БД v2', 'Новые таблицы для спринтов и задач', 'На ревью', 6, '2025-03-20', '2025-03-22', '!43', 'Создал миграции для 8 таблиц', '[{"action":"Аппрув","text":""}]', '[{"day":6,"event":"review"}]'),
-- Кузнецов (id=3)
(2, 1, 3, 2, 'Компонент каталога проектов', 'React-компонент каталога с фильтрацией', 'Готово', 10, '2025-03-17', '2025-03-25', '!51', 'Реализовал каталог с карточками и фильтрами', '[{"action":"Аппрув","text":""},{"action":"Принятие","text":""}]', '[{"day":7,"event":"review"},{"day":8,"event":"accepted"}]'),
(2, 1, 3, 3, 'Диаграмма Ганта', 'Интерактивная диаграмма с drag-and-drop', 'В работе', 14, '2025-03-26', '2025-04-08', NULL, NULL, '[{"action":"Аппрув","text":""}]', '[]'),
(2, 1, 3, 2, 'Дашборд ментора', 'Страница дашборда ментора', 'Назначена', 8, '2025-04-09', '2025-04-13', NULL, NULL, '[{"action":"Аппрув","text":""}]', '[]'),
-- Лебедева (id=4)
(2, 1, 4, 4, 'Анализ требований', 'Собрать и формализовать требования', 'Готово', 8, '2025-03-17', '2025-03-21', NULL, 'Подготовлена спецификация на 12 страниц', '[{"action":"Аппрув","text":""},{"action":"Принятие","text":"Отлично."}]', '[{"day":4,"event":"review"},{"day":5,"event":"accepted"}]'),
(2, 1, 4, 4, 'Проектирование API', 'Swagger/OpenAPI спецификация', 'Готово', 6, '2025-03-22', '2025-03-28', NULL, 'OpenAPI 3.0 спецификация', '[{"action":"Аппрув","text":""},{"action":"Принятие","text":""}]', '[{"day":10,"event":"review"},{"day":11,"event":"accepted"}]'),
(2, 1, 4, 4, 'Тестовые сценарии', 'Описание тест-кейсов для всех модулей', 'В работе', 10, '2025-03-29', '2025-04-08', NULL, NULL, '[{"action":"Аппрув","text":""}]', '[]'),
-- Волков (id=5)
(2, 1, 5, 5, 'Настройка CI/CD', 'GitHub Actions + Docker', 'Готово', 8, '2025-03-17', '2025-03-23', '!30', 'Настроил пайплайн: lint, test, build, deploy', '[{"action":"Аппрув","text":""},{"action":"Принятие","text":""}]', '[{"day":5,"event":"review"},{"day":6,"event":"accepted"}]'),
(2, 1, 5, 5, 'Интеграционные тесты', 'Тесты API endpoints', 'На ревью', 10, '2025-03-24', '2025-04-02', '!55', 'Написал 45 интеграционных тестов', '[{"action":"Аппрув","text":""}]', '[{"day":15,"event":"review"}]'),
(2, 1, 5, 5, 'Мониторинг', 'Prometheus + Grafana дашборд', 'Ожидает аппрува', 6, '2025-04-03', '2025-04-10', NULL, NULL, '[]', '[]');

-- Tasks for Sprint 1 (completed)
INSERT INTO tasks (sprint_id, team_id, assignee_id, created_by_id, name, description, status, hours_estimate, start_date, end_date, work_description, mentor_comments, history) VALUES
(1, 1, 2, 2, 'Инициализация проекта', 'Go модуль, структура папок', 'Готово', 4, '2025-02-17', '2025-02-19', 'Создал структуру проекта', '[{"action":"Аппрув","text":""},{"action":"Принятие","text":""}]', '[{"day":2,"event":"review"},{"day":3,"event":"accepted"}]'),
(1, 1, 3, 3, 'Макеты UI', 'Figma-макеты основных страниц', 'Готово', 12, '2025-02-17', '2025-02-28', 'Подготовлены макеты 8 страниц', '[{"action":"Аппрув","text":""},{"action":"Принятие","text":""}]', '[{"day":10,"event":"review"},{"day":12,"event":"accepted"}]'),
(1, 1, 4, 4, 'ТЗ v1', 'Первая версия технического задания', 'Готово', 10, '2025-02-17', '2025-02-25', 'ТЗ на 20 страниц', '[{"action":"Аппрув","text":""},{"action":"Принятие","text":""}]', '[{"day":7,"event":"review"},{"day":8,"event":"accepted"}]'),
(1, 1, 5, 5, 'Настройка окружения', 'Docker, PostgreSQL, dev-конфиг', 'Готово', 6, '2025-02-17', '2025-02-21', 'Docker-compose с PostgreSQL и Go', '[{"action":"Аппрув","text":""},{"action":"Принятие","text":""}]', '[{"day":4,"event":"review"},{"day":4,"event":"accepted"}]'),
(1, 1, 2, 2, 'CRUD пользователей', 'Базовые операции с пользователями', 'Готово', 8, '2025-02-20', '2025-02-28', 'REST API для users', '[{"action":"Аппрув","text":""},{"action":"Принятие","text":""}]', '[{"day":10,"event":"review"},{"day":11,"event":"accepted"}]');

-- Team report for sprint 2
INSERT INTO team_reports (sprint_id, team_id, summary, problems, next_plan, status, submitted_at) VALUES
(2, 1, 'Реализованы модули авторизации и управления проектами. Каталог проектов на фронте готов. CI/CD настроен.',
 'Задержка с VDI-сервером МФТИ, пришлось деплоить временно на личный сервер.',
 'Завершить сервис распределения, диаграмму Ганта, начать дашборд ментора.',
 'Отправлен', CURRENT_TIMESTAMP)
ON CONFLICT (sprint_id, team_id) DO NOTHING;

-- Meeting
INSERT INTO meetings (team_id, sprint_id, title, description, meeting_date, start_time, duration_minutes, conference_link, created_by_id, mentor_confirmed, confirmed_at, status) VALUES
(1, 2, 'Обзор спринта 2', 'Демо реализованного функционала. Планирование спринта 3.', '2025-04-01', '16:00', 60, 'https://zoom.us/j/123456', 1, TRUE, CURRENT_TIMESTAMP, 'Подтверждена');

-- User profiles
INSERT INTO user_profiles (user_id, telegram, phone, about, skills, links) VALUES
(2, '@starodubov_a', '+7 999 111-22-33', 'Backend-разработчик, интересуюсь DevOps и highload', '["Go","Python","PostgreSQL","Docker","REST API","gRPC"]', '[{"type":"GitHub","url":"https://github.com/starodubov-a"},{"type":"GitLab","url":"https://gitlab.com/starodubov"}]'),
(3, '@kuznetsov_m', '+7 999 222-33-44', 'Frontend-разработчик, люблю UI/UX', '["React","TypeScript","CSS","Figma","Vite"]', '[{"type":"GitHub","url":"https://github.com/kuznetsov-m"}]'),
(4, '@lebedeva_n', '+7 999 333-44-55', 'Аналитик, системное мышление', '["UML","BPMN","SQL","Confluence","Jira"]', '[{"type":"GitHub","url":"https://github.com/lebedeva-n"}]'),
(5, '@volkov_d', '+7 999 444-55-66', 'QA-инженер, автоматизация тестирования', '["Go","Python","Selenium","Docker","k8s","Prometheus"]', '[{"type":"GitHub","url":"https://github.com/volkov-d"}]')
ON CONFLICT (user_id) DO NOTHING;
