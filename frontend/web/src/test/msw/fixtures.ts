/*
 * Deterministic fixtures for MSW handlers (tests + Playwright e2e).
 *
 * Shapes mirror what backend/project-service returns today (см. swagger.yaml
 * + internal/models). Values are intentionally minimal — добавляй поля
 * только тогда, когда у конкретного e2e сценария появится зависимость.
 *
 * Naming convention: `fixture<Entity>` for entities, `seed<Resource>` for
 * pre-built collections.
 */

export const fixtureUsers = [
  {
    id: 1,
    firstName: 'Виктор',
    lastName: 'Тимохин',
    middleName: 'Николаевич',
    email: 'mentor@example.test',
    role: 'mentor' as const,
  },
  {
    id: 2,
    firstName: 'Анна',
    lastName: 'Кузнецова',
    middleName: 'Сергеевна',
    email: 'coordinator@example.test',
    role: 'coordinator' as const,
  },
  {
    id: 3,
    firstName: 'Иван',
    lastName: 'Петров',
    middleName: 'Алексеевич',
    email: 'teamlead@example.test',
    role: 'teamlead' as const,
    course: '2',
    group: 'Б05-242',
    gpa: 4.5,
  },
  {
    id: 4,
    firstName: 'Алексей',
    lastName: 'Стародубов',
    middleName: 'Юрьевич',
    email: 'student@example.test',
    role: 'student' as const,
    course: '2',
    group: 'Б05-241',
    gpa: 4.7,
  },
  {
    id: 5,
    firstName: 'Мария',
    lastName: 'Иванова',
    middleName: 'Дмитриевна',
    email: 'student2@example.test',
    role: 'student' as const,
    course: '2',
    group: 'Б05-243',
    gpa: 4.2,
  },
  {
    id: 6,
    firstName: 'Павел',
    lastName: 'Сидоров',
    middleName: 'Олегович',
    email: 'student3@example.test',
    role: 'student' as const,
    course: '2',
    group: 'Б05-244',
    gpa: 4.0,
  },
];

export const STUDENT_ID = 4;
export const TEAMLEAD_ID = 3;
export const MENTOR_ID = 1;
export const COORDINATOR_ID = 2;

const NOW = '2026-05-04T08:00:00Z';
const SPRINT_START = '2026-04-20';
const SPRINT_END = '2026-05-10';

export const fixtureProjects = [
  {
    id: 100,
    title: 'СУПП ВШПИ МФТИ',
    status: 'Активный' as const,
    mentorId: MENTOR_ID,
    company: 'ВШПИ МФТИ',
    courses: [2],
    description: 'Система управления проектным практикумом ВШПИ МФТИ',
    technologies: ['React', 'TypeScript', 'Go', 'PostgreSQL'],
    teamSizeMin: 3,
    teamSizeMax: 5,
    numTeams: 1,
    filledTeams: 1,
    acceptedCount: 4,
    availableSlots: 1,
    minGpa: 3.5,
    currentSprint: { id: 201, number: 2, status: 'Активный', startDate: SPRINT_START, endDate: SPRINT_END },
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 101,
    title: 'AI чат-бот для абитуриентов',
    status: 'Опубликован' as const,
    mentorId: MENTOR_ID,
    company: 'Приёмная комиссия МФТИ',
    courses: [2, 3],
    description: 'Бот, отвечающий на вопросы абитуриентов в Telegram',
    technologies: ['Python', 'LangChain', 'PostgreSQL'],
    teamSizeMin: 2,
    teamSizeMax: 4,
    numTeams: 1,
    filledTeams: 0,
    acceptedCount: 0,
    availableSlots: 4,
    minGpa: 3.0,
    currentSprint: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 102,
    title: 'Платформа онлайн-олимпиад',
    status: 'На утверждении' as const,
    mentorId: MENTOR_ID,
    company: 'Учебный отдел МФТИ',
    courses: [2],
    description: 'Платформа для проведения учебных олимпиад по физике',
    technologies: ['Next.js', 'Postgres'],
    teamSizeMin: 3,
    teamSizeMax: 5,
    numTeams: 1,
    filledTeams: 0,
    acceptedCount: 0,
    availableSlots: 5,
    submittedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
  },
  /*
   * Архивный проект — у того же ментора (Тимохин В.) одна команда (id=310),
   * два закрытых спринта, набор финальных оценок и пара встреч. Используется
   * в e2e/golden/mentor-archive.spec.ts и Storybook ArchiveTeamPage.
   */
  {
    id: 110,
    title: 'Архивный: Цифровой двойник кампуса',
    status: 'Завершён' as const,
    mentorId: MENTOR_ID,
    company: 'ЦИТ МФТИ',
    courses: [2],
    description: 'Веб-витрина цифрового двойника кампуса (закончен в осеннем семестре).',
    technologies: ['React', 'Three.js', 'PostgreSQL'],
    teamSizeMin: 3,
    teamSizeMax: 5,
    numTeams: 1,
    filledTeams: 1,
    acceptedCount: 4,
    availableSlots: 0,
    minGpa: 3.5,
    currentSprint: null,
    createdAt: '2025-09-01T08:00:00Z',
    updatedAt: '2025-10-30T08:00:00Z',
  },
];

