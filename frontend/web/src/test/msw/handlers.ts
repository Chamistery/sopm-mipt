/*
 * MSW handlers — детерминированные ответы бэка для e2e/Playwright.
 *
 * Контракт envelope соответствует backend/internal/httputil/response.go:
 *   success: { data: <payload> }
 *   error:   { error: "<message>" }
 *
 * Покрытие: только то, что нужно golden-path сценариям. Если e2e тест
 * упадёт на неизвестной ручке — добавь handler, не наоборот: «всё на
 * всякий случай» захламляет fixtures.
 */

import { http, HttpResponse } from 'msw';

import {
  fixtureArchiveMeetings,
  fixtureArchiveSprintScores,
  fixtureArchiveTasks,
  fixtureArchiveTeam,
  fixtureArchiveTeamReports,
  fixtureDistributionStatus,
  fixtureMentorDistribution,
  fixtureNotifications,
  fixtureProjectApplicants,
  fixtureProjects,
  fixtureSprints,
  fixtureTasks,
  fixtureTeam,
  fixtureTeamContext,
  fixtureTeamMeetings,
  fixtureTeamReport,
  fixtureTeamReports,
  fixtureTeamSprintScores,
  fixtureUserProfile,
  fixtureUsers,
  MENTOR_ID,
  TEAMLEAD_ID,
} from './fixtures';
import type { ApplicantPriorityBuckets } from '@/api/applications';
import type {
  MentorDistributionResponse,
  MentorDistributionTeamMember,
} from '@/api/mentorDistribution';

const ok = <T,>(data: T) => HttpResponse.json({ data });
const err = (status: number, message: string) =>
  HttpResponse.json({ error: message }, { status });

const API = '/api';

/**
 * In-memory state — мутации (POST/PUT/DELETE) меняют эти массивы, чтобы
 * последующий GET в том же браузерном контексте видел свежие данные.
 * Browser worker заводится один раз на загрузку preview-сервера.
 */
