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
  fixtureDistributionStatus,
  fixtureNotifications,
  fixtureProjectApplicants,
  fixtureProjects,
  fixtureSprints,
  fixtureTasks,
  fixtureTeam,
  fixtureTeamContext,
  fixtureTeamReport,
  fixtureUserProfile,
  fixtureUsers,
  MENTOR_ID,
  TEAMLEAD_ID,
} from './fixtures';

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
};

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
    const teams = id === 100 ? [fixtureTeam] : [];
    return ok({ project, sprints, teams });
  }),

  http.get(`${API}/projects/:id/applicants`, () => ok(fixtureProjectApplicants)),

  http.get(`${API}/projects/:id/predecessor`, () => ok(null)),

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
    ok({ projects: [], total: 0, limit: 20, offset: 0 }),
  ),

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
    return ok(projectId === 100 ? [fixtureTeam] : []);
  }),

  http.get(`${API}/teams/:id`, ({ params }) =>
    Number(params.id) === 300 ? ok(fixtureTeam) : err(404, 'team not found'),
  ),

  http.get(`${API}/teams/:teamId/gantt`, ({ params }) => {
    if (Number(params.teamId) !== 300) return err(404, 'team not found');
    return ok({
      team: { id: 300, name: 'Команда «СУПП»' },
      sprint: fixtureTeamContext.currentSprint,
      members: fixtureTeamContext.members,
      tasks: fixtureTasks,
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
    const task = fixtureTasks.find((t) => t.id === id);
    return task ? ok({ ...task, status: 'На ревью' }) : err(404, 'task not found');
  }),

  http.put(`${API}/tasks/:id/approve`, ({ params }) => {
    const id = Number(params.id);
    const task = fixtureTasks.find((t) => t.id === id);
    return task ? ok({ ...task, status: 'Назначена' }) : err(404, 'task not found');
  }),

  http.put(`${API}/tasks/:id/reject`, ({ params }) => {
    const id = Number(params.id);
    const task = fixtureTasks.find((t) => t.id === id);
    return task ? ok({ ...task, status: 'Отклонена' }) : err(404, 'task not found');
  }),

  http.put(`${API}/tasks/:id/accept`, ({ params }) => {
    const id = Number(params.id);
    const task = fixtureTasks.find((t) => t.id === id);
    return task ? ok({ ...task, status: 'Готово' }) : err(404, 'task not found');
  }),

  http.put(`${API}/tasks/:id/return`, ({ params }) => {
    const id = Number(params.id);
    const task = fixtureTasks.find((t) => t.id === id);
    return task ? ok({ ...task, status: 'Возвращена' }) : err(404, 'task not found');
  }),

  http.delete(`${API}/tasks/:id`, () => ok(null)),

  // ─── Team reports ──────────────────────────────────────────────────────
  http.get(`${API}/team-reports`, ({ request }) => {
    const url = new URL(request.url);
    const teamId = Number(url.searchParams.get('teamId'));
    const sprintId = Number(url.searchParams.get('sprintId'));
    if (teamId !== 300) return ok([]);
    // Single-pair lookup helper уважает одиночный объект тоже — но
    // teamReports.ts вызывает GET /team-reports?teamId=...&sprintId=...
    // и парсит ответ как `TeamReport | null`. Если массив возвращаем — он
    // тоже работает (extractData возвращает массив). Для (teamId, sprintId)
    // пары отдадим ОТЧЁТ как объект, иначе массив всех.
    if (sprintId) {
      return fixtureTeamReport.sprintId === sprintId
        ? ok(fixtureTeamReport)
        : ok(null);
    }
    return ok([fixtureTeamReport]);
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
  http.get(`${API}/sprint-scores`, () => ok([])),
  http.post(`${API}/sprint-scores`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return ok({ id: 9999, ...body });
  }),

  // ─── Meetings ──────────────────────────────────────────────────────────
  http.get(`${API}/meetings`, () => ok([])),

  // ─── Templates ─────────────────────────────────────────────────────────
  http.get(`${API}/templates`, () => ok([])),

  // ─── Distribution ──────────────────────────────────────────────────────
  http.get(`${API}/distribution/status`, () => ok(fixtureDistributionStatus)),
  http.post(`${API}/distribution/generate`, () => ok({ message: 'started' })),
];