export const fixtureSprints = [
  { id: 200, projectId: 100, number: 1, startDate: '2026-03-30', endDate: '2026-04-19', status: 'Завершён' as const },
  { id: 201, projectId: 100, number: 2, startDate: SPRINT_START, endDate: SPRINT_END, status: 'Активный' as const },
  { id: 202, projectId: 100, number: 3, startDate: '2026-05-11', endDate: '2026-05-31', status: 'Запланирован' as const },
  // Архивный проект id=110: два завершённых спринта.
  { id: 220, projectId: 110, number: 1, startDate: '2025-09-15', endDate: '2025-10-05', status: 'Завершён' as const },
  { id: 221, projectId: 110, number: 2, startDate: '2025-10-06', endDate: '2025-10-26', status: 'Завершён' as const },
];

export const fixtureTeam = {
  id: 300,
  projectId: 100,
  name: 'Команда «СУПП»',
  leaderId: TEAMLEAD_ID,
  leader: {
    id: TEAMLEAD_ID,
    firstName: 'Иван',
    lastName: 'Петров',
    middleName: 'Алексеевич',
    email: 'teamlead@example.test',
    role: 'teamlead' as const,
  },
  members: [
    {
      id: 401,
      teamId: 300,
      userId: TEAMLEAD_ID,
      isLeader: true,
      roleInTeam: 'Тимлид',
      user: fixtureUsers[2],
    },
    {
      id: 402,
      teamId: 300,
      userId: STUDENT_ID,
      isLeader: false,
      roleInTeam: 'Backend',
      user: fixtureUsers[3],
    },
    {
      id: 403,
      teamId: 300,
      userId: 5,
      isLeader: false,
      roleInTeam: 'Frontend',
      user: fixtureUsers[4],
    },
    {
      id: 404,
      teamId: 300,
      userId: 6,
      isLeader: false,
      roleInTeam: 'Аналитик',
      user: fixtureUsers[5],
    },
  ],
};

/**
 * Тимлид-вьюшка richer DTO (см. teams.ts::TeamContextDto).
 * Бэк отдаёт это с GET /api/users/{id}/team. Используется как для тимлида,
 * так и для рядового студента (если он распределён) — поле isLeader
 * различается.
 */