const state = {
  applications: [] as Array<{
    id: number;
    projectId: number;
    studentId: number;
    priority: number;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>,
  nextApplicationId: 1000,
  /*
   * Overrides applied on top of `fixtureTasks`. Mentor approve/reject
   * etc. mutate this map so subsequent GET /teams/:id/gantt sees the
   * post-transition status. Lifetime is the MSW worker — i.e. one
   * preview-server boot. Tests that need clean state should issue
   * fresh task ids or be sequenced.
   */
  taskOverrides: new Map<number, { status: TaskStatus }>(),
  /*
   * Per-team leaderId overrides applied on top of `fixtureTeam`. Used by
   * «Сделать тимлидом» mentor flow so subsequent GET /teams/:id sees the
   * just-assigned leader.
   */
  teamLeaderOverrides: new Map<number, number>(),
  /*
   * Создаваемые во время сессии встречи. Persisted across GET-запросов,
   * сбрасывается перезапуском MSW worker (preview-сервер).
   */
  meetings: [] as Array<Record<string, unknown> & { id: number; teamId: number; status: string }>,
  nextMeetingId: 9000,
  /*
   * Распределение ментора — мутирует напрямую при recommend/unrecommend/invite/launch.
   * Глубокое клонирование fixture-объекта, чтобы исходный массив остался
   * детерминированным для других тестов.
   */
  mentorDistribution: structuredClone(fixtureMentorDistribution) as MentorDistributionResponse,
};

type FixtureTask = (typeof fixtureTasks)[number];
type ResolvedTask = Omit<FixtureTask, 'status'> & { status: TaskStatus };
type TaskStatus =
  | 'Ожидает аппрува'
  | 'Назначена'
  | 'Отклонена'
  | 'В работе'
  | 'На ревью'
  | 'Возвращена'
  | 'Готово';

function resolveTask(id: number): ResolvedTask | undefined {
  const base = fixtureTasks.find((t) => t.id === id);
  if (!base) return undefined;
  const override = state.taskOverrides.get(id);
  return override ? { ...base, ...override } : base;
}

const NOW_DASHBOARD = '2026-04-01T08:00:00Z';

/*
 * Builds a /mentor/dashboard project from a fixture-shaped active project.
 * Mirrors what the Go MentorDashboardRepository computes — sprints + teams
 * + per-sprint statuses derived from sprint chronology + report status.
 *
 * Special-cases for fixture projects 100/101/102/110 — those existed before
 * the dashboard endpoint and have no corresponding teams/sprints in MSW
 * fixtures (project 100 has team 300 + 3 sprints, others are empty). We
 * inline a believable synthetic shape here so e2e sees the prototype's
 * iter-track without us creating 6 more `fixture*` exports.
 */
function buildDashboardProject(
  p: (typeof fixtureProjects)[number],
  _today: Date,
): {
  id: number;
  title: string;
  status: string;
  company: string;
  predecessorId: number | null;
  durationSemesters: number;
  currentSemester: number;
  startedAt: string;
  sprints: Array<{ id: number; number: number; startDate: string; endDate: string; status: string }>;
  teams: Array<{
    id: number;
    name: string;
    lead: { id: number; firstName: string; lastName: string } | null;
    memberCount: number;
    launched: boolean;
    sprintStatuses: string[];
  }>;
} {
  // Project 100 (СУПП) — реальная команда + спринты из fixtures.
  if (p.id === 100) {
    const sprints = fixtureSprints
      .filter((s) => s.projectId === 100)
      .map((s) => ({ id: s.id, number: s.number, startDate: s.startDate, endDate: s.endDate, status: s.status }));
    const team1 = {
      id: fixtureTeam.id,
      name: fixtureTeam.name,
      lead: { id: fixtureTeam.leader.id, firstName: fixtureTeam.leader.firstName, lastName: fixtureTeam.leader.lastName },
      memberCount: fixtureTeam.members.length,
      launched: true,
      sprintStatuses: sprints.map((s, idx) => {
        if (idx === 0) return 'reviewed';
        if (s.status === 'Активный') return 'pending-review';
        return 'future';
      }),
    };
    const team2 = {
      id: 800,
      name: 'Команда 2',
      lead: { id: 5, firstName: 'Мария', lastName: 'Иванова' },
      memberCount: 3,
      launched: true,
      sprintStatuses: sprints.map((s, idx) => (idx === 0 ? 'reviewed' : s.status === 'Активный' ? 'current' : 'future')),
    };
    const team3 = {
      id: 801,
      name: 'Команда 3 (ожидает запуска)',
      lead: null,
      memberCount: 2,
      launched: false,
      sprintStatuses: [],
    };
    return {
      id: p.id,
      title: p.title,
      status: p.status,
      company: p.company ?? '',
      predecessorId: null,
      durationSemesters: 1,
      currentSemester: 1,
      startedAt: p.createdAt.split('T')[0],
      sprints,
      teams: [team1, team2, team3],
    };
  }
  // Опубликован / На утверждении / Черновик — без команд и спринтов.
  const status = p.status as string;
  if (status === 'Опубликован' || status === 'На утверждении' || status === 'Черновик') {
    return {
      id: p.id,
      title: p.title,
      status: p.status,
      company: p.company ?? '',
      predecessorId: null,
      durationSemesters: 1,
      currentSemester: 1,
      startedAt: p.createdAt.split('T')[0],
      sprints: [],
      teams: [],
    };
  }
  return {
    id: p.id,
    title: p.title,
    status: p.status,
    company: p.company ?? '',
    predecessorId: null,
    durationSemesters: 1,
    currentSemester: 1,
    startedAt: p.createdAt.split('T')[0],
    sprints: [],
    teams: [],
  };
}

/*
 * Архивная команда (310) — Гант собирается из fixtureArchiveTasks по
 * запрошенному sprintId. Без taskOverrides, без мутаций — все задачи
 * закрыты в финальных статусах.
 */
function archiveGanttResponse(request: Request) {
  const url = new URL(request.url);
  const sprintId = Number(url.searchParams.get('sprintId'));
  const sprint = fixtureSprints.find((s) => s.id === sprintId && s.projectId === 110);
  if (!sprint) return err(404, 'sprint not found');
  const memberToGantt = (m: (typeof fixtureArchiveTeam.members)[number]) => ({
    userId: m.userId,
    name: `${m.user.firstName} ${m.user.lastName}`,
    roleInTeam: m.roleInTeam ?? undefined,
    isLeader: m.isLeader,
  });
  const tasks = fixtureArchiveTasks
    .filter((t) => t.sprintId === sprintId)
    .map((t) => {
      const owner = fixtureArchiveTeam.members.find((m) => m.userId === t.assigneeId);
      return {
        ...t,
        hoursEstimate: t.hours,
        mrLink: t.mr ?? undefined,
        assigneeName: owner ? `${owner.user.lastName} ${owner.user.firstName.charAt(0)}.` : undefined,
      };
    });
  return ok({
    team: { id: fixtureArchiveTeam.id, name: fixtureArchiveTeam.name },
    sprint,
    members: fixtureArchiveTeam.members.map(memberToGantt),
    tasks,
  });
}

// ─── Mentor distribution helpers ─────────────────────────────────────────

type PriorityKey = keyof ApplicantPriorityBuckets;
const PRIORITY_KEYS: PriorityKey[] = ['priority1', 'priority2', 'priority3', 'priority4', 'priority5'];

function priorityKey(n: number): PriorityKey | null {
  const k = `priority${n}` as PriorityKey;
  return PRIORITY_KEYS.includes(k) ? k : null;
}

interface MovedApplicant {
  projectId: number;
  member: MentorDistributionTeamMember;
}

/** Находит и удаляет заявку (либо в команде, либо в пуле) — возвращает данные. */
function takeFromMentorDistribution(
  resp: MentorDistributionResponse,
  applicationId: number,
): MovedApplicant | null {
  for (const project of resp.projects) {
    for (const team of project.teams) {
      const idx = team.members.findIndex((m) => m.applicationId === applicationId);
      if (idx >= 0) {
        const [member] = team.members.splice(idx, 1);
        return { projectId: project.id, member: member! };
      }
    }
    // Поиск в пуле — qualified/unqualified × priority.
    for (const kind of ['qualified', 'unqualified'] as const) {
      const buckets = project.pool[kind];
      for (const k of PRIORITY_KEYS) {
        const list = buckets[k];
        const idx = list.findIndex((it) => it.applicationId === applicationId);
        if (idx >= 0) {
          const [item] = list.splice(idx, 1);
          // ApplicantItem.name = «Иванова Мария» (last + first; см. бэк
          // project_repository: FirstName + ' ' + LastName, но в фикстурах
          // мы пишем «Фамилия Имя» по convention каталога). Splittим на 2 части.
          const parts = item!.name.split(' ');
          const lastName = parts[0] ?? item!.name;
          const firstName = parts.slice(1).join(' ');
          const member: MentorDistributionTeamMember = {
            applicationId: item!.applicationId,
            studentId: item!.studentId,
            firstName,
            lastName,
            course: item!.course,
            group: '',
            gpa: item!.gpa,
            priority: PRIORITY_KEYS.indexOf(k) + 1,
            status: item!.status,
            qualified: kind === 'qualified',
          };
          return { projectId: project.id, member };
        }
      }
    }
  }
  return null;
}

function findTeamInMentorDistribution(
  resp: MentorDistributionResponse,
  teamId: number,
) {
  for (const project of resp.projects) {
    const team = project.teams.find((t) => t.id === teamId);
    if (team) return team;
  }
  return null;
}

function findMemberInDistribution(
  resp: MentorDistributionResponse,
  applicationId: number,
): { teamId: number; member: MentorDistributionTeamMember } | null {
  for (const project of resp.projects) {
    for (const team of project.teams) {
      const m = team.members.find((mm) => mm.applicationId === applicationId);
      if (m) return { teamId: team.id, member: m };
    }
  }
  return null;
}

function putBackToPool(
  resp: MentorDistributionResponse,
  projectId: number,
  member: MentorDistributionTeamMember,
): void {
  const project = resp.projects.find((p) => p.id === projectId);
  if (!project) return;
  const k = priorityKey(member.priority);
  if (!k) return;
  const bucket = member.qualified ? project.pool.qualified : project.pool.unqualified;
  const list = bucket[k];
  const name = `${member.lastName} ${member.firstName}`.trim();
  list.push({
    applicationId: member.applicationId,
    studentId: member.studentId,
    name,
    course: member.course,
    gpa: member.gpa,
    status: 'Не рекомендован' as const,
    teamId: null,
  });
}

export const handlers = [
  // ─── Users ─────────────────────────────────────────────────────────────
  http.get(`${API}/users`, () => ok(fixtureUsers)),

  http.get(`${API}/users/:id`, ({ params }) => {
    const id = Number(params.id);
    const user = fixtureUsers.find((u) => u.id === id);
    return user ? ok(user) : err(404, 'user not found');
  }),

  http.get(`${API}/users/:id/profile`, ({ params }) => {
    const userId = Number(params.id);
    return ok({ ...fixtureUserProfile, userId });
  }),

  http.put(`${API}/users/:id/profile`, async ({ params, request }) => {
    const userId = Number(params.id);
    const patch = (await request.json()) as Record<string, unknown>;
    return ok({ ...fixtureUserProfile, userId, ...patch });
  }),

  http.get(`${API}/users/:id/files`, () => ok([])),

  http.get(`${API}/users/:id/team`, ({ params, request }) => {
    const userId = Number(params.id);
    const role = request.headers.get('X-User-Role');
    // Студент без команды отдаёт 404, чтобы StudentProjectPage показал
    // empty-state. Тимлид и student id 4 (распределённый) — отдаём команду.
    if (userId === TEAMLEAD_ID || userId === 4) {
      return ok(fixtureTeamContext);
    }
    if (role === 'student') {
      return err(404, 'student is not assigned to a team');
    }
    return ok(fixtureTeamContext);
  }),

  http.get(`${API}/users/:id/notifications`, () => ok(fixtureNotifications)),

  // ─── Projects ──────────────────────────────────────────────────────────
  http.get(`${API}/projects`, ({ request }) => {
    const url = new URL(request.url);
    const mentorId = url.searchParams.get('mentorId');
    const status = url.searchParams.get('status');
    let projects = [...fixtureProjects];
    if (mentorId) projects = projects.filter((p) => p.mentorId === Number(mentorId));
    if (status) projects = projects.filter((p) => p.status === status);
    return ok({
      projects,
      total: projects.length,
      limit: Number(url.searchParams.get('limit') ?? 20),
      offset: Number(url.searchParams.get('offset') ?? 0),
    });
  }),

  http.get(`${API}/projects/:id`, ({ params }) => {
    const id = Number(params.id);
    const project = fixtureProjects.find((p) => p.id === id);
    return project ? ok(project) : err(404, 'project not found');
  }),

  http.get(`${API}/projects/:id/full`, ({ params }) => {
    const id = Number(params.id);
    const project = fixtureProjects.find((p) => p.id === id);
    if (!project) return err(404, 'project not found');
    const sprints = fixtureSprints.filter((s) => s.projectId === id);
    const teams = id === 100 ? [fixtureTeam] : id === 110 ? [fixtureArchiveTeam] : [];
    return ok({ project, sprints, teams });
  }),

  http.get(`${API}/projects/:id/applicants`, () => ok(fixtureProjectApplicants)),

  http.get(`${API}/projects/:id/predecessor`, () => ok(null)),

  /*
   * Заявка проекта (proposalData). Для archived-фикстур возвращаем
   * заранее заготовленный шаблон, чтобы кнопка «Заполнить по шаблону» в
   * NewProjectPage реально заполняла поля. Для остальных id — null.
   */
  http.get(`${API}/projects/:id/proposal`, ({ params }) => {
    const id = Number(params.id);
    if (id === 110) {
      return ok({
        title: 'Архивный: Цифровой двойник кампуса',
        company: 'ЦИТ МФТИ',
        mentor: {
          fullName: 'Тимохин В.А.',
          role: 'Доцент',
          email: 'timokhin@mipt.ru',
          telegram: '@vtimokhin',
          phone: '+7 (495) 000-00-00',
        },
        goal: 'Витрина цифрового двойника кампуса для абитуриентов и студентов.',
        expectedResult: 'Веб-приложение с 3D-моделью + поиск по аудиториям.',
        technologies: 'React, Three.js, PostgreSQL',
        competencies: 'Знание JS/TS, базовое понимание 3D-графики.',
        minRating: 3.5,
        minGpa: 7.0,
        allowedCourses: [2],
        description: 'Подробное описание архивного проекта.',
        acceptanceCriteria: 'Стабильная работа в Chrome/Firefox, время загрузки < 2 c.',
        eduResult: 'Frontend, 3D, командная работа.',
        durationSemesters: 1,
        sprints: { count: 5, startDate: '2026-09-01', mode: 'simple', durationWeeks: 2 },
        numTeams: 1,
        teamSizeMin: 3,
        teamSizeMax: 5,
        resources: 'Доступ к данным кампуса.',
        isContinuation: false,
        predecessorProjectId: null,
      });
    }
    return ok(null);
  }),

  http.post(`${API}/projects`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return ok({
      id: 999,
      status: 'Черновик',
      mentorId: MENTOR_ID,
      teamSizeMin: 3,
      teamSizeMax: 5,
      numTeams: 1,
      acceptedCount: 0,
      availableSlots: 5,
      filledTeams: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...body,
    });
  }),

  http.put(`${API}/projects/:id`, async ({ params, request }) => {
    const id = Number(params.id);
    const project = fixtureProjects.find((p) => p.id === id);
    if (!project) return err(404, 'project not found');
    const patch = (await request.json()) as Record<string, unknown>;
    return ok({ ...project, ...patch });
  }),

  http.delete(`${API}/projects/:id`, () => ok(null)),

  http.get(`${API}/mentor/projects/archive`, () =>
    ok({
      projects: fixtureProjects.filter((p) => p.status === 'Завершён'),
      total: fixtureProjects.filter((p) => p.status === 'Завершён').length,
      limit: 20,
      offset: 0,
    }),
  ),

  // ─── Mentor distribution aggregate (view-distribution) ─────────────────
  http.get(`${API}/mentor/distribution`, () => ok(state.mentorDistribution)),

  http.put(`${API}/applications/:id/recommend`, async ({ params, request }) => {
    const id = Number(params.id);
    const body = (await request.json()) as { teamId: number };
    const moved = takeFromMentorDistribution(state.mentorDistribution, id);
    if (!moved) return err(404, 'application not found');
    const team = findTeamInMentorDistribution(state.mentorDistribution, body.teamId);
    if (!team) return err(404, 'team not found');
    const member: MentorDistributionTeamMember = {
      ...moved.member,
      status: 'Рекомендован',
    };
    team.members.push(member);
    return ok({
      id,
      teamId: body.teamId,
      status: 'Рекомендован',
      studentId: member.studentId,
      priority: member.priority,
    });
  }),

  http.put(`${API}/applications/:id/unrecommend`, ({ params }) => {
    const id = Number(params.id);
    const moved = takeFromMentorDistribution(state.mentorDistribution, id);
    if (!moved) return err(404, 'application not found');
    putBackToPool(state.mentorDistribution, moved.projectId, moved.member);
    return ok({ id, teamId: null, status: 'Не рекомендован', studentId: moved.member.studentId });
  }),

  http.put(`${API}/applications/:id/invite`, ({ params }) => {
    const id = Number(params.id);
    const found = findMemberInDistribution(state.mentorDistribution, id);
    if (!found) return err(404, 'application not found');
    found.member.status = 'Принят';
    return ok({ id, teamId: found.teamId, status: 'Принят', studentId: found.member.studentId });
  }),

  http.post(`${API}/teams/:id/launch`, ({ params }) => {
    const id = Number(params.id);
    for (const project of state.mentorDistribution.projects) {
      const before = project.teams.length;
      project.teams = project.teams.filter((t) => t.id !== id);
      if (project.teams.length !== before) {
        return ok({ id, name: 'Команда запущена', launched: true });
      }
    }
    return err(404, 'team not found');
  }),

  // ─── Mentor dashboard aggregate (feature/mentor-dashboard) ─────────────
  http.get(`${API}/mentor/dashboard`, () => {
    const today = new Date(NOW_DASHBOARD);
    const projects = fixtureProjects
      .filter((p) => {
        const s = p.status as string;
        return s !== 'Завершён' && s !== 'Архивный';
      })
      .map((p) => buildDashboardProject(p, today));
    return ok({ projects });
  }),

  // ─── Applications ──────────────────────────────────────────────────────
  http.get(`${API}/applications`, ({ request }) => {
    const url = new URL(request.url);
    const studentId = url.searchParams.get('studentId');
    const expand = url.searchParams.get('expand');
    let items = state.applications;
    if (studentId) items = items.filter((a) => a.studentId === Number(studentId));
    const result = expand === 'project'
      ? items.map((a) => ({
          ...a,
          projectTitle: fixtureProjects.find((p) => p.id === a.projectId)?.title,
          company: fixtureProjects.find((p) => p.id === a.projectId)?.company,
        }))
      : items;
    return ok(result);
  }),

  http.get(`${API}/applications/project`, ({ request }) => {
    const url = new URL(request.url);
    const projectId = Number(url.searchParams.get('projectId'));
    return ok(state.applications.filter((a) => a.projectId === projectId));
  }),

  http.get(`${API}/applications/:id`, ({ params }) => {
    const id = Number(params.id);
    const app = state.applications.find((a) => a.id === id);
    return app ? ok(app) : err(404, 'application not found');
  }),

  http.post(`${API}/applications`, async ({ request }) => {
    const body = (await request.json()) as { projectId: number; studentId: number; priority: number };
    const now = new Date().toISOString();
    const app = {
      id: state.nextApplicationId++,
      projectId: body.projectId,
      studentId: body.studentId,
      priority: body.priority,
      status: 'Ожидает',
      createdAt: now,
      updatedAt: now,
    };
    state.applications.push(app);
    return ok(app);
  }),

  http.put(`${API}/applications/:id`, async ({ params, request }) => {
    const id = Number(params.id);
    const app = state.applications.find((a) => a.id === id);
    if (!app) return err(404, 'application not found');
    const patch = (await request.json()) as Record<string, unknown>;
    Object.assign(app, patch);
    return ok(app);
  }),

  http.delete(`${API}/applications/:id`, ({ params }) => {
    const id = Number(params.id);
    const idx = state.applications.findIndex((a) => a.id === id);
    if (idx >= 0) state.applications.splice(idx, 1);
    return ok(null);
  }),

  // ─── Teams + Sprints + Gantt + Tasks ───────────────────────────────────
  http.get(`${API}/teams`, ({ request }) => {
    const url = new URL(request.url);
    const projectId = Number(url.searchParams.get('projectId'));
    if (projectId === 100) return ok([fixtureTeam]);
    if (projectId === 110) return ok([fixtureArchiveTeam]);
    return ok([]);
  }),

  http.get(`${API}/teams/:id`, ({ params }) => {
    const id = Number(params.id);
    if (id === 300) return ok({ ...fixtureTeam, leaderId: state.teamLeaderOverrides.get(300) ?? fixtureTeam.leaderId });
    if (id === 310) return ok(fixtureArchiveTeam);
    return err(404, 'team not found');
  }),

  // Pixel-port из mentor.html «Сделать тимлидом»: PUT /teams/:id с {leaderId}
  // — фронт делает оптимистичную инвалидцию ['team', teamId], бэк отдаёт
  // обновлённую команду. Здесь мы лишь меняем leaderId в локальном overrides.
  http.put(`${API}/teams/:id`, async ({ params, request }) => {
    const id = Number(params.id);
    const patch = (await request.json()) as { leaderId?: number };
    if (id === 300) {
      if (patch.leaderId != null) state.teamLeaderOverrides.set(300, patch.leaderId);
      return ok({ ...fixtureTeam, ...patch, leaderId: state.teamLeaderOverrides.get(300) ?? fixtureTeam.leaderId });
    }
    return err(404, 'team not found');
  }),

  http.get(`${API}/teams/:teamId/gantt`, ({ params, request }) => {
    const teamId = Number(params.teamId);
    if (teamId === 310) return archiveGanttResponse(request);
    if (teamId !== 300) return err(404, 'team not found');
    /*
     * Project the dto-shaped fixtures into the backend `Task` /
     * `GanttMember` shape that the api adapter (`getGantt` /
     * `taskToDto`) expects. Apply taskOverrides on top so that
     * mentor approve/reject mutations persist across query
     * invalidations within a single MSW worker lifetime.
     */
    const member = (m: (typeof fixtureTeamContext.members)[number]) => ({
      userId: m.userId,
      name: `${m.firstName} ${m.lastName}`,
      roleInTeam: m.projectRole ?? undefined,
      isLeader: m.isLeader,
    });
    const task = (t: (typeof fixtureTasks)[number]) => {
      const merged = { ...t, ...(state.taskOverrides.get(t.id) ?? {}) };
      const owner = fixtureTeamContext.members.find((m) => m.userId === merged.assigneeId);
      return {
        ...merged,
        hoursEstimate: merged.hours,
        mrLink: merged.mr ?? undefined,
        assigneeName: owner ? `${owner.lastName} ${owner.firstName.charAt(0)}.` : undefined,
      };
    };
    return ok({
      team: { id: 300, name: 'Команда «СУПП»' },
      sprint: fixtureTeamContext.currentSprint,
      members: fixtureTeamContext.members.map(member),
      tasks: fixtureTasks.map(task),
    });
  }),

  http.get(`${API}/sprints`, ({ request }) => {
    const url = new URL(request.url);
    const projectId = Number(url.searchParams.get('projectId'));
    return ok(fixtureSprints.filter((s) => s.projectId === projectId));
  }),

  http.post(`${API}/tasks`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return ok({ id: 9999, status: 'Назначена', ...body });
  }),

  http.put(`${API}/tasks/:id`, async ({ params, request }) => {
    const id = Number(params.id);
    const task = fixtureTasks.find((t) => t.id === id);
    if (!task) return err(404, 'task not found');
    const patch = (await request.json()) as Record<string, unknown>;
    return ok({ ...task, ...patch });
  }),

  http.put(`${API}/tasks/:id/submit-review`, ({ params }) => {
    const id = Number(params.id);
    const task = resolveTask(id);
    if (!task) return err(404, 'task not found');
    state.taskOverrides.set(id, { status: 'На ревью' });
    return ok({ ...task, status: 'На ревью' });
  }),

  http.put(`${API}/tasks/:id/approve`, ({ params }) => {
    const id = Number(params.id);
    const task = resolveTask(id);
    if (!task) return err(404, 'task not found');
    state.taskOverrides.set(id, { status: 'Назначена' });
    return ok({ ...task, status: 'Назначена' });
  }),

  http.put(`${API}/tasks/:id/reject`, ({ params }) => {
    const id = Number(params.id);
    const task = resolveTask(id);
    if (!task) return err(404, 'task not found');
    state.taskOverrides.set(id, { status: 'Отклонена' });
    return ok({ ...task, status: 'Отклонена' });
  }),

  http.put(`${API}/tasks/:id/accept`, ({ params }) => {
    const id = Number(params.id);
    const task = resolveTask(id);
    if (!task) return err(404, 'task not found');
    state.taskOverrides.set(id, { status: 'Готово' });
    return ok({ ...task, status: 'Готово' });
  }),

  http.put(`${API}/tasks/:id/return`, ({ params }) => {
    const id = Number(params.id);
    const task = resolveTask(id);
    if (!task) return err(404, 'task not found');
    state.taskOverrides.set(id, { status: 'Возвращена' });
    return ok({ ...task, status: 'Возвращена' });
  }),

  http.delete(`${API}/tasks/:id`, () => ok(null)),

  // ─── Team reports ──────────────────────────────────────────────────────
  http.get(`${API}/team-reports`, ({ request }) => {
    const url = new URL(request.url);
    const teamId = Number(url.searchParams.get('teamId'));
    const sprintId = Number(url.searchParams.get('sprintId'));
    if (teamId === 310) {
      if (sprintId) {
        const found = fixtureArchiveTeamReports.find((r) => r.sprintId === sprintId);
        return ok(found ?? null);
      }
      return ok(fixtureArchiveTeamReports);
    }
    if (teamId !== 300) return ok([]);
    // Single-pair lookup: вернём ОТЧЁТ объектом если есть, иначе null.
    // Список — массивом всех отчётов команды (текущий + прошлый спринт).
    if (sprintId) {
      const found = fixtureTeamReports.find((r) => r.sprintId === sprintId);
      return ok(found ?? null);
    }
    return ok(fixtureTeamReports);
  }),

  http.post(`${API}/team-reports`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return ok({ id: 9999, status: 'Черновик', ...body });
  }),

  http.put(`${API}/team-reports/:id`, async ({ params, request }) => {
    const id = Number(params.id);
    const patch = (await request.json()) as Record<string, unknown>;
    return ok({ ...fixtureTeamReport, id, ...patch });
  }),

  http.put(`${API}/team-reports/:id/review`, async ({ params, request }) => {
    const id = Number(params.id);
    const body = (await request.json()) as Record<string, unknown>;
    return ok({ ...fixtureTeamReport, id, status: 'Проверен', ...body });
  }),

  // ─── Sprint scores ─────────────────────────────────────────────────────
  http.get(`${API}/sprint-scores`, ({ request }) => {
    const url = new URL(request.url);
    const teamId = Number(url.searchParams.get('teamId'));
    const sprintId = Number(url.searchParams.get('sprintId'));
    if (teamId === 310) return ok(fixtureArchiveSprintScores);
    if (teamId === 300) {
      if (sprintId) {
        return ok(fixtureTeamSprintScores.filter((s) => s.sprintId === sprintId));
      }
      return ok(fixtureTeamSprintScores);
    }
    return ok([]);
  }),
  http.post(`${API}/sprint-scores`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return ok({ id: 9999, ...body });
  }),
  http.put(`${API}/sprint-scores/:id`, async ({ params, request }) => {
    const id = Number(params.id);
    const body = (await request.json()) as Record<string, unknown>;
    return ok({ id, ...body });
  }),

  // ─── Meetings ──────────────────────────────────────────────────────────
  http.get(`${API}/meetings`, ({ request }) => {
    const url = new URL(request.url);
    const teamId = Number(url.searchParams.get('teamId'));
    if (teamId === 310) return ok(fixtureArchiveMeetings);
    if (teamId === 300) {
      return ok([...fixtureTeamMeetings, ...state.meetings.filter((m) => m.teamId === 300)]);
    }
    return ok([]);
  }),
  http.post(`${API}/meetings`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const teamId = Number(body.teamId ?? 0);
    const created = {
      ...body,
      teamId,
      id: state.nextMeetingId++,
      // Бэк форсирует «Подтверждена» когда POST делает ментор; имитируем
      // это здесь, чтобы пост-инвалидация увидела встречу в верхней секции.
      status: 'Подтверждена',
      mentorConfirmed: true,
    };
    state.meetings.push(created);
    return ok(created);
  }),
  http.put(`${API}/meetings/:id`, async ({ params, request }) => {
    const id = Number(params.id);
    const body = (await request.json()) as Record<string, unknown> & {
      mentorConfirmed?: boolean;
      teamId?: number;
    };
    const teamId = Number(body.teamId ?? 0);
    const next = {
      ...body,
      id,
      teamId,
      status: body.mentorConfirmed === false ? 'Отклонена' : 'Подтверждена',
    };
    const idx = state.meetings.findIndex((m) => m.id === id);
    if (idx >= 0) state.meetings[idx] = next;
    else state.meetings.push(next);
    return ok(next);
  }),
  http.delete(`${API}/meetings/:id`, ({ params }) => {
    const id = Number(params.id);
    state.meetings = state.meetings.filter((m) => m.id !== id);
    return new HttpResponse(null, { status: 204 });
  }),

  // ─── Templates ─────────────────────────────────────────────────────────
  http.get(`${API}/templates`, () => ok([])),

  // ─── Distribution ──────────────────────────────────────────────────────
  http.get(`${API}/distribution/status`, () => ok(fixtureDistributionStatus)),
  http.post(`${API}/distribution/generate`, () => ok({ message: 'started' })),
];
