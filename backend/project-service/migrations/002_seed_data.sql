-- Seed data for development and testing

-- Insert sample templates
INSERT INTO templates (id, name, fields, created_at, updated_at) VALUES
(
    'template-web-app',
    'Веб-приложение',
    '[
        {
            "id": "description",
            "name": "Описание проекта",
            "type": "Маркдаун",
            "required": true
        },
        {
            "id": "technologies",
            "name": "Технологии",
            "type": "Текст",
            "required": true
        },
        {
            "id": "team_size",
            "name": "Размер команды",
            "type": "Число",
            "required": true
        },
        {
            "id": "requirements",
            "name": "Требования к участникам",
            "type": "Маркдаун",
            "required": true
        },
        {
            "id": "goals",
            "name": "Цели проекта",
            "type": "Маркдаун",
            "required": false
        }
    ]'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'template-mobile-app',
    'Мобильное приложение',
    '[
        {
            "id": "description",
            "name": "Описание приложения",
            "type": "Маркдаун",
            "required": true
        },
        {
            "id": "platform",
            "name": "Платформа",
            "type": "Текст",
            "required": true
        },
        {
            "id": "technologies",
            "name": "Технологии",
            "type": "Текст",
            "required": true
        },
        {
            "id": "team_size",
            "name": "Размер команды",
            "type": "Число",
            "required": true
        }
    ]'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Insert sample projects
INSERT INTO projects (title, template_id, field_values, status, mentor_id, creator_id, max_slots, company, course, created_at, updated_at) VALUES
(
    'CRM система для малого бизнеса',
    'template-web-app',
    '[
        {
            "fieldId": "description",
            "value": "# CRM для малого бизнеса\n\nРазработка веб-приложения для управления клиентами, заказами и продажами."
        },
        {
            "fieldId": "technologies",
            "value": "React, Node.js, PostgreSQL, Docker"
        },
        {
            "fieldId": "team_size",
            "value": "4"
        },
        {
            "fieldId": "requirements",
            "value": "## Требования\n- Знание JavaScript/TypeScript\n- Опыт с React\n- Базовые знания SQL"
        }
    ]'::jsonb,
    'Опубликован',
    1,
    1,
    5,
    'Яндекс',
    '4',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'Мобильное приложение для доставки еды',
    'template-mobile-app',
    '[
        {
            "fieldId": "description",
            "value": "# Приложение для заказа еды\n\nМобильное приложение с геолокацией, каталогом ресторанов и системой заказов."
        },
        {
            "fieldId": "platform",
            "value": "iOS, Android"
        },
        {
            "fieldId": "technologies",
            "value": "React Native, Firebase, Maps API"
        },
        {
            "fieldId": "team_size",
            "value": "5"
        }
    ]'::jsonb,
    'Опубликован',
    2,
    2,
    6,
    'МТС',
    '3',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'Аналитическая платформа',
    'template-web-app',
    '[
        {
            "fieldId": "description",
            "value": "# Платформа для аналитики данных\n\nСистема для сбора, обработки и визуализации данных."
        },
        {
            "fieldId": "technologies",
            "value": "Python, FastAPI, React, PostgreSQL, Redis"
        },
        {
            "fieldId": "team_size",
            "value": "6"
        },
        {
            "fieldId": "requirements",
            "value": "## Требования\n- Python/JavaScript\n- Понимание баз данных\n- Опыт с визуализацией данных (плюс)"
        }
    ]'::jsonb,
    'Черновик',
    3,
    3,
    4,
    'Сбер',
    '4',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Note: Applications will be created via API when students apply