export const fixtureTeamContext = {
  teamId: 300,
  teamName: 'Команда «СУПП»',
  projectId: 100,
  projectTitle: 'СУПП ВШПИ МФТИ',
  initiator: 'ВШПИ МФТИ',
  mentor: { userId: MENTOR_ID, firstName: 'Виктор', lastName: 'Тимохин', middleName: 'Николаевич' },
  currentSprint: { id: 201, number: 2, startDate: SPRINT_START, endDate: SPRINT_END, status: 'Активный' as const },
  sprintsTotal: 3,
  members: [
    { userId: TEAMLEAD_ID, firstName: 'Иван', lastName: 'Петров', middleName: 'Алексеевич', role: 'teamlead' as const, projectRole: 'Тимлид', isLeader: true },
    { userId: STUDENT_ID, firstName: 'Алексей', lastName: 'Стародубов', middleName: 'Юрьевич', role: 'student' as const, projectRole: 'Backend', isLeader: false },
    { userId: 5, firstName: 'Мария', lastName: 'Иванова', middleName: 'Дмитриевна', role: 'student' as const, projectRole: 'Frontend', isLeader: false },
    { userId: 6, firstName: 'Павел', lastName: 'Сидоров', middleName: 'Олегович', role: 'student' as const, projectRole: 'Аналитик', isLeader: false },
  ],
};

export const fixtureTasks = [
  {
    id: 501,
    teamId: 300,
    sprintId: 201,
    assigneeId: TEAMLEAD_ID,
    name: 'API авторизации',
    description: 'X-User-Id headers',
    status: 'Готово' as const,
    hours: 8,
    startDate: SPRINT_START,
    endDate: '2026-04-25',
    mr: 'https://git/mr/12',
    workDescription: 'Готово',
    history: [
      { day: 4, event: 'review' as const },
      { day: 5, event: 'accepted' as const },
    ],
  },
  { id: 502, teamId: 300, sprintId: 201, assigneeId: TEAMLEAD_ID, name: 'Code review каталога', description: null, status: 'В работе' as const, hours: 4, startDate: '2026-04-26', endDate: '2026-04-29', mr: null, workDescription: null },
  {
    id: 503,
    teamId: 300,
    sprintId: 201,
    assigneeId: STUDENT_ID,
    name: 'MSW e2e',
    description: 'Подключить и написать golden-path',
    status: 'На ревью' as const,
    hours: 12,
    startDate: '2026-04-27',
    endDate: '2026-05-04',
    mr: 'https://git/mr/27',
    workDescription: 'Готово к ревью',
    history: [{ day: 13, event: 'review' as const }],
  },
  { id: 504, teamId: 300, sprintId: 201, assigneeId: STUDENT_ID, name: 'CI integration', description: null, status: 'Назначена' as const, hours: 6, startDate: '2026-05-05', endDate: '2026-05-09', mr: null, workDescription: null },
  { id: 505, teamId: 300, sprintId: 201, assigneeId: 5, name: 'Студент-каталог UI', description: null, status: 'В работе' as const, hours: 10, startDate: SPRINT_START, endDate: '2026-05-02', mr: null, workDescription: null },
  { id: 506, teamId: 300, sprintId: 201, assigneeId: 6, name: 'Аналитика flow распределения', description: null, status: 'Ожидает аппрува' as const, hours: 5, startDate: SPRINT_START, endDate: '2026-04-24', mr: null, workDescription: null },
  {
    id: 507,
    teamId: 300,
    sprintId: 201,
    assigneeId: 6,
    name: 'Документация ролей',
    description: null,
    status: 'Возвращена' as const,
    hours: 4,
    startDate: '2026-04-28',
    endDate: '2026-05-03',
    mr: null,
    workDescription: 'Доработать с учётом комментариев',
    history: [
      { day: 11, event: 'review' as const },
      { day: 12, event: 'returned' as const },
    ],
  },
];

/*
 * Командные отчёты команды 300:
 *   - sprint 200 (Завершён) → «Проверен» с комментарием ментора, прошедший
 *   - sprint 201 (Активный) → «Отправлен», ждёт проверки
 *
 * Используются как для unit-тестов, так и для e2e-сценария таба «Отчёты
 * по спринтам» у ментора. Кейс «Черновик» (только что создан) намеренно
 * не покрываем — он есть в сторибуке.
 */
