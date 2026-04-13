/* ═══ СУПП ВШПИ — Общие данные и функции ═══ */

// ─── Роли и навигация между страницами ───
const ROLE_PAGES = {
  student: 'student.html',
  student_assigned: 'student_assigned.html',
  teamlead_assigned: 'teamlead_assigned.html',
  mentor: 'mentor.html',
  admin: 'admin.html'
};

function switchRole(value) {
  const page = ROLE_PAGES[value];
  if (page && !window.location.href.endsWith(page)) {
    window.location.href = page;
  }
}

// ─── Данные проектов ───
const projects = [
  {id:1,company:"МФТИ",title:"Система управления проектным практикумом ВШПИ",mentor:"Тимохин В.Н.",mentorRole:"Профессор ВШПИ",email:"timokhin@mipt.ru",tg:"@timokhin",desc:"Разработка веб-приложения для управления проектным практикумом: личные кабинеты, управление проектами, спринтами и отчётностью.",fullDesc:"Система предоставляет возможности по управлению ресурсами: пользователи, проекты (включая детализацию: заявка, спринты, задачи), отчёты. Система ориентирована на реализацию функционала ролей: администратор, координатор, ментор, участник команды, эксперт.",tags:["Python","Django","PostgreSQL","REST API"],teamSize:"3–5",teams:2,applied:12,eduResult:"Командная разработка, управление проектами, веб-разработка, базы данных."},
  {id:2,company:"Яндекс",title:"Платформа автоматизации тестирования ПО",mentor:"Смирнов А.К.",mentorRole:"Тимлид QA, Яндекс",email:"smirnov@yandex.ru",tg:"@smirnov_qa",desc:"Платформа для автоматизации регрессионного тестирования веб-сервисов с генерацией отчётов.",fullDesc:"Платформа позволяет описывать тест-сценарии в YAML, запускать по расписанию или вручную, собирать метрики покрытия и генерировать отчёты.",tags:["Python","FastAPI","Selenium","Docker","CI/CD"],teamSize:"4–5",teams:1,applied:18,eduResult:"Автоматизация тестирования, CI/CD, работа с контейнерами, проектирование API."},
  {id:3,company:"Т-Банк",title:"Мобильное приложение расписания МФТИ",mentor:"Козлова Е.В.",mentorRole:"iOS-разработчик, Т-Банк",email:"kozlova@tbank.ru",tg:"@kozlova_dev",desc:"Кроссплатформенное мобильное приложение с расписанием, уведомлениями и интеграцией с LMS.",fullDesc:"Приложение предоставляет актуальное расписание, push-уведомления об изменениях, интеграцию с LMS для просмотра оценок и дедлайнов.",tags:["React Native","TypeScript","Node.js","Firebase"],teamSize:"3–4",teams:1,applied:15,eduResult:"Мобильная разработка, кроссплатформенные технологии, работа с API."},
  {id:4,company:"МФТИ",title:"Рекомендательная система подбора элективных курсов",mentor:"Петров Д.М.",mentorRole:"Доцент ВШПИ",email:"petrov@mipt.ru",tg:"@petrov_ml",desc:"ML-система для персонализированных рекомендаций элективов на основе профиля студента.",fullDesc:"Система анализирует академический профиль, оценки, выбранные ранее курсы и интересы для формирования персонализированного рейтинга элективов.",tags:["Python","scikit-learn","Pandas","FastAPI","React"],teamSize:"3–5",teams:2,applied:9,eduResult:"Машинное обучение, анализ данных, рекомендательные системы."},
  {id:5,company:"МФТИ",title:"Сервис статического анализа студенческого кода",mentor:"Тимохин В.Н.",mentorRole:"Профессор ВШПИ",email:"timokhin@mipt.ru",tg:"@timokhin",desc:"Инструмент для автоматической проверки качества кода с интеграцией в GitLab CI/CD.",fullDesc:"Сервис интегрируется в GitLab, анализирует Python-код на соответствие стандартам, выявляет ошибки и формирует отчёт.",tags:["Python","AST","GitLab API","Docker"],teamSize:"3–4",teams:1,applied:6,eduResult:"Статический анализ, AST, DevOps, интеграция с GitLab."},
  {id:6,company:"VK",title:"Чат-бот для поддержки студентов",mentor:"Иванова О.С.",mentorRole:"Продакт-менеджер, VK",email:"ivanova@vk.com",tg:"@ivanova_pm",desc:"Telegram-бот с NLP для ответов на вопросы студентов о расписании и дедлайнах.",fullDesc:"Бот обрабатывает естественный язык, классифицирует вопросы и предоставляет ответы из базы знаний с эскалацией на оператора.",tags:["Python","aiogram","NLP","PostgreSQL"],teamSize:"3–4",teams:1,applied:14,eduResult:"NLP, разработка ботов, проектирование диалоговых систем."},
  {id:7,company:"Сбер",title:"Дашборд аналитики учебного процесса",mentor:"Фёдоров И.А.",mentorRole:"Data Engineer, Сбер",email:"fedorov@sber.ru",tg:"@fedorov_de",desc:"Интерактивный дашборд для визуализации метрик учебного процесса.",fullDesc:"Система собирает данные из LMS, расписания, БРС, обрабатывает и визуализирует на интерактивных дашбордах для администрации.",tags:["Python","Airflow","ClickHouse","Grafana","React"],teamSize:"4–5",teams:1,applied:11,eduResult:"Data Engineering, ETL-пайплайны, визуализация данных."},
  {id:8,company:"МФТИ",title:"Платформа для проведения код-ревью",mentor:"Белов С.А.",mentorRole:"Ст. преподаватель ВШПИ",email:"belov@mipt.ru",tg:"@belov_cr",desc:"Веб-платформа для peer code review между студентами с оценками и обратной связью.",fullDesc:"Интегрируется с GitLab, позволяет назначать ревьюеров, предоставляет inline-комментарии и чеклисты для оценки кода.",tags:["Python","Django","GitLab API","React","WebSocket"],teamSize:"3–5",teams:1,applied:8,eduResult:"Code review, Git, веб-разработка full-stack, WebSocket."}
];

// ─── Команда и задачи ───
const teamMembers = [
  {name:'Стародубов А.',initials:'АС',color:'var(--accent)',role:'Backend-разработчик',leader:true},
  {name:'Кузнецов М.',initials:'КМ',color:'var(--success)',role:'Frontend-разработчик',leader:false},
  {name:'Лебедева Н.',initials:'ЛН',color:'var(--warning)',role:'Аналитик',leader:false},
  {name:'Волков Д.',initials:'ВД',color:'var(--purple)',role:'Тестировщик',leader:false},
];

const SPRINT2_START = new Date(2025, 2, 17);
const SPRINT2_DAYS = 28;
const TODAY = new Date(2025, 2, 31); // Demo: 31 марта 2025 (внутри спринта 2)

