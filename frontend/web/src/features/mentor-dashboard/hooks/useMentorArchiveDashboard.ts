/*
 * useMentorArchiveDashboard — производный хук для архивной страницы.
 *
 * Архивная карточка богаче, чем то, что отдаёт `/api/mentor/projects/archive`
 * (просто список проектов). Поэтому мы:
 *   1) грузим список архивных проектов через listMentorArchive;
 *   2) по каждому id параллельно дёргаем getProjectFull (sprints + teams);
 *   3) по каждой команде — listSprintScores для расчёта avgScore и итоговой
 *      оценки проекта.
 *
 * Альтернативой был отдельный endpoint /api/mentor/archive/dashboard на
 * бэке. Мы сознательно делаем композицию на фронте — архив ментора мал
 * (≤ 10 проектов), TanStack `useQueries` параллелит, а бэк не приходится
 * расширять под чисто-UI агрегат.
 */

import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';

import {
  getProjectFull,
  listMentorArchive,
  type ProjectFull,
  type ProjectListItem,
} from '@/api/projects';
import { listSprintScores, type SprintScore } from '@/api/sprintScores';
import {
  avgScore,
  finishedAt,
  projectFinalGrade,
  semesterLabel,
} from '../lib/archiveAggregations';

export interface ArchiveTeamSummary {
  id: number;
  name: string;
  leader: string | null;
  memberCount: number;
  sprintCount: number;
  avgScore: number | null;
}

export interface ArchiveDashboardProject {
  id: number;
  title: string;
  company: string;
  predecessorId: number | null;
  durationSemesters: number;
  /** Текущий семестр в рамках инициативы (1..durationSemesters). */
  currentSemester: number;
  semesterLabel: string;
  finishedAt: string | null;
  finalGrade: string;
  teams: ArchiveTeamSummary[];
  /** Кол-во спринтов проекта (берём максимум по командам). */
  sprintsCount: number;
}

export interface UseMentorArchiveDashboardResult {
  data: ArchiveDashboardProject[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useMentorArchiveDashboard(
  mentorId: number,
): UseMentorArchiveDashboardResult {
  const archiveQuery = useQuery({
    queryKey: ['projects', 'mentor', mentorId, 'archive', 'list'],
    queryFn: async (): Promise<ProjectListItem[]> => {
      // listMentorArchive уже фильтрует по mentor по X-User-Id; дополнительно
      // перепроверяем mentorId на случай шаринга кеша между ролями.
      const resp = await listMentorArchive({ limit: 200 });
      return resp.projects.filter((p) => p.mentorId === mentorId);
    },
    enabled: Number.isFinite(mentorId) && mentorId > 0,
  });

  const projects = useMemo<ProjectListItem[]>(
    () => archiveQuery.data ?? [],
    [archiveQuery.data],
  );
  const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);

  const fullQueries = useQueries({
    queries: projectIds.map((id) => ({
      queryKey: ['project', id, 'full'],
      queryFn: () => getProjectFull(id),
      enabled: Number.isFinite(id) && id > 0,
    })),
  });

  // Собираем плоский список (projectId, teamId) для второго слоя useQueries.
  const teamRefs = useMemo(() => {
    const refs: Array<{ projectId: number; teamId: number }> = [];
    fullQueries.forEach((q, idx) => {
      const pid = projectIds[idx];
      if (!q.data || pid == null) return;
      for (const team of q.data.teams) {
        refs.push({ projectId: pid, teamId: team.id });
      }
    });
    return refs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullQueries.map((q) => q.dataUpdatedAt).join('|'), projectIds.join('|')]);

  const scoreQueries = useQueries({
    queries: teamRefs.map(({ teamId }) => ({
      queryKey: ['team', teamId, 'sprint-scores', 'archive'],
      queryFn: () => listSprintScores({ teamId }),
      enabled: Number.isFinite(teamId) && teamId > 0,
    })),
  });

  const isLoading =
    archiveQuery.isLoading ||
    fullQueries.some((q) => q.isLoading) ||
    scoreQueries.some((q) => q.isLoading);
  const isError =
    archiveQuery.isError ||
    fullQueries.some((q) => q.isError) ||
    scoreQueries.some((q) => q.isError);

  const data = useMemo<ArchiveDashboardProject[] | undefined>(() => {
    if (archiveQuery.isLoading) return undefined;
    if (!archiveQuery.data) return undefined;
    if (fullQueries.some((q) => q.isLoading)) return undefined;
    if (scoreQueries.some((q) => q.isLoading)) return undefined;

    // Map teamId → scores
    const scoresByTeam = new Map<number, SprintScore[]>();
    teamRefs.forEach((ref, idx) => {
      const q = scoreQueries[idx];
      if (q?.data) scoresByTeam.set(ref.teamId, q.data);
    });

    return projects.map((p, idx) => {
      const full: ProjectFull | undefined = fullQueries[idx]?.data;
      const teams = full?.teams ?? [];
      const sprints = full?.sprints ?? [];

      const teamSummaries: ArchiveTeamSummary[] = teams.map((t) => {
        const scores = scoresByTeam.get(t.id) ?? [];
        const leader = t.leader
          ? `${t.leader.lastName} ${t.leader.firstName.charAt(0)}.`
          : null;
        return {
          id: t.id,
          name: t.name,
          leader,
          memberCount: t.members?.length ?? 0,
          sprintCount: sprints.length,
          avgScore: avgScore(scores),
        };
      });

      const finished = finishedAt(sprints);
      const grade = projectFinalGrade(teamSummaries.map((t) => t.avgScore));
      const dur = full?.project.durationSemesters ?? 1;
      const isContinuation = full?.project.predecessorProjectId != null;
      const currentSemester = isContinuation ? dur : 1;

      return {
        id: p.id,
        title: p.title,
        company: p.company ?? '',
        predecessorId: full?.project.predecessorProjectId ?? null,
        durationSemesters: dur,
        currentSemester,
        semesterLabel: semesterLabel(finished),
        finishedAt: finished,
        finalGrade: grade,
        teams: teamSummaries,
        sprintsCount: sprints.length,
      };
    });
  }, [archiveQuery.isLoading, archiveQuery.data, projects, fullQueries, scoreQueries, teamRefs]);

  return { data, isLoading, isError };
}