export const fixtureTeamReports = [
  {
    id: 600,
    sprintId: 201,
    teamId: 300,
    summary: 'Закончили auth, собираем UI каталога.',
    problems: 'Нет публичной части без логина.',
    nextPlan: 'Подключить MSW и e2e.',
    status: 'Отправлен' as const,
    submittedAt: '2026-04-01T10:00:00Z',
    reviewedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 599,
    sprintId: 200,
    teamId: 300,
    summary: 'Развёрнута начальная структура проекта (Django + DRF).',
    problems: 'Долго выбирали стек: Django vs FastAPI.',
    nextPlan: 'Доменные модели, стартовый dashboard.',
    status: 'Проверен' as const,
    mentorComment:
      'Хорошая работа на старте. Правильный выбор Django для данной задачи.',
    submittedAt: '2026-03-16T10:00:00Z',
    reviewedAt: '2026-03-17T09:00:00Z',
    createdAt: '2026-03-15T10:00:00Z',
    updatedAt: '2026-03-17T09:00:00Z',
  },
];

/** Backwards-compat: первый по умолчанию (текущий, sprint 201). */
export const fixtureTeamReport = fixtureTeamReports[0]!;

/** Оценки команды 300 за спринт 200 — все 4 студента, среднее 8/10. */
export const fixtureTeamSprintScores = [
  { id: 800, sprintId: 200, teamId: 300, studentId: TEAMLEAD_ID, score: 9, comment: 'Хорошая работа над API.', scoredById: MENTOR_ID },
  { id: 801, sprintId: 200, teamId: 300, studentId: STUDENT_ID, score: 8, comment: 'Чётко закрыл свои задачи.', scoredById: MENTOR_ID },
  { id: 802, sprintId: 200, teamId: 300, studentId: 5, score: 7, comment: 'UI — местами кривовато, но работает.', scoredById: MENTOR_ID },
  { id: 803, sprintId: 200, teamId: 300, studentId: 6, score: 8, comment: 'Аналитика на хорошем уровне.', scoredById: MENTOR_ID },
];

/*
 * Архивная команда (id=310) для проекта 110. Тот же тимлид/ментор, чтобы не
 * плодить пользователей; состав статически копируется из активной команды.
 */
export const fixtureArchiveTeam = {
  id: 310,
  projectId: 110,
  name: 'Команда «Кампус-2»',
  leaderId: TEAMLEAD_ID,
  leader: {
    id: TEAMLEAD_ID,
    firstName: 'Иван',
    lastName: 'Петров',
    middleName: 'Алексеевич',
    email: 'teamlead@example.test',
    role: 'teamlead' as const,
  },
  members: [
    { id: 411, teamId: 310, userId: TEAMLEAD_ID, isLeader: true, roleInTeam: 'Тимлид', user: fixtureUsers[2] },
    { id: 412, teamId: 310, userId: STUDENT_ID, isLeader: false, roleInTeam: 'Backend', user: fixtureUsers[3] },
    { id: 413, teamId: 310, userId: 5, isLeader: false, roleInTeam: 'Frontend', user: fixtureUsers[4] },
    { id: 414, teamId: 310, userId: 6, isLeader: false, roleInTeam: 'Аналитик', user: fixtureUsers[5] },
  ],
};

