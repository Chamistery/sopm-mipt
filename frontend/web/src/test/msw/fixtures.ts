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
];

export const fixtureSprints = [
  { id: 200, projectId: 100, number: 1, startDate: '2026-03-30', endDate: '2026-04-19', status: 'Завершён' as const },
  { id: 201, projectId: 100, number: 2, startDate: SPRINT_START, endDate: SPRINT_END, status: 'Активный' as const },
  { id: 202, projectId: 100, number: 3, startDate: '2026-05-11', endDate: '2026-05-31', status: 'Запланирован' as const },
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
  { id: 501, teamId: 300, sprintId: 201, assigneeId: TEAMLEAD_ID, name: 'API авторизации', description: 'X-User-Id headers', status: 'Готово' as const, hours: 8, startDate: SPRINT_START, endDate: '2026-04-25', mr: 'https://git/mr/12', workDescription: 'Готово' },
  { id: 502, teamId: 300, sprintId: 201, assigneeId: TEAMLEAD_ID, name: 'Code review каталога', description: null, status: 'В работе' as const, hours: 4, startDate: '2026-04-26', endDate: '2026-04-29', mr: null, workDescription: null },
  { id: 503, teamId: 300, sprintId: 201, assigneeId: STUDENT_ID, name: 'MSW e2e', description: 'Подключить и написать golden-path', status: 'На ревью' as const, hours: 12, startDate: '2026-04-27', endDate: '2026-05-04', mr: 'https://git/mr/27', workDescription: 'Готово к ревью' },
  { id: 504, teamId: 300, sprintId: 201, assigneeId: STUDENT_ID, name: 'CI integration', description: null, status: 'Назначена' as const, hours: 6, startDate: '2026-05-05', endDate: '2026-05-09', mr: null, workDescription: null },
  { id: 505, teamId: 300, sprintId: 201, assigneeId: 5, name: 'Студент-каталог UI', description: null, status: 'В работе' as const, hours: 10, startDate: SPRINT_START, endDate: '2026-05-02', mr: null, workDescription: null },
  { id: 506, teamId: 300, sprintId: 201, assigneeId: 6, name: 'Аналитика flow распределения', description: null, status: 'Ожидает аппрува' as const, hours: 5, startDate: SPRINT_START, endDate: '2026-04-24', mr: null, workDescription: null },
  { id: 507, teamId: 300, sprintId: 201, assigneeId: 6, name: 'Документация ролей', description: null, status: 'Возвращена' as const, hours: 4, startDate: '2026-04-28', endDate: '2026-05-03', mr: null, workDescription: 'Доработать с учётом комментариев' },
];

export const fixtureTeamReport = {
  id: 600,
  sprintId: 201,
  teamId: 300,
  summary: 'Закончили auth, собираем UI каталога.',
  problems: 'Нет публичной части без логина.',
  nextPlan: 'Подключить MSW и e2e.',
  status: 'Черновик' as const,
  submittedAt: null,
  reviewedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
};

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