const sTasks = [
  // Sprint 2
  {sprint:2,person:"Стародубов А.",name:"API управления проектами",status:"done",priority:"high",hours:12,start:0,dur:7,mr:"!42",desc:"Реализовать CRUD-операции для сущности Project: создание, чтение, обновление, удаление. REST API на Django REST Framework.",workDesc:"Реализовал 7 эндпоинтов (GET/POST/PUT/DELETE для проектов, GET list с фильтрацией). Написал сериализаторы и viewsets. Покрытие тестами 85%.",mentor_comments:[{action:"Аппрув",text:"Задача понятная и важная. Приступай."},{action:"Принятие",text:"Отличная работа. Чистый код, хорошая структура. Рекомендую добавить пагинацию в list-эндпоинт."}],history:[{day:5,event:"review"},{day:6,event:"accepted"}]},
  {sprint:2,person:"Стародубов А.",name:"Интеграция с OAuth МФТИ",status:"review",priority:"medium",hours:8,start:7,dur:6,mr:"!45",desc:"Подключить авторизацию через OAuth2 провайдер МФТИ. Получение токена, валидация, сохранение сессии.",workDesc:"Настроил OAuth2 flow с redirect. Получение и обновление токенов работает. Добавил middleware для проверки авторизации.",mentor_comments:[{action:"Аппрув",text:"Критически важная задача. Используй библиотеку django-oauth-toolkit."}],history:[{day:12,event:"review"}]},
  {sprint:2,person:"Стародубов А.",name:"Ролевая модель (backend)",status:"progress",priority:"high",hours:16,start:13,dur:10,mr:null,desc:"Реализовать систему ролей: студент, тимлид, ментор, координатор. Декораторы для проверки прав на эндпоинтах.",mentor_comments:[{action:"Аппрув",text:"Утверждено. Посмотри как реализованы permissions в DRF."}]},
  {sprint:2,person:"Стародубов А.",name:"Миграции БД v2",status:"approved",priority:"medium",hours:6,start:23,dur:5,mr:null,desc:"Обновить схему БД: добавить таблицы teams, sprints, tasks. Написать миграции и seed-данные.",mentor_comments:[{action:"Аппрув",text:"Обрати внимание на обратную совместимость миграций."}]},
  {sprint:2,person:"Кузнецов М.",name:"Макет дашборда ментора",status:"done",priority:"high",hours:14,start:0,dur:10,mr:"!46",desc:"Вёрстка дашборда ментора: карточки проектов, блок уведомлений, квадратики спринтов, навигация.",workDesc:"Сверстал полный дашборд с адаптивной сеткой проектов, интерактивными карточками команд, блоком «Требует внимания».",mentor_comments:[{action:"Аппрув",text:"Бери за основу прототип. Главное — адаптивность."},{action:"Принятие",text:"Качественная вёрстка, хороший UX. На мобильных карточки слипаются — поправь в следующем спринте."}]},
  {sprint:2,person:"Кузнецов М.",name:"Компонент формы заявки",status:"progress",priority:"medium",hours:10,start:10,dur:9,mr:null,desc:"React-компонент формы создания проекта: 4 шага, валидация, настройка спринтов с автоматическим расчётом дат.",mentor_comments:[{action:"Аппрув",text:"Важно реализовать переключение режимов спринтов (одинаковая/индивидуальная длительность)."}]},
  {sprint:2,person:"Кузнецов М.",name:"Страница команды (UI)",status:"approved",priority:"high",hours:12,start:19,dur:9,mr:null,desc:"Вёрстка страницы команды: диаграмма Ганта, вкладки отчётов и встреч, список участников.",mentor_comments:[{action:"Аппрув",text:"Бери за основу макет из прототипа supp_prototype.html."}]},
  {sprint:2,person:"Лебедева Н.",name:"Спецификация API (Swagger)",status:"done",priority:"medium",hours:8,start:0,dur:8,mr:null,desc:"Написать OpenAPI 3.0 спецификацию для всех эндпоинтов проекта: projects, teams, tasks, applications, users.",workDesc:"Написала полную Swagger-документацию (1100 строк). Все эндпоинты задокументированы с примерами запросов и ответов.",mentor_comments:[{action:"Аппрув",text:"Согласовано. Используй формат OpenAPI 3.0."},{action:"Принятие",text:"Полная и аккуратная документация. Добавь описания ошибок (4xx/5xx)."}]},
  {sprint:2,person:"Лебедева Н.",name:"Сценарии использования v2",status:"review",priority:"low",hours:6,start:8,dur:7,mr:null,desc:"Обновить сценарии использования с учётом новых ролей и процесса распределения (5 приоритетов, приглашения).",workDesc:"Обновила 12 use-case диаграмм. Добавила сценарии для аппрува задач, распределения с приглашениями, запуска команд.",mentor_comments:[{action:"Аппрув",text:"Обязательно учти новый ДКА статусов заявок."}],history:[{day:14,event:"review"}]},
  {sprint:2,person:"Лебедева Н.",name:"Документация ролевой модели",status:"progress",priority:"medium",hours:8,start:15,dur:8,mr:null,desc:"Описать права доступа для каждой роли: что может видеть/редактировать студент, тимлид, ментор, координатор.",mentor_comments:[{action:"Аппрув",text:"Используй таблицу прав из architecture.md как основу."}]},
  {sprint:2,person:"Волков Д.",name:"Unit-тесты для Auth",status:"done",priority:"medium",hours:8,start:0,dur:7,mr:"!43",desc:"Написать unit-тесты для модуля авторизации: регистрация, логин, OAuth flow, проверка токенов, refresh.",workDesc:"Написал 28 тестов. Покрытие модуля auth — 92%. Все тесты проходят в CI.",mentor_comments:[{action:"Аппрув",text:"Покрытие должно быть не ниже 80%."},{action:"Возврат",text:"Не хватает тестов на OAuth flow. Добавь минимум 5 тестов."},{action:"Принятие",text:"Отлично, 92% — выше цели. Добавь edge-case тест для expired refresh token."}],history:[{day:4,event:"review"},{day:4,event:"returned"},{day:6,event:"review"},{day:6,event:"accepted"}]},
  {sprint:2,person:"Стародубов А.",name:"Валидация входных данных API",status:"done",priority:"high",hours:10,start:3,dur:11,mr:"!48",desc:"Добавить валидацию всех входных данных: проверка типов, длины строк, допустимых значений. Защита от SQL injection и XSS.",workDesc:"Реализовал валидаторы для всех эндпоинтов. Добавил sanitize для текстовых полей. Тесты на 15 edge-cases.",mentor_comments:[{action:"Аппрув",text:"Критически важная задача для безопасности."},{action:"Возврат",text:"Не покрыты числовые поля (priority, hours). Добавь проверку диапазонов."},{action:"Возврат",text:"Лучше, но пропущена валидация дат — start_date не может быть позже end_date."},{action:"Принятие",text:"Теперь полная валидация. Хорошая работа, спасибо за терпение с доработками."}],history:[{day:8,event:"review"},{day:9,event:"returned"},{day:10,event:"review"},{day:11,event:"returned"},{day:13,event:"review"},{day:13,event:"accepted"}]},
  {sprint:2,person:"Волков Д.",name:"Тест-план для Sprint 2",status:"done",priority:"low",hours:6,start:7,dur:6,mr:null,desc:"Составить тест-план для спринта 2: определить критические пути, написать чек-листы для ручного тестирования.",workDesc:"Составил тест-план из 45 пунктов. Покрывает авторизацию, CRUD проектов, формы создания, навигацию.",mentor_comments:[{action:"Аппрув",text:"Согласовано."},{action:"Принятие",text:"Хороший план, принято."}]},
  {sprint:2,person:"Волков Д.",name:"Настройка CI/CD",status:"progress",priority:"high",hours:10,start:13,dur:8,mr:null,desc:"Настроить GitLab CI/CD: автоматический запуск тестов на MR, линтеры, сборка Docker-образа, деплой на стейджинг.",mentor_comments:[{action:"Аппрув",text:"Начни с lint + test. Деплой на стейджинг — после получения доступа к VDI."}]},
  {sprint:2,person:"Волков Д.",name:"Интеграционные тесты API",status:"approved",priority:"high",hours:8,start:21,dur:7,mr:null,desc:"Написать интеграционные тесты для REST API: создание проекта → добавление команды → создание задачи → полный цикл.",mentor_comments:[{action:"Аппрув",text:"Используй testcontainers для PostgreSQL."}]},
  {sprint:2,person:"Лебедева Н.",name:"Аналитика пользовательских сценариев",status:"pending_approval",priority:"low",hours:6,start:24,dur:4,mr:null,desc:"Провести анализ пользовательских сценариев для модуля оценивания: как ментор ставит оценки, как формируется итоговый балл."},
  {sprint:2,person:"Кузнецов М.",name:"Рефакторинг компонентов",status:"returned",priority:"medium",hours:8,start:10,dur:5,mr:null,desc:"Разбить монолитные React-компоненты дашборда на переиспользуемые: ProjectCard, TeamRow, AttentionItem, SprintBar.",workDesc:"Выделил ProjectCard и TeamRow. Остальные компоненты пока в одном файле.",mentor_comments:[{action:"Аппрув",text:"Хорошая инициатива, утверждаю."},{action:"Возврат",text:"Нужно разбить на более мелкие компоненты. AttentionItem и SprintBar тоже должны быть отдельными."}]},
  {sprint:2,person:"Стародубов А.",name:"Кеширование запросов",status:"rejected",priority:"low",hours:4,start:20,dur:3,mr:null,desc:"Добавить Redis-кеширование для GET-запросов к API проектов.",mentor_comments:[{action:"Отклонение",text:"Преждевременная оптимизация. Нет проблем с производительностью. Сфокусируйся на ролевой модели."}]},
  {sprint:2,person:"Лебедева Н.",name:"Обновление диаграмм UML",status:"progress",priority:"medium",hours:6,start:4,dur:7,mr:null,wasOverdue:true,desc:"Обновить UML-диаграммы классов и последовательностей с учётом новой архитектуры (таблицы teams, tasks, sprints).",mentor_comments:[{action:"Аппрув",text:"Утверждено. Диаграммы нужны для документации."}]},
  {sprint:2,person:"Волков Д.",name:"Нагрузочное тестирование",status:"progress",priority:"high",hours:10,start:2,dur:10,mr:null,wasOverdue:true,desc:"Провести нагрузочное тестирование API: определить пропускную способность, найти узкие места. Инструмент: k6 или locust.",mentor_comments:[{action:"Аппрув",text:"Важно для понимания производительности. Используй locust."}]},
  // Sprint 1
  {sprint:1,person:"Стародубов А.",name:"Структура проекта Django",status:"done",priority:"high",hours:8,start:0,dur:8,mr:"!1",desc:"Создать структуру Django-проекта: приложения, настройки, подключение PostgreSQL, базовые модели.",workDesc:"Создал проект с 4 приложениями (users, projects, teams, tasks). Настроил PostgreSQL, Docker Compose для разработки.",mentor_comments:[{action:"Аппрув",text:"Приступай."},{action:"Принятие",text:"Правильная структура. SOLID соблюдён."}]},
  {sprint:1,person:"Стародубов А.",name:"Доменные модели",status:"done",priority:"high",hours:12,start:8,dur:10,mr:"!5",desc:"Реализовать доменные модели: User, Project, Team, Application. Миграции, связи между моделями.",workDesc:"Реализовал 6 моделей с полями из ТЗ. Миграции проходят. Написал fixtures для тестовых данных.",mentor_comments:[{action:"Аппрув",text:"Утверждено."},{action:"Принятие",text:"Хорошая работа. Добавь индексы на часто используемые поля (status, mentor_id)."}]},
  {sprint:1,person:"Кузнецов М.",name:"Прототип UI (Figma)",status:"done",priority:"medium",hours:10,start:0,dur:14,mr:null,desc:"Создать прототип интерфейса в Figma: экраны дашборда, каталога проектов, страницы команды, профиля.",workDesc:"Создал 15 экранов в Figma. UI-кит с компонентами: кнопки, карточки, формы, таблицы в МФТИ-стиле.",mentor_comments:[{action:"Аппрув",text:"Согласовано. Стиль — строгий, МФТИ."},{action:"Принятие",text:"Консистентный дизайн. Переиспользуемые компоненты — молодец."}]},
  {sprint:1,person:"Лебедева Н.",name:"Анализ требований",status:"done",priority:"high",hours:10,start:0,dur:10,mr:null,desc:"Провести анализ Положения о ПП: выделить роли, процессы, сущности. Составить карту пользовательских историй.",workDesc:"Проанализировала Положение. Выделила 6 ролей, 13 полей заявки, формулу оценки. Составила 24 user stories.",mentor_comments:[{action:"Аппрув",text:"Очень важная задача. Положение — основной документ."},{action:"Принятие",text:"Полный и структурированный анализ."}]},
  {sprint:1,person:"Волков Д.",name:"Docker Compose окружение",status:"done",priority:"medium",hours:6,start:0,dur:7,mr:"!3",desc:"Настроить Docker Compose для локальной разработки: PostgreSQL, Redis, Django dev-сервер с hot-reload.",workDesc:"Настроил docker-compose.yml с 3 сервисами. Hot-reload работает через volume mount.",mentor_comments:[{action:"Аппрув",text:"Приоритетная задача для всей команды."},{action:"Принятие",text:"Рабочее окружение, всё поднимается одной командой. Добавь healthcheck для PostgreSQL."}]},
];