/* Финальные оценки команды 310 — итоговое среднее = (5+4+5+4+5+5)/6 = 4.7 */
export const fixtureArchiveSprintScores = [
  { id: 701, sprintId: 220, teamId: 310, studentId: TEAMLEAD_ID, score: 5, scoredById: MENTOR_ID },
  { id: 702, sprintId: 220, teamId: 310, studentId: STUDENT_ID, score: 4, scoredById: MENTOR_ID },
  { id: 703, sprintId: 220, teamId: 310, studentId: 5, score: 5, scoredById: MENTOR_ID },
  { id: 704, sprintId: 221, teamId: 310, studentId: TEAMLEAD_ID, score: 4, scoredById: MENTOR_ID },
  { id: 705, sprintId: 221, teamId: 310, studentId: STUDENT_ID, score: 5, scoredById: MENTOR_ID },
  { id: 706, sprintId: 221, teamId: 310, studentId: 5, score: 5, scoredById: MENTOR_ID },
];

export const fixtureArchiveTeamReports = [
  {
    id: 610,
    sprintId: 220,
    teamId: 310,
    summary: 'Развернули прототип, получили обратную связь от ЦИТ.',
    problems: 'Не хватало UX-исследований на старте.',
    nextPlan: 'Добавить онбординг и улучшить навигацию.',
    status: 'Проверен' as const,
    mentorComment: 'Хороший старт, акценты на UX поправили вовремя.',
    submittedAt: '2025-10-06T10:00:00Z',
    reviewedAt: '2025-10-07T09:00:00Z',
    createdAt: '2025-10-05T10:00:00Z',
    updatedAt: '2025-10-07T09:00:00Z',
  },
  {
    id: 611,
    sprintId: 221,
    teamId: 310,
    summary: 'Закрыли двойник кампуса, передали кодовую базу ЦИТ.',
    problems: 'Не успели покрыть e2e-тестами.',
    nextPlan: '—',
    status: 'Проверен' as const,
    mentorComment: 'Спасибо команде за работу!',
    submittedAt: '2025-10-27T10:00:00Z',
    reviewedAt: '2025-10-28T09:00:00Z',
    createdAt: '2025-10-26T10:00:00Z',
    updatedAt: '2025-10-28T09:00:00Z',
  },
];

/* Архивные задачи команды 310 — все «Готово» / «На ревью» (архивная палитра). */
export const fixtureArchiveTasks = [
  { id: 561, teamId: 310, sprintId: 220, assigneeId: TEAMLEAD_ID, name: 'API кампуса', description: null, status: 'Готово' as const, hours: 10, startDate: '2025-09-15', endDate: '2025-09-25', mr: 'https://git/mr/61', workDescription: 'Готово' },
  { id: 562, teamId: 310, sprintId: 220, assigneeId: STUDENT_ID, name: 'Авторизация', description: null, status: 'Готово' as const, hours: 8, startDate: '2025-09-16', endDate: '2025-09-24', mr: 'https://git/mr/62', workDescription: 'Готово' },
  { id: 563, teamId: 310, sprintId: 220, assigneeId: 5, name: 'Витрина двойника', description: null, status: 'На ревью' as const, hours: 14, startDate: '2025-09-18', endDate: '2025-10-04', mr: 'https://git/mr/63', workDescription: 'На ревью' },
  { id: 564, teamId: 310, sprintId: 221, assigneeId: TEAMLEAD_ID, name: 'Документация ЦИТ', description: null, status: 'Готово' as const, hours: 6, startDate: '2025-10-06', endDate: '2025-10-15', mr: null, workDescription: 'Готово' },
  { id: 565, teamId: 310, sprintId: 221, assigneeId: 5, name: 'Демо-страница', description: null, status: 'Готово' as const, hours: 8, startDate: '2025-10-10', endDate: '2025-10-26', mr: null, workDescription: 'Готово' },
];

/*
 * Встречи для команды 300 (активного проекта). Используются в e2e
 * mentor-team-meetings: 1 предстоящая (Ожидает подтверждения) + 1
 * прошедшая со summary, чтобы тест видел обе секции и мог нажать
 * «+ Назначить встречу».
 */
