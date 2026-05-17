/*
 * Optimistic-патчи кэша coordinator distribution. Применяются в onMutate
 * мутаций, чтобы D&D отрабатывал визуально мгновенно (без ожидания
 * сетевого ответа + рефетча всего распределения). Если мутация
 * провалится — onError откатит кэш на сохранённый snapshot.
 *
 * Намеренно поддерживаем только in-project moves; кросс-проектные и
 * force-create мутации редкие и сложнее по структуре (несколько
 * связанных id), для них оставлен честный invalidate.
 */

import type { ApplicationStatus } from '@/api/applications';
import type {
  CoordinatorDistributionProject,
  CoordinatorDistributionResponse,
  CoordinatorPoolPriority,
  CoordinatorPoolStudent,
} from '@/api/coordinatorDistribution';
import type {
  MentorDistributionTeam,
  MentorDistributionTeamMember,
} from '@/api/mentorDistribution';

type Updater = (prev: CoordinatorDistributionResponse | undefined) => CoordinatorDistributionResponse | undefined;

/** Найти заявку среди team-members любого проекта. */
function findMember(
  data: CoordinatorDistributionResponse,
  applicationId: number,
): { project: CoordinatorDistributionProject; team: MentorDistributionTeam; member: MentorDistributionTeamMember } | null {
  for (const project of data.projects) {
    for (const team of project.teams) {
      const member = team.members.find((m) => m.applicationId === applicationId);
      if (member) return { project, team, member };
    }
  }
  return null;
}

function withProjects(
  data: CoordinatorDistributionResponse,
  mapProject: (p: CoordinatorDistributionProject) => CoordinatorDistributionProject,
): CoordinatorDistributionResponse {
  return { ...data, projects: data.projects.map(mapProject) };
}

function withTeams(
  project: CoordinatorDistributionProject,
  mapTeam: (t: MentorDistributionTeam) => MentorDistributionTeam,
): CoordinatorDistributionProject {
  return { ...project, teams: project.teams.map(mapTeam) };
}

/**
 * Перенести существующего team-member в другую команду того же проекта.
 * newStatus передаём, чтобы recommend (после Принят) сбрасывал статус.
 */
export function moveMemberToTeam(
  applicationId: number,
  targetTeamId: number,
  newStatus: ApplicationStatus,
): Updater {
  return (prev) => {
    if (!prev) return prev;
    const found = findMember(prev, applicationId);
    if (!found) return prev;
    if (found.team.id === targetTeamId) {
      // Только статус
      return withProjects(prev, (p) =>
        p.id !== found.project.id
          ? p
          : withTeams(p, (t) =>
              t.id !== targetTeamId
                ? t
                : { ...t, members: t.members.map((m) => (m.applicationId === applicationId ? { ...m, status: newStatus } : m)) },
            ),
      );
    }
    const movedMember: MentorDistributionTeamMember = { ...found.member, status: newStatus };
    return withProjects(prev, (p) => {
      if (p.id !== found.project.id) return p;
      return withTeams(p, (t) => {
        if (t.id === found.team.id) {
          return { ...t, members: t.members.filter((m) => m.applicationId !== applicationId) };
        }
        if (t.id === targetTeamId) {
          return { ...t, members: [...t.members, movedMember] };
        }
        return t;
      });
    });
  };
}

/**
 * Студента из пула в команду — pool-student уходит из правой панели,
 * чип появляется в команде. applicationId — id заявки на этот project,
 * она существует (recommend требует teamId same-project).
 */
export function recommendFromPool(
  applicationId: number,
  studentId: number,
  targetProjectId: number,
  targetTeamId: number,
  newStatus: ApplicationStatus,
): Updater {
  return (prev) => {
    if (!prev) return prev;
    const poolStudent = prev.pool.find((s) => s.studentId === studentId);
    if (!poolStudent) return prev;
    const priority = poolStudent.priorities.find((p) => p.applicationId === applicationId)?.priority ?? 1;
    const newMember: MentorDistributionTeamMember = {
      applicationId,
      studentId,
      firstName: poolStudent.firstName,
      lastName: poolStudent.lastName,
      course: poolStudent.course,
      group: poolStudent.group,
      gpa: poolStudent.gpa,
      priority,
      status: newStatus,
      qualified: true,
      allPriorities: poolStudent.priorities.map(
        (p): CoordinatorPoolPriority => ({
          applicationId: p.applicationId,
          projectId: p.projectId,
          projectTitle: p.projectTitle,
          company: p.company,
          mentorName: p.mentorName,
          priority: p.priority,
          status: p.status,
        }),
      ),
    };
    const projects = prev.projects.map((p) =>
      p.id !== targetProjectId
        ? p
        : withTeams(p, (t) => (t.id !== targetTeamId ? t : { ...t, members: [...t.members, newMember] })),
    );
    const pool = prev.pool.filter((s) => s.studentId !== studentId);
    return { ...prev, projects, pool };
  };
}

/**
 * Вернуть team-member обратно в пул (unrecommend).
 */
export function unrecommendToPool(applicationId: number): Updater {
  return (prev) => {
    if (!prev) return prev;
    const found = findMember(prev, applicationId);
    if (!found) return prev;
    const { project, team, member } = found;
    const projects = prev.projects.map((p) =>
      p.id !== project.id
        ? p
        : withTeams(p, (t) =>
            t.id !== team.id ? t : { ...t, members: t.members.filter((m) => m.applicationId !== applicationId) },
          ),
    );
    // Если студент уже в пуле — просто добавляем приоритет; иначе создаём запись.
    const existingPoolIdx = prev.pool.findIndex((s) => s.studentId === member.studentId);
    let pool: CoordinatorPoolStudent[];
    const priorityRecord: CoordinatorPoolPriority = {
      applicationId: member.applicationId,
      projectId: project.id,
      projectTitle: project.title,
      company: project.company,
      mentorName: project.mentor ? `${project.mentor.lastName} ${project.mentor.firstName.charAt(0)}.` : undefined,
      priority: member.priority,
      status: 'Не рекомендован' as ApplicationStatus,
    };
    if (existingPoolIdx >= 0) {
      pool = prev.pool.map((s, i) =>
        i !== existingPoolIdx ? s : { ...s, priorities: [...s.priorities, priorityRecord] },
      );
    } else {
      pool = [
        ...prev.pool,
        {
          studentId: member.studentId,
          firstName: member.firstName,
          lastName: member.lastName,
          course: member.course,
          group: member.group,
          gpa: member.gpa,
          priorities: [priorityRecord],
        },
      ];
    }
    return { ...prev, projects, pool };
  };
}