const sAvatarColors = {"Стародубов А.":"var(--accent)","Кузнецов М.":"var(--success)","Лебедева Н.":"var(--warning)","Волков Д.":"var(--purple)"};

// ─── Общие утилиты ───
function addLink() {
  const list = document.getElementById('links-list');
  const row = document.createElement('div');
  row.className = 'link-row';
  row.innerHTML = '<select class="link-type"><option>GitHub</option><option>GitLab</option><option>Портфолио</option><option>Другое</option></select><input class="profile-input" placeholder="https://..." style="flex:1"><button class="link-remove" onclick="this.parentElement.remove()">✕</button>';
  list.appendChild(row);
  row.querySelector('input').focus();
}

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + id).classList.add('active');
  document.querySelectorAll('.sidebar-nav-item').forEach(b => b.classList.remove('active'));
  const nav = document.querySelector('[data-nav="' + id + '"]');
  if (nav) nav.classList.add('active');
  window.scrollTo(0, 0);
}

// ─── SVG иконки (переиспользуемые) ───
const SVG_PERSON = '<svg width="14" height="14" fill="none" viewBox="0 0 16 16"><circle cx="8" cy="5.5" r="3" stroke="currentColor" stroke-width="1.2"/><path d="M2 15c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" stroke-width="1.2"/></svg>';
const SVG_PLUS = '<svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

// ─── Sidebar HTML generator ───
function roleSwitcherHtml(currentRole) {
  const roles = [
    {value:'student', label:'Студент'},
    {value:'student_assigned', label:'Студент (распределён)'},
    {value:'teamlead_assigned', label:'Тимлид'},
    {value:'mentor', label:'Ментор'},
    {value:'admin', label:'Администратор'}
  ];
  return roles.map(r =>
    '<option value="' + r.value + '"' + (r.value === currentRole ? ' selected' : '') + '>' + r.label + '</option>'
  ).join('');
}

// ─── Gantt builder ───
function calcTaskStatus(task) {
  // Статусы, не зависящие от дат:
  if (task.status === 'pending_approval') return 'pending_approval';
  if (task.status === 'rejected') return 'rejected';
  if (task.status === 'review') return 'review';
  if (task.status === 'returned') return 'returned';
  if (task.status === 'done') return task.status;

  const taskEndDate = new Date(SPRINT2_START);
  taskEndDate.setDate(taskEndDate.getDate() + task.start + task.dur);
  const taskStartDate = new Date(SPRINT2_START);
  taskStartDate.setDate(taskStartDate.getDate() + task.start);

  // Overdue flag
  if (TODAY >= taskEndDate && task.status !== 'review' && task.status !== 'done') {
    task.wasOverdue = true;
  }

  if (TODAY >= taskEndDate) return 'overdue';
  // approved = назначена, ждёт start_date
  if (task.status === 'approved' && TODAY < taskStartDate) return 'approved';
  if (TODAY < taskStartDate) return 'pending_approval';
  return 'progress';
}