export const fixtureTeamMeetings = [
  {
    id: 700,
    teamId: 300,
    title: 'Обзор спринта 2',
    description: 'Демо API и макета дашборда. Планирование спринта 3.',
    meetingDate: '2099-04-01',
    startTime: '16:00',
    durationMinutes: 60,
    conferenceLink: 'https://example.test/meet/700',
    createdById: TEAMLEAD_ID,
    status: 'Ожидает подтверждения' as const,
  },
  {
    id: 701,
    teamId: 300,
    title: 'Постановка спринта 2',
    description: 'Распределение задач, обсуждение приоритетов.',
    meetingDate: '2020-03-17',
    startTime: '16:00',
    durationMinutes: 60,
    createdById: MENTOR_ID,
    summary:
      'Определены приоритеты: OAuth-авторизация, API проектов, макет дашборда.',
    status: 'Состоялась' as const,
  },
];

export const fixtureArchiveMeetings = [
  {
    id: 810,
    teamId: 310,
    sprintId: 220,
    title: 'Установочная встреча',
    description: 'Знакомство с заказчиком, согласование критериев приёмки.',
    meetingDate: '2025-09-16',
    startTime: '18:00',
    durationMinutes: 60,
    conferenceLink: 'https://example.test/meet/910',
    createdById: TEAMLEAD_ID,
    mentorConfirmed: true,
    summary: 'Договорились о контактах и форматах созвонов.',
    status: 'Состоялась' as const,
  },
  {
    id: 811,
    teamId: 310,
    sprintId: 221,
    title: 'Демо итогового прототипа',
    description: 'Презентация для ЦИТ.',
    meetingDate: '2025-10-25',
    startTime: '15:00',
    durationMinutes: 45,
    conferenceLink: 'https://example.test/meet/911',
    createdById: TEAMLEAD_ID,
    mentorConfirmed: true,
    summary: 'Прошло, доработок не требуется.',
    status: 'Состоялась' as const,
  },
];

export const fixtureNotifications = [
  {
    code: 'task_for_review',
    title: 'Задача готова к ревью',
    message: 'MSW e2e — assignee Стародубов А.',
    entity: 'task',
    entityId: 503,
    createdAt: '2026-05-04T07:00:00Z',
  },
  {
    code: 'team_report_submitted',
    title: 'Командный отчёт отправлен',
    message: 'Команда «СУПП» — спринт 1',
    entity: 'team_report',
    entityId: 600,
    createdAt: '2026-05-03T16:30:00Z',
  },
  {
    code: 'task_approved',
    title: 'Задача аппрувнута',
    message: 'API авторизации',
    entity: 'task',
    entityId: 501,
    createdAt: '2026-05-02T11:00:00Z',
  },
  {
    code: 'meeting_scheduled',
    title: 'Запланирована встреча',
    message: 'Демо спринта 2 — 2026-05-10 18:00',
    entity: 'meeting',
    entityId: 700,
    createdAt: '2026-05-01T09:15:00Z',
  },
  {
    code: 'project_application_new',
    title: 'Новые заявки в проект',
    message: 'AI чат-бот: 3 новые заявки',
    entity: 'project',
    entityId: 101,
    createdAt: '2026-04-30T08:30:00Z',
  },
  {
    code: 'task_deadline',
    title: 'Дедлайн задачи близко',
    message: 'CI integration — осталось 5 дней',
    entity: 'task',
    entityId: 504,
    createdAt: '2026-04-29T07:00:00Z',
  },
];

export const fixtureUserProfile = {
  userId: STUDENT_ID,
  telegram: '@stardubov',
  phone: null,
  about: 'Бэкенд-разработчик, Django/PostgreSQL.',
  skills: ['Python', 'Go', 'PostgreSQL', 'React'],
  links: [{ type: 'github', url: 'https://github.com/stardubov' }],
  notificationsSeenAt: null,
};