function buildGantt(containerId, currentUser, options) {
  options = options || {};
  const canEdit = options.canEdit || false;
  const canEditAll = options.canEditAll || false;
  const mentorActions = options.mentorActions || false;
  const container = document.getElementById(containerId);
  if (!container) return;

  const today = TODAY;
  const months = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  const MIN_PX = 28;
  const sprintConfigs = [
    {num:2, label:'Спринт 2 (текущий)', start:new Date(2025,2,17), days:28},
    {num:1, label:'Спринт 1 (завершён)', start:new Date(2025,1,24), days:21},
  ];
  const dsMap = {pending_approval:'Ожидает аппрува', approved:'Назначена', progress:'В работе', review:'На ревью', returned:'Возвращена', done:'Готово', rejected:'Отклонена', overdue:'В работе'};
  const dsBar = {pending_approval:'status-bar-new', approved:'status-bar-approved', progress:'status-bar-progress', review:'status-bar-review', returned:'status-bar-progress', done:'status-bar-done', rejected:'status-bar-overdue', overdue:'status-bar-progress'};

  function fmtR(s, d) {
    const e = new Date(s); e.setDate(e.getDate() + d - 1);
    return s.getDate() + ' ' + months[s.getMonth()] + ' — ' + e.getDate() + ' ' + months[e.getMonth()];
  }
  function makeH(ss, sd) {
    let h = ''; let pm = -1;
    for (let d = 0; d < sd; d++) {
      const dt = new Date(ss); dt.setDate(dt.getDate() + d);
      const t = dt.toDateString() === today.toDateString();
      const dn = dt.getDate();
      const w = dt.getDay() === 0 || dt.getDay() === 6;
      const sm = dt.getMonth() !== pm; pm = dt.getMonth();
      const l = sm ? dn + ' ' + months[dt.getMonth()] : dn;
      h += '<div class="gantt-timeline-day' + (t ? ' today' : '') + '" style="flex:1;min-width:' + MIN_PX + 'px;' + (w ? 'opacity:0.5;' : '') + '">' + l + '</div>';
    }
    return h;
  }

  let html = '';
  for (const sp of sprintConfigs) {
    const st = sTasks.filter(t => t.sprint === sp.num && t.status !== 'rejected');
    if (!st.length) continue;
    const persons = [...new Set(st.map(t => t.person))];
    const minBW = sp.days * MIN_PX;
    html += '<div class="gantt-sprint-block">';
    const addBtnHtml = (canEdit && sp.num === 2) ? '<button onclick="openTaskModal(-1)" style="margin-left:auto;display:inline-flex;align-items:center;gap:5px;padding:5px 14px;border:none;border-radius:6px;background:var(--primary);color:#fff;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer"><svg width="12" height="12" fill="none" viewBox="0 0 16 16"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Добавить задачу</button>' : '';
    html += '<div class="gantt-sprint-label" style="display:flex;align-items:center">' + sp.label + ' \u00b7 ' + fmtR(sp.start, sp.days) + ' \u00b7 ' + sp.days + ' дн.' + addBtnHtml + '</div>';
    html += '<div class="gantt-sprint-scroll">';
    html += '<table class="gantt-table" style="min-width:' + (300 + minBW) + 'px">';
    html += '<thead><tr><th class="col-task">Задача</th><th class="col-status"></th><th class="col-hours">Ч.</th><th class="col-bars"><div class="gantt-timeline-header">' + makeH(sp.start, sp.days) + '</div></th></tr></thead><tbody>';
    for (const person of persons) {
      const pt = st.filter(t => t.person === person);
      const isYou = person === currentUser;
      const youBadge = isYou ? ' <span style="font-size:10px;font-weight:700;color:var(--success);background:var(--success-bg);padding:0 5px;border-radius:3px;margin-left:4px">Вы</span>' : '';
      html += '<tr class="gantt-person-row"><td class="col-task"><span style="display:inline-flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:' + (sAvatarColors[person] || 'var(--border)') + '"></span>' + person + youBadge + '</span></td><td class="col-status"></td><td class="col-hours"></td><td class="col-bars"></td></tr>';
      for (const task of pt) {
        const ds = sp.num === 2 ? calcTaskStatus(task) : task.status;
        const globalIdx = sTasks.indexOf(task);
        const isOwn = (isYou || canEditAll) && sp.num === 2 && canEdit;
        const left = (task.start / sp.days * 100).toFixed(1);
        const width = (task.dur / sp.days * 100).toFixed(1);

        // All tasks clickable: own => editable modal, others => readonly modal
        const rowClick = isOwn
          ? ' onclick="openTaskModal(' + globalIdx + ')" style="cursor:pointer"'
          : ' onclick="showTaskDetail(' + globalIdx + (mentorActions ? ',{mentorActions:true}' : '') + ')" style="cursor:pointer"';

        const iconSlot = isOwn
          ? '<svg class="edit-icon" width="12" height="12" fill="none" viewBox="0 0 16 16" style="flex-shrink:0;width:14px"><path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" stroke="currentColor" stroke-width="1.3"/></svg>'
          : '<span style="display:inline-block;width:14px;flex-shrink:0"></span>';

        html += '<tr class="gantt-task-row" data-task-idx="' + globalIdx + '"' + rowClick + '>';
        html += '<td class="col-task"><div class="task-name">' + iconSlot;
        html += '<span class="task-name-text">' + task.name + '</span>';
        html += '</div></td>';
        const overdueRing = task.wasOverdue ? ';outline:2px solid var(--danger);outline-offset:-1px' : '';
        html += '<td class="col-status"><span class="status-dot ' + dsBar[ds] + '" style="display:inline-block;width:12px;height:12px;border-radius:3px' + overdueRing + '" title="' + dsMap[ds] + '"></span></td>';
        html += '<td class="col-hours hours-cell">' + task.hours + 'ч</td>';
        // Bar with history markers
        var markersHtml = '';
        if (task.history && task.history.length) {
          var evColors = {review:'var(--purple)',returned:'var(--warning)',accepted:'var(--success)'};
          var evTitles = {review:'Отправлено на ревью',returned:'Возвращено',accepted:'Принято'};
          task.history.forEach(function(h) {
            var mPct = (h.day / sp.days * 100).toFixed(1);
            markersHtml += '<div style="position:absolute;left:' + mPct + '%;top:0;bottom:0;width:2px;background:' + (evColors[h.event]||'var(--text-muted)') + ';z-index:1;opacity:0.8" title="День ' + (h.day+1) + ': ' + (evTitles[h.event]||h.event) + '"></div>';
          });
        }
        html += '<td class="col-bars"><div class="gantt-bars-cell"><div class="gantt-bar ' + dsBar[ds] + '" style="left:' + left + '%;width:' + width + '%"></div>' + markersHtml + '</div></td>';
        html += '</tr>';
      }
    }
    html += '</tbody></table></div>';
    html += '<div class="gantt-custom-scrollbar"><div class="thumb"></div></div>';
    html += '</div>';
  }
  container.innerHTML = html;
  initScrollbars(containerId);
  initTodayLines(containerId);
}

function initTodayLines(containerId) {
  document.querySelectorAll('#' + containerId + ' .gantt-sprint-block').forEach(block => {
    const todayCell = block.querySelector('.gantt-timeline-day.today');
    if (!todayCell) return;
    const scroll = block.querySelector('.gantt-sprint-scroll');
    if (!scroll) return;

    const line = document.createElement('div');
    line.className = 'gantt-today-line';
    scroll.appendChild(line);

    function position() {
      const cellRect = todayCell.getBoundingClientRect();
      const scrollRect = scroll.getBoundingClientRect();
      line.style.left = (cellRect.left - scrollRect.left + scroll.scrollLeft + cellRect.width / 2) + 'px';
    }
    position();
    scroll.addEventListener('scroll', position);
    window.addEventListener('resize', position);
  });
}

// ─── Readonly task detail popup ───
function showTaskDetail(idx, options) {
  options = options || {};
  const mentorActions = options.mentorActions || false;
  const t = sTasks[idx];
  if (!t) return;
  const sprintStart = t.sprint === 2 ? SPRINT2_START : new Date(2025,1,24);
  const sd = new Date(sprintStart); sd.setDate(sd.getDate() + t.start);
  const ed = new Date(sd); ed.setDate(ed.getDate() + t.dur - 1);
  const mons = ['янв','фев','мар','апр','мая','июн'];
  const dateStr = sd.getDate() + ' ' + mons[sd.getMonth()] + ' — ' + ed.getDate() + ' ' + mons[ed.getMonth()];
  const ds = t.sprint === 2 ? calcTaskStatus(t) : t.status;
  const dsLabels = {pending_approval:'Ожидает аппрува', approved:'Назначена', progress:'В работе', review:'На ревью', returned:'Возвращена', done:'Готово', rejected:'Отклонена', overdue:'В работе'};
  const dsBg = {pending_approval:'var(--surface-alt)', approved:'var(--surface-alt)', progress:'#dbeafe', review:'var(--purple-bg)', returned:'var(--warning-bg)', done:'var(--success-bg)', rejected:'var(--danger-bg)', overdue:'#dbeafe'};
  const dsClr = {pending_approval:'var(--text-muted)', approved:'var(--text-muted)', progress:'var(--accent)', review:'var(--purple)', returned:'var(--warning)', done:'var(--success)', rejected:'var(--danger)', overdue:'var(--accent)'};
  const member = teamMembers.find(m => m.name === t.person);
  const avatarColor = member ? member.color : 'var(--border)';
  const initials = member ? member.initials : '??';

  let overlay = document.getElementById('task-detail-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'task-detail-overlay';
    overlay.className = 'task-detail-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.classList.remove('open'); };
    overlay.innerHTML = '<div class="task-detail-card" id="task-detail-content" onclick="event.stopPropagation()"></div>';
    document.body.appendChild(overlay);
  }

  let html = '';
  // Header
  html += '<div class="task-detail-header">';
  html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">';
  html += '<div style="flex:1"><div style="font-size:17px;font-weight:700;color:var(--text);line-height:1.3;margin-bottom:8px">' + t.name + '</div>';
  html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
  html += '<span style="display:inline-block;padding:3px 10px;border-radius:5px;font-size:11px;font-weight:600;background:' + dsBg[ds] + ';color:' + dsClr[ds] + '">' + dsLabels[ds] + '</span>';
  if (t.wasOverdue) html += '<span style="display:inline-block;padding:3px 8px;border-radius:5px;font-size:10px;font-weight:700;background:var(--danger-bg);color:var(--danger)">Просрочена</span>';
  html += '<span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--text-secondary)">';
  html += '<span style="width:20px;height:20px;border-radius:50%;background:' + avatarColor + ';display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff">' + initials + '</span>';
  html += t.person + '</span>';
  if (t.mr) html += '<a href="#" style="color:var(--accent);text-decoration:none;font-size:12px;font-weight:600">' + t.mr + '</a>';
  html += '</div></div>';
  html += '<button onclick="document.getElementById(\'task-detail-overlay\').classList.remove(\'open\')" style="border:none;background:var(--surface-alt);width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-muted);font-size:14px;flex-shrink:0">✕</button>';
  html += '</div></div>';

  // Body
  html += '<div class="task-detail-body">';
  // Meta
  html += '<div class="task-detail-row"><span class="task-detail-label">Сроки</span><span class="task-detail-value">' + dateStr + '</span></div>';
  html += '<div class="task-detail-row"><span class="task-detail-label">Часы</span><span class="task-detail-value">' + t.hours + 'ч</span></div>';
  // Description
  html += '<div class="task-detail-block"><div class="task-detail-block-title">Описание</div>';
  html += t.desc ? '<div class="task-detail-block-text">' + t.desc + '</div>' : '<div class="task-detail-empty">Не заполнено</div>';
  html += '</div>';
  // Work done
  html += '<div class="task-detail-block"><div class="task-detail-block-title">Выполненная работа</div>';
  html += t.workDesc ? '<div class="task-detail-block-text">' + t.workDesc + '</div>' : '<div class="task-detail-empty">Не заполнено</div>';
  html += '</div>';
  // MR
  if (t.mr) {
    html += '<div class="task-detail-block"><div class="task-detail-block-title">Merge Request</div>';
    html += '<div style="font-size:13px"><a href="#" style="color:var(--accent);text-decoration:none;font-weight:600">' + t.mr + '</a></div></div>';
  }
  // Mentor comment (if returned/rejected)
  if (t.mentor_comments && t.mentor_comments.length) {
    html += '<div class="task-detail-block"><div class="task-detail-block-title">Комментарии ментора</div>';
    t.mentor_comments.forEach(function(c) {
      var color = c.action === 'Отклонение' || c.action === 'Возврат' ? 'var(--danger)' : c.action === 'Принятие' ? 'var(--success)' : 'var(--accent)';
      html += '<div style="margin-bottom:8px;padding:8px 12px;background:var(--surface);border-radius:7px;border-left:3px solid ' + color + ';font-size:13px;color:var(--text-secondary);line-height:1.6">';
      html += '<span style="font-size:11px;font-weight:700;color:' + color + ';text-transform:uppercase;letter-spacing:0.03em">' + c.action + '</span><br>';
      html += c.text + '</div>';
    });
    html += '</div>';
  }
  // Mentor action buttons
  if (mentorActions && (ds === 'pending_approval' || ds === 'review')) {
    var approveLabel = ds === 'pending_approval' ? 'Аппрувить' : 'Принять';
    var rejectLabel = ds === 'pending_approval' ? 'Отклонить' : 'Вернуть';
    var approveAction = ds === 'pending_approval' ? 'approve' : 'accept';
    var rejectAction = ds === 'pending_approval' ? 'reject' : 'return';
    var rejectColor = ds === 'pending_approval' ? 'var(--danger)' : 'var(--warning)';

    html += '<div style="padding-top:16px;border-top:1px solid var(--border-light)">';
    // Two choice buttons
    html += '<div id="mentor-action-buttons" style="display:flex;gap:10px;margin-bottom:0">';
    html += '<button id="mentor-btn-approve" onclick="mentorSelectAction(\'' + approveAction + '\',' + idx + ')" style="flex:1;padding:10px;border:2px solid var(--success);border-radius:8px;background:var(--white);color:var(--success);font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.15s"><svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M3 8l4 4 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> ' + approveLabel + '</button>';
    html += '<button id="mentor-btn-reject" data-reject-color="' + rejectColor + '" onclick="mentorSelectAction(\'' + rejectAction + '\',' + idx + ')" style="flex:1;padding:10px;border:2px solid ' + rejectColor + ';border-radius:8px;background:var(--white);color:' + rejectColor + ';font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.15s"><svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg> ' + rejectLabel + '</button>';
    html += '</div>';
    // Comment area (hidden until action selected)
    html += '<div id="mentor-comment-area" style="display:none;margin-top:12px">';
    html += '<div id="mentor-comment-label" style="font-size:12px;font-weight:600;margin-bottom:6px"></div>';
    html += '<textarea id="mentor-comment-input" style="width:100%;min-height:70px;padding:10px 12px;border:2px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;color:var(--text);resize:vertical;outline:none;transition:border-color 0.15s" placeholder=""></textarea>';
    html += '<button id="mentor-confirm-btn" style="margin-top:10px;width:100%;padding:10px;border:none;border-radius:8px;color:#fff;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px"></button>';
    html += '</div>';
    html += '</div>';
  }
  html += '</div>';

  document.getElementById('task-detail-content').innerHTML = html;
  overlay.classList.add('open');
}

// ─── Mentor task actions ───
var _mentorAction = null;
var _mentorTaskIdx = -1;