export const fixtureProjectApplicants = {
  projectId: 100,
  requirements: { minCourse: 2, minGpa: 3.5 },
  qualified: {
    priority1: [],
    priority2: [],
    priority3: [],
    priority4: [],
    priority5: [],
  },
  unqualified: {
    priority1: [],
    priority2: [],
    priority3: [],
    priority4: [],
    priority5: [],
  },
  teams: [
    { teamId: 300, name: 'Команда «СУПП»', maxSize: 5, members: [] },
  ],
};

export const fixtureDistributionStatus = {
  status: 'idle',
  message: 'Распределение не запускалось',
};

/*
 * Mentor distribution fixture — pixel-port из mentor.html view-distribution.
 *
 * Один проект (id=100, СУПП) с двумя незапущенными командами:
 *   - team 901 «Команда 1»: 2 принятых + 1 рекомендованный → не готов к launch
 *   - team 902 «Команда 2»: пустая → пул заявок здесь же
 *
 * Plus отдельный проект (id=120, «Анализ кода») с одной готовой к launch
 * командой (все приняты, кроме одного пустого слота).
 */
export const fixtureMentorDistribution = {
  projects: [
    {
      id: 100,
      title: 'СУПП ВШПИ МФТИ',
      status: 'Активный' as const,
      company: 'ВШПИ МФТИ',
      teamSizeMin: 3,
      teamSizeMax: 5,
      numTeams: 3,
      sprintsCount: 5,
      sprintWeeks: 3,
      deadline: '2026-06-15',
      requirements: { minCourse: 2, minGpa: 3.5 },
      teams: [
        {
          id: 901,
          name: 'Команда 1',
          launched: false,
          members: [
            {
              applicationId: 9001,
              studentId: 110,
              firstName: 'Александр',
              lastName: 'Стародубов',
              course: 2,
              group: 'Б05-211',
              gpa: 7.2,
              priority: 1,
              status: 'Принят' as const,
              qualified: true,
            },
            {
              applicationId: 9002,
              studentId: 111,
              firstName: 'Михаил',
              lastName: 'Кузнецов',
              course: 2,
              group: 'Б05-212',
              gpa: 6.8,
              priority: 1,
              status: 'Принят' as const,
              qualified: true,
            },
            {
              applicationId: 9003,
              studentId: 112,
              firstName: 'Дмитрий',
              lastName: 'Волков',
              course: 2,
              group: 'Б05-213',
              gpa: 6.5,
              priority: 2,
              status: 'Рекомендован' as const,
              qualified: true,
            },
          ],
        },
        {
          id: 902,
          name: 'Команда 2',
          launched: false,
          members: [],
        },
      ],
      pool: {
        qualified: {
          priority1: [
            {
              applicationId: 9101,
              studentId: 201,
              name: 'Иванова Мария',
              course: 3,
              gpa: 7.8,
              status: 'Ожидает' as const,
              teamId: null,
            },
          ],
          priority2: [
            {
              applicationId: 9102,
              studentId: 202,
              name: 'Новикова Анна',
              course: 3,
              gpa: 7.0,
              status: 'Ожидает' as const,
              teamId: null,
            },
          ],
          priority3: [
            {
              applicationId: 9103,
              studentId: 203,
              name: 'Белова Светлана',
              course: 2,
              gpa: 6.4,
              status: 'Ожидает' as const,
              teamId: null,
            },
          ],
          priority4: [],
          priority5: [
            {
              applicationId: 9104,
              studentId: 204,
              name: 'Громов Кирилл',
              course: 3,
              gpa: 6.7,
              status: 'Ожидает' as const,
              teamId: null,
            },
          ],
        },
        unqualified: {
          priority1: [],
          priority2: [],
          priority3: [
            {
              applicationId: 9105,
              studentId: 205,
              name: 'Орлов Владимир',
              course: 1,
              gpa: 4.8,
              status: 'Не подходит' as const,
              teamId: null,
            },
          ],
          priority4: [],
          priority5: [],
        },
      },
    },
  ],
};