function mentorSelectAction(action, idx) {
  _mentorAction = action;
  _mentorTaskIdx = idx;

  var approveBtn = document.getElementById('mentor-btn-approve');
  var rejectBtn = document.getElementById('mentor-btn-reject');
  var commentArea = document.getElementById('mentor-comment-area');
  var commentLabel = document.getElementById('mentor-comment-label');
  var commentInput = document.getElementById('mentor-comment-input');
  var confirmBtn = document.getElementById('mentor-confirm-btn');

  // Reset both buttons to outline
  approveBtn.style.background = 'var(--white)';
  rejectBtn.style.background = 'var(--white)';

  commentArea.style.display = 'block';

  // Reset both buttons to outline state
  approveBtn.style.background = 'var(--white)';
  approveBtn.style.color = 'var(--success)';
  rejectBtn.style.background = 'var(--white)';
  rejectBtn.style.color = rejectBtn.dataset.rejectColor || 'var(--danger)';

  if (action === 'approve') {
    approveBtn.style.background = 'var(--success)';
    approveBtn.style.color = '#fff';
    commentLabel.style.color = 'var(--success)';
    commentLabel.textContent = 'Комментарий (необязательно):';
    commentInput.placeholder = 'Пожелания, рекомендации к выполнению...';
    commentInput.style.borderColor = 'var(--success)';
    confirmBtn.style.background = 'var(--success)';
    confirmBtn.innerHTML = '<svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M3 8l4 4 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Подтвердить аппрув';
  } else if (action === 'reject') {
    rejectBtn.style.background = 'var(--danger)';
    rejectBtn.style.color = '#fff';
    commentLabel.style.color = 'var(--danger)';
    commentLabel.textContent = 'Причина отклонения *:';
    commentInput.placeholder = 'Опишите почему задача отклонена...';
    commentInput.style.borderColor = 'var(--danger)';
    confirmBtn.style.background = 'var(--danger)';
    confirmBtn.innerHTML = '<svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg> Подтвердить отклонение';
  } else if (action === 'accept') {
    approveBtn.style.background = 'var(--success)';
    approveBtn.style.color = '#fff';
    commentLabel.style.color = 'var(--success)';
    commentLabel.textContent = 'Комментарий (что сделано хорошо, замечания):';
    commentInput.placeholder = 'Задача выполнена качественно...';
    commentInput.style.borderColor = 'var(--success)';
    confirmBtn.style.background = 'var(--success)';
    confirmBtn.innerHTML = '<svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M3 8l4 4 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Подтвердить принятие';
  } else if (action === 'return') {
    rejectBtn.style.background = 'var(--warning)';
    rejectBtn.style.color = '#fff';
    commentLabel.style.color = 'var(--warning)';
    commentLabel.textContent = 'Что нужно доработать *:';
    commentInput.placeholder = 'Опишите замечания к работе...';
    commentInput.style.borderColor = 'var(--warning)';
    confirmBtn.style.background = 'var(--warning)';
    confirmBtn.innerHTML = '<svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M4 8h8M8 4l-4 4 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Подтвердить возврат';
  }

  confirmBtn.onclick = mentorConfirmAction;
  commentInput.value = '';
  commentInput.focus();
}

function mentorConfirmAction() {
  var comment = document.getElementById('mentor-comment-input').value.trim();
  var t = sTasks[_mentorTaskIdx];

  if (!t.mentor_comments) t.mentor_comments = [];
  var actionLabels = {approve:'Аппрув', reject:'Отклонение', accept:'Принятие', return:'Возврат'};

  if (_mentorAction === 'approve') {
    t.status = 'approved';
    if (comment) t.mentor_comments.push({action:actionLabels[_mentorAction], text:comment});
  } else if (_mentorAction === 'reject') {
    if (!comment) { alert('Укажите причину отклонения'); return; }
    t.status = 'rejected';
    t.mentor_comments.push({action:actionLabels[_mentorAction], text:comment});
  } else if (_mentorAction === 'accept') {
    t.status = 'done';
    if (comment) t.mentor_comments.push({action:actionLabels[_mentorAction], text:comment});
  } else if (_mentorAction === 'return') {
    if (!comment) { alert('Укажите что нужно доработать'); return; }
    t.status = 'returned';
    t.mentor_comments.push({action:actionLabels[_mentorAction], text:comment});
  }

  document.getElementById('task-detail-overlay').classList.remove('open');
  _mentorAction = null;
  _mentorTaskIdx = -1;
  if (typeof initTeamView === 'function') initTeamView();
}

function initScrollbars(containerId) {
  document.querySelectorAll('#' + containerId + ' .gantt-sprint-block').forEach(block => {
    const scroll = block.querySelector('.gantt-sprint-scroll');
    const bar = block.querySelector('.gantt-custom-scrollbar');
    const thumb = bar.querySelector('.thumb');
    if (!scroll || !bar || !thumb) return;
    function update() {
      const can = scroll.scrollWidth > scroll.clientWidth;
      bar.style.display = can ? 'block' : 'none';
      if (!can) return;
      const tw = bar.clientWidth;
      const r = scroll.clientWidth / scroll.scrollWidth;
      const thw = Math.max(30, r * tw);
      thumb.style.width = thw + 'px';
      const ms = scroll.scrollWidth - scroll.clientWidth;
      const mt = tw - thw;
      thumb.style.left = (ms > 0 ? (scroll.scrollLeft / ms) * mt : 0) + 'px';
    }
    scroll.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    update();
    let dragging = false, startX = 0, startLeft = 0;
    thumb.addEventListener('mousedown', e => { dragging = true; startX = e.clientX; startLeft = parseFloat(thumb.style.left) || 0; thumb.classList.add('active'); e.preventDefault(); });
    document.addEventListener('mousemove', e => { if (!dragging) return; const dx = e.clientX - startX; const tw2 = bar.clientWidth; const thw2 = thumb.offsetWidth; const mt2 = tw2 - thw2; const nl = Math.max(0, Math.min(mt2, startLeft + dx)); thumb.style.left = nl + 'px'; const ms2 = scroll.scrollWidth - scroll.clientWidth; scroll.scrollLeft = mt2 > 0 ? (nl / mt2) * ms2 : 0; });
    document.addEventListener('mouseup', () => { dragging = false; thumb.classList.remove('active'); });
    bar.addEventListener('click', e => { if (e.target === thumb) return; const rect = bar.getBoundingClientRect(); const cx = e.clientX - rect.left; const ms3 = scroll.scrollWidth - scroll.clientWidth; scroll.scrollLeft = (cx / bar.clientWidth) * ms3; });
  });
}

// ─── Members renderer ───
function renderMembers(containerId, currentUser) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = teamMembers.map(m => {
    const badges = (m.leader ? '<span class="member-leader">Лидер</span>' : '') + (m.name === currentUser ? '<span class="member-you">Вы</span>' : '');
    return '<div class="member-chip"><div class="member-avatar" style="background:' + m.color + '">' + m.initials + '</div><div><div class="member-name">' + m.name + ' ' + badges + '</div><div class="member-role-label">' + m.role + '</div></div></div>';
  }).join('');
}

// ─── Evidence (report tasks from gantt) ───
function renderEvidence(currentUser) {
  const el = document.getElementById('evidence-list');
  if (!el) return;
  const myTasks = sTasks.filter(t => t.sprint === 2 && t.person === currentUser);
  const statusLabels = {pending_approval:'Ожидает аппрува', approved:'Назначена', progress:'В работе', review:'На ревью', returned:'Возвращена', done:'Готово', rejected:'Отклонена', overdue:'В работе'};
  const statusBg = {pending_approval:'var(--surface-alt)', approved:'var(--surface-alt)', progress:'#dbeafe', review:'var(--purple-bg)', returned:'var(--warning-bg)', done:'var(--success-bg)', rejected:'var(--danger-bg)', overdue:'#dbeafe'};
  const statusColor = {pending_approval:'var(--text-muted)', approved:'var(--text-muted)', progress:'var(--accent)', review:'var(--purple)', returned:'var(--warning)', done:'var(--success)', rejected:'var(--danger)', overdue:'var(--accent)'};
  let html = '';
  myTasks.forEach(t => {
    const ds = calcTaskStatus(t);
    const mrHtml = t.mr ? '<a href="#" style="color:var(--accent);text-decoration:none;font-weight:600;margin-left:auto">' + t.mr + '</a>' : '<span style="color:var(--text-muted);font-style:italic;margin-left:auto">нет MR</span>';
    html += '<div style="display:flex;align-items:center;gap:8px;font-size:12px;padding:6px 8px;background:var(--surface);border-radius:5px"><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:' + statusBg[ds] + ';color:' + statusColor[ds] + '">' + statusLabels[ds] + '</span><span style="flex:1">' + t.name + '</span>' + mrHtml + '</div>';
  });
  if (!myTasks.length) html = '<div style="font-size:12px;color:var(--text-muted);padding:8px">Нет задач. Добавьте через диаграмму Ганта.</div>';
  el.innerHTML = html;
  const totalH = myTasks.reduce((s, t) => s + t.hours, 0);
  const hoursInput = document.querySelector('#ptab-s-reports input[type="number"]');
  if (hoursInput) hoursInput.value = totalH;
}

// ─── Profile HTML (shared between roles) ───
function getProfileHtml(userData) {
  return `
  <h1 class="page-title">Мой профиль</h1>
  <div class="page-context">Информация о вас — видна менторам и координатору при распределении по проектам</div>
  <div class="profile-grid">
    <div class="profile-card">
      <div class="profile-card-title">
        <svg width="18" height="18" fill="none" viewBox="0 0 18 18"><circle cx="9" cy="6" r="3.5" stroke="currentColor" stroke-width="1.4"/><path d="M2.5 17c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" stroke="currentColor" stroke-width="1.4"/></svg>
        Основная информация
      </div>
      <div class="profile-field"><label class="profile-label">ФИО</label><input class="profile-input" value="${userData.fullName}" readonly></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="profile-field"><label class="profile-label">Курс</label><input class="profile-input" value="${userData.course}" readonly></div>
        <div class="profile-field"><label class="profile-label">Группа</label><input class="profile-input" value="${userData.group}" readonly></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="profile-field"><label class="profile-label">Средний балл</label><input class="profile-input" value="${userData.gpa}" readonly></div>
        <div class="profile-field"><label class="profile-label">Направление</label><input class="profile-input" value="${userData.direction}" readonly></div>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:8px">Эти данные загружены из информационной системы МФТИ</div>
    </div>
    <div class="profile-card">
      <div class="profile-card-title">
        <svg width="18" height="18" fill="none" viewBox="0 0 18 18"><rect x="2" y="3.5" width="14" height="11" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M2 6l7 4.5L16 6" stroke="currentColor" stroke-width="1.4"/></svg>
        Контакты
      </div>
      <div class="profile-field"><label class="profile-label">Email *</label><input class="profile-input" value="${userData.email}" placeholder="email@phystech.edu"></div>
      <div class="profile-field"><label class="profile-label">Telegram</label><input class="profile-input" value="${userData.tg}" placeholder="@username"></div>
      <div class="profile-field"><label class="profile-label">Телефон</label><input class="profile-input" value="${userData.phone}" placeholder="+7 (___) ___-__-__"></div>
    </div>
    <div class="profile-card profile-card-full">
      <div class="profile-card-title">
        <svg width="18" height="18" fill="none" viewBox="0 0 18 18"><path d="M9 2l2.1 4.3 4.7.7-3.4 3.3.8 4.7L9 12.8 4.8 15l.8-4.7L2.2 7l4.7-.7L9 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
        Навыки и компетенции
      </div>
      <div class="profile-field">
        <label class="profile-label">Языки программирования и технологии</label>
        <div class="skill-tags-input" id="skills-container" onclick="document.getElementById('skill-new').focus()">
          ${userData.skills.map(s => '<span class="skill-tag">' + s + ' <button onclick="this.parentElement.remove()">✕</button></span>').join('')}
          <input class="skill-input" id="skill-new" placeholder="Добавить навык..." onkeydown="if(event.key==='Enter'&&this.value.trim()){event.preventDefault();const t=document.createElement('span');t.className='skill-tag';t.innerHTML=this.value.trim()+' <button onclick=&quot;this.parentElement.remove()&quot;>✕</button>';this.parentElement.insertBefore(t,this);this.value='';}">
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Нажмите Enter для добавления нового навыка</div>
      </div>
      <div class="profile-field">
        <label class="profile-label">О себе</label>
        <textarea class="profile-textarea" placeholder="Расскажите о своём опыте...">${userData.about}</textarea>
      </div>
    </div>
    <div class="profile-card">
      <div class="profile-card-title">
        <svg width="18" height="18" fill="none" viewBox="0 0 18 18"><path d="M7.5 10.5a4 4 0 005.2.4l2.1-2.1a4 4 0 00-5.6-5.6L7.8 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M10.5 7.5a4 4 0 00-5.2-.4L3.2 9.2a4 4 0 005.6 5.6l1.3-1.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        Ссылки
      </div>
      <div id="links-list">
        ${userData.links.map(l => '<div class="link-row"><select class="link-type"><option' + (l.type==='GitHub'?' selected':'') + '>GitHub</option><option' + (l.type==='GitLab'?' selected':'') + '>GitLab</option><option' + (l.type==='Портфолио'?' selected':'') + '>Портфолио</option><option' + (l.type==='Другое'?' selected':'') + '>Другое</option></select><input class="profile-input" value="' + l.url + '" style="flex:1"><button class="link-remove" onclick="this.parentElement.remove()">✕</button></div>').join('')}
      </div>
      <button onclick="addLink()" style="margin-top:8px;padding:7px 14px;border:1px dashed var(--border);border-radius:7px;background:none;color:var(--text-muted);font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:5px;transition:all 0.15s" onmouseover="this.style.borderColor='var(--accent)';this.style.color='var(--accent)'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-muted)'">${SVG_PLUS} Добавить ссылку</button>
    </div>
    <div class="profile-card">
      <div class="profile-card-title">
        <svg width="18" height="18" fill="none" viewBox="0 0 18 18"><path d="M10 2H5a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7l-5-5z" stroke="currentColor" stroke-width="1.4"/><path d="M10 2v5h5" stroke="currentColor" stroke-width="1.4"/></svg>
        Файлы
      </div>
      <div id="files-list">
        ${userData.files.map(f => '<div class="file-item"><div class="file-icon"><svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M9 2H5a1.5 1.5 0 00-1.5 1.5v9A1.5 1.5 0 005 14h6a1.5 1.5 0 001.5-1.5V5.5L9 2z" stroke="currentColor" stroke-width="1.2"/><path d="M9 2v4h3.5" stroke="currentColor" stroke-width="1.2"/></svg></div><div><div class="file-name">' + f.name + '</div><div class="file-size">' + f.size + '</div></div><button class="file-remove" onclick="this.parentElement.remove()">✕</button></div>').join('')}
      </div>
      <div class="file-drop-zone" onclick="alert('Выберите файл (PDF, DOCX — до 10 МБ)')">
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" style="color:var(--text-muted);margin-bottom:4px"><path d="M12 16V8m0 0l-3 3m3-3l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 16.7V19a2 2 0 01-2 2H6a2 2 0 01-2-2v-2.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        <div style="font-size:13px;color:var(--text-muted)">Перетащите файл или нажмите для загрузки</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">PDF, DOCX — до 10 МБ. Изображения не поддерживаются.</div>
      </div>
    </div>
  </div>
  <div class="profile-save-bar">
    <button style="padding:10px 20px;border:1px solid var(--border);border-radius:8px;background:var(--white);color:var(--text-secondary);font-size:13px;font-weight:600;font-family:inherit;cursor:pointer" onclick="alert('Изменения отменены')">Отменить</button>
    <button style="padding:10px 28px;border:none;border-radius:8px;background:var(--primary);color:#fff;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer" onclick="alert('Профиль сохранён!')">Сохранить изменения</button>
  </div>`;
}

// ─── Данные пользователя (для профиля) ───
const studentUserData = {
  fullName: 'Стародубов Александр Юрьевич',
  course: '2 курс бакалавриата',
  group: 'Б05-321',
  gpa: '7.2',
  direction: 'Программная инженерия',
  email: 'starodubov.ayu@phystech.edu',
  tg: '@starodubov_a',
  phone: '+7 (999) 123-45-67',
  skills: ['Python','Django','PostgreSQL','Git','Docker','REST API'],
  about: 'Имею опыт веб-разработки на Python/Django. В прошлом семестре участвовал в проекте СУПП ВШПИ — разрабатывал сервис распределения студентов по проектам. Интересуюсь backend-разработкой и DevOps.',
  links: [
    {type:'GitLab', url:'https://gitlab.com/starodubov'},
    {type:'GitHub', url:'https://github.com/starodubov-a'}
  ],
  files: [
    {name:'Резюме_Стародубов.pdf', size:'245 КБ · загружен 15 мар 2026'},
    {name:'Сертификат_Python_Advanced.pdf', size:'128 КБ · загружен 10 мар 2026'}
  ]
};

// ─── Моковые данные личных отчётов ───
const memberReports = {
  2: {
    'Стародубов А.': {
      saved: true,
      text: 'Реализовал REST API для управления проектами (CRUD-операции). Интегрировал OAuth-авторизацию через МФТИ. Координировал работу команды, проводил code review.',
      hours: 36
    },
    'Кузнецов М.': {
      saved: true,
      text: 'Разрабатывал компоненты UI: дашборд ментора, форма создания проекта. Интегрировал REST API в фронтенд. Настроил адаптивную вёрстку.',
      hours: 24
    },
    'Лебедева Н.': {
      saved: false,
      text: '',
      hours: 0
    },
    'Волков Д.': {
      saved: true,
      text: 'Написал unit-тесты для модуля авторизации. Составил тест-план. Настроил CI/CD пайплайн в GitLab с автоматическим запуском тестов.',
      hours: 18
    }
  },
  1: {
    'Стародубов А.': {
      saved: true, submitted: true,
      text: 'Структура проекта Django, доменные модели, координация команды.',
      hours: 20
    },
    'Кузнецов М.': {
      saved: true, submitted: true,
      text: 'Создал прототип интерфейса в Figma: основные экраны дашборда, каталог проектов, формы регистрации. Подготовил UI-кит с компонентами для команды.',
      hours: 24
    },
    'Лебедева Н.': {
      saved: true, submitted: true,
      text: 'Провела анализ требований к системе, составила карту пользовательских историй, подготовила документ с функциональными требованиями.',
      hours: 16
    },
    'Волков Д.': {
      saved: true, submitted: true,
      text: 'Настроил Docker Compose окружение для разработки, написал начальные тесты.',
      hours: 12
    }
  }
};

// ─── Рендер задач участника для отчёта (клик открывает попап) ───
function renderMemberTasks(person, sprintNum, editable) {
  const tasks = sTasks.filter(t => t.person === person && t.sprint === sprintNum);
  if (!tasks.length) return '<div style="font-size:12px;color:var(--text-muted);padding:6px 0">Нет задач в этом спринте</div>';
  const dsMap = {pending_approval:'Ожидает аппрува', approved:'Назначена', progress:'В работе', review:'На ревью', returned:'Возвращена', done:'Готово', rejected:'Отклонена', overdue:'В работе'};
  const dsBg = {pending_approval:'var(--surface-alt)', approved:'var(--surface-alt)', progress:'#dbeafe', review:'var(--purple-bg)', returned:'var(--warning-bg)', done:'var(--success-bg)', rejected:'var(--danger-bg)', overdue:'#dbeafe'};
  const dsColor = {pending_approval:'var(--text-muted)', approved:'var(--text-muted)', progress:'var(--accent)', review:'var(--purple)', returned:'var(--warning)', done:'var(--success)', rejected:'var(--danger)', overdue:'var(--accent)'};

  let html = '';
  tasks.forEach(t => {
    const ds = sprintNum === 2 ? calcTaskStatus(t) : t.status;
    const globalIdx = sTasks.indexOf(t);
    const mrHtml = t.mr ? '<span style="color:var(--accent);font-weight:600;font-size:11px;flex-shrink:0">' + t.mr + '</span>' : '';
    const clickFn = editable ? 'openTaskModal(' + globalIdx + ')' : 'showTaskDetail(' + globalIdx + ')';

    html += '<div onclick="' + clickFn + '" style="border:1px solid var(--border-light);border-radius:6px;margin-bottom:4px;display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;font-size:12px;transition:background 0.1s" onmouseover="this.style.background=\'var(--surface)\'" onmouseout="this.style.background=\'\'">';
    const rptOverdueRing = t.wasOverdue ? ';outline:1px solid var(--danger);outline-offset:0px' : '';
    html += '<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:600;background:' + dsBg[ds] + ';color:' + dsColor[ds] + ';white-space:nowrap;flex-shrink:0' + rptOverdueRing + '">' + dsMap[ds] + '</span>';
    html += '<span style="font-weight:500;color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + t.name + '</span>';
    html += mrHtml;
    html += '<span style="color:var(--text-muted);font-size:11px;flex-shrink:0">' + t.hours + 'ч</span>';
    html += '</div>';
  });
  return html;
}

// ─── Рендер карточки отчёта участника ───
function renderMemberReportCard(person, sprintNum, isCurrentUser) {
  const member = teamMembers.find(m => m.name === person);
  if (!member) return '';
  const tasks = sTasks.filter(t => t.person === person && t.sprint === sprintNum);
  const totalHours = tasks.reduce((s, t) => s + t.hours, 0);
  const leaderBadge = member.leader ? '<span class="member-leader">Лидер</span>' : '';
  const youBadge = isCurrentUser ? '<span class="member-you">Вы</span>' : '';
  const border = isCurrentUser ? 'border:2px solid var(--accent)' : 'border:1px solid var(--border-light)';

  let html = '<div style="margin-bottom:8px;padding:14px 16px;' + border + ';border-radius:8px">';
  html += '<div style="display:flex;align-items:center;gap:10px;' + (tasks.length ? 'margin-bottom:10px' : '') + '">';
  html += '<div style="width:28px;height:28px;border-radius:50%;background:' + member.color + ';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff">' + member.initials + '</div>';
  html += '<div style="font-size:13px;font-weight:600">' + person + '</div>';
  html += leaderBadge + youBadge;
  if (totalHours) html += '<span style="font-size:11px;color:var(--text-muted);margin-left:auto">' + totalHours + 'ч</span>';
  html += '</div>';
  if (tasks.length) {
    html += '<div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Задачи в спринте' + (isCurrentUser ? ' <span style="font-weight:400">(кликните для редактирования)</span>' : '') + ':</div>';
    html += renderMemberTasks(person, sprintNum, isCurrentUser);
  } else {
    html += '<div style="font-size:12px;color:var(--text-muted);margin-top:8px">Нет задач в этом спринте</div>';
  }
  html += '</div>';
  return html;
}

// ─── Полный рендер блока "Личные отчёты" ───
function renderPersonalReports(containerId, currentUser, sprintNum) {
  const el = document.getElementById(containerId);
  if (!el) return;
  window._currentReportUser = currentUser;
  let html = '';
  // Current user first
  html += renderMemberReportCard(currentUser, sprintNum, true);
  // Others
  teamMembers.filter(m => m.name !== currentUser).forEach(m => {
    html += renderMemberReportCard(m.name, sprintNum, false);
  });
  el.innerHTML = html;
}

// ─── Рендер отчётов прошлых спринтов (readonly для всех) ───
function renderPastSprintReports(containerId, sprintNum, mentorComment, score) {
  const el = document.getElementById(containerId);
  if (!el) return;
  let html = '';
  teamMembers.forEach(m => {
    html += renderMemberReportCard(m.name, sprintNum);
  });
  if (mentorComment) {
    html += '<div style="padding:12px 14px;background:var(--surface);border-radius:7px;border-left:3px solid var(--accent);margin-top:12px">';
    html += '<div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:4px">Комментарий ментора</div>';
    html += '<div style="font-size:13px;color:var(--text-secondary);line-height:1.6">' + mentorComment + '</div>';
    if (score) html += '<div style="margin-top:6px;font-size:13px;font-weight:700;color:var(--success)">Оценка: ' + score + '</div>';
    html += '</div>';
  }
  el.innerHTML = html;
}
