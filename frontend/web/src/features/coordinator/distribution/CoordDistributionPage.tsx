/*
 * Page координатора «Распределение студентов». Pixel-port из admin.html
 * (view-distribution, lines 1174-1827).
 *
 * Структура:
 *   page-header           — заголовок + deadline
 *   gdist-toolbar         — search + status-filter + collapse/expand + run-button
 *   gdist-layout (flex)
 *     gdist-main          — список проектов с командами (D&D-target)
 *     gdist-sidebar       — пул нераспределённых (D&D-source/target)
 *   stud-drawer (modal)   — выезжает справа при клике на чип
 *
 * D&D реализован через HTML5 Drag and Drop API: payload в DataTransfer,
 * мутации (recommend / unrecommend) идут через TanStack Query, инвалидируя
 * COORDINATOR_DISTRIBUTION_KEY.
 *
 * Status-menu открывается popover'ом при клике на бейдж статуса (см.
 * DistStatusMenu) — даёт переключить между Принят / Заявка отправлена /
 * Заявка не отправлена.
 *
 * Force-create: если из пула перетаскивают студента в проект, на который
 * у него нет заявки, создаётся новая заявка с первым свободным
 * приоритетом (1..5) и затем рекомендуется в команду.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import {
  moveApplicationToTeam,
  recommendApplicant,
  submitApplication,
  unrecommendApplicant,
} from '@/api/applications';
import type {
  CoordinatorDistributionProject,
  CoordinatorDistributionResponse,
  CoordinatorPoolStudent,
} from '@/api/coordinatorDistribution';
import { useToast } from '@/_shared/Toast';
import {
  generateDistribution,
  isDistributionUnavailable,
  type DistributionRunResult,
} from '@/api/distribution';
import {
  COORDINATOR_DISTRIBUTION_KEY,
  useCoordinatorDistribution,
} from '../hooks/useCoordinatorDistribution';
import { DistProjectCard } from './DistProjectCard';
import { DistPool } from './DistPool';
import { DistributionResultModal } from './DistributionResultModal';
import { DistStudentDrawer, type DrawerStudent } from './DistStudentDrawer';
import { useSetApplicationStatus } from './useStatusMutation';
import type { DistDragPayload } from './dragData';
import styles from './CoordDistributionPage.module.css';

/** Что показывать в правой панели. Храним только идентификаторы, чтобы
 *  drawer перерисовывался свежими данными после каждой мутации (не зависал
 *  на снимке состояния). */
export type DrawerSelection =
  | { kind: 'team-member'; teamId: number; applicationId: number }
  | { kind: 'pool'; studentId: number };

export function CoordDistributionPage(): JSX.Element {
  const dataQuery = useCoordinatorDistribution();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [collapsedProjects, setCollapsedProjects] = useState<Set<number>>(new Set());
  const [drawerSelection, setDrawerSelection] = useState<DrawerSelection | null>(null);
  const [runResult, setRunResult] = useState<DistributionRunResult | null>(null);

  const runMutation = useMutation({
    mutationFn: generateDistribution,
    onSuccess: (result) => {
      setRunResult(result);
      // Свежая выборка после применения новых статусов.
      void queryClient.invalidateQueries({ queryKey: COORDINATOR_DISTRIBUTION_KEY });
    },
    onError: (err) => {
      if (isDistributionUnavailable(err)) {
        showError('Сервис распределения временно недоступен');
      } else {
        showError(formatError(err, 'Не удалось запустить распределение'));
      }
    },
  });

  // Drawer-DTO собираем из FRESH-данных при каждом рендере. Так после
  // мутации (смена статуса / move-team) drawer мгновенно показывает
  // новое состояние, а не зависает на снимке из onOpenDrawer.
  const drawerStudent = useMemo<DrawerStudent | null>(
    () => buildDrawerStudent(drawerSelection, dataQuery.data),
    [drawerSelection, dataQuery.data],
  );

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: COORDINATOR_DISTRIBUTION_KEY });
  };

  const recommendMut = useMutation({
    mutationFn: ({ id, teamId }: { id: number; teamId: number }) =>
      recommendApplicant(id, teamId),
    onSuccess: () => {
      invalidate();
      showSuccess('Студент перемещён');
    },
    onError: (err) => showError(formatError(err, 'Не удалось переместить студента')),
  });

  const moveTeamMut = useMutation({
    mutationFn: ({ id, teamId }: { id: number; teamId: number }) =>
      moveApplicationToTeam(id, teamId),
    onSuccess: () => {
      invalidate();
      showSuccess('Студент перемещён (статус сохранён)');
    },
    onError: (err) => showError(formatError(err, 'Не удалось переместить студента')),
  });

  const unrecommendMut = useMutation({
    mutationFn: (id: number) => unrecommendApplicant(id),
    onSuccess: () => {
      invalidate();
      showSuccess('Студент возвращён в пул');
    },
    onError: (err) => showError(formatError(err, 'Не удалось вернуть студента в пул')),
  });

  const forceCreateMut = useMutation({
    mutationFn: async ({
      studentId,
      projectId,
      teamId,
      priority,
    }: {
      studentId: number;
      projectId: number;
      teamId: number;
      priority: number;
    }) => {
      const newApp = await submitApplication({ studentId, projectId, priority });
      return recommendApplicant(newApp.id, teamId);
    },
    onSuccess: () => {
      invalidate();
      showSuccess('Заявка создана и студент назначен в команду');
    },
    onError: (err) => showError(formatError(err, 'Не удалось создать заявку')),
  });

  // Кросс-проектный перенос: координатор тащит чип студента из команды
  // проекта A в команду проекта B. Бэк хранит team_id внутри одной заявки,
  // которая всегда привязана к одному project_id, поэтому move-team в
  // другой проект не валиден — нужно сменить заявку. Делаем цепочку:
  //   1) unrecommend старой заявки → освобождает team_id и удаляет team_members;
  //   2) если у студента уже есть заявка на target project — recommend её
  //      в новую команду; иначе — submitApplication (force-create) + recommend.
  const crossProjectMoveMut = useMutation({
    mutationFn: async ({
      sourceApplicationId,
      targetProjectId,
      targetTeamId,
      studentId,
      existingTargetAppId,
      priority,
    }: {
      sourceApplicationId: number;
      targetProjectId: number;
      targetTeamId: number;
      studentId: number;
      existingTargetAppId: number | null;
      priority: number;
    }) => {
      await unrecommendApplicant(sourceApplicationId);
      if (existingTargetAppId != null) {
        return recommendApplicant(existingTargetAppId, targetTeamId);
      }
      const newApp = await submitApplication({
        studentId,
        projectId: targetProjectId,
        priority,
      });
      return recommendApplicant(newApp.id, targetTeamId);
    },
    onSuccess: () => {
      invalidate();
      showSuccess('Студент перемещён в другой проект');
    },
    onError: (err) => showError(formatError(err, 'Не удалось перенести студента')),
  });

  const statusMut = useSetApplicationStatus();

  const handleSetStatus = (
    applicationId: number,
    teamId: number,
    key: 'accepted' | 'invited' | 'recommend',
  ): void => {
    statusMut.mutate(
      { applicationId, teamId, key },
      {
        onSuccess: () => {
          const label =
            key === 'accepted'
              ? 'Принят'
              : key === 'invited'
                ? 'Заявка отправлена'
                : 'Заявка не отправлена';
          showSuccess(`Статус изменён: ${label}`);
        },
        onError: (err) => showError(formatError(err, 'Не удалось изменить статус')),
      },
    );
  };

  const handleDropToTeam = (payload: DistDragPayload, teamId: number, projectId: number): void => {
    if (payload.kind === 'team-member') {
      if (payload.sourceTeamId === teamId) return;

      // Кросс-проектный перенос: новая команда лежит в другом проекте.
      // Backend не разрешает менять project через move-team или recommend
      // (заявка привязана к одному проекту), поэтому делаем chain через
      // crossProjectMoveMut.
      if (payload.sourceProjectId !== projectId) {
        if (payload.sourceStatus === 'Принят' || payload.sourceStatus === 'Принято ментором') {
          const ok = window.confirm(
            'Студент уже привязан к команде другого проекта. Перенести в новую? ' +
              'Старая заявка вернётся в пул со статусом «Заявка не отправлена».',
          );
          if (!ok) return;
        }
        const existingTargetAppId = payload.applicationsByProject[projectId] ?? null;
        const freePriority = pickFreePriorityForStudent(
          payload.studentId,
          dataQuery.data,
          payload.applicationsByProject,
        );
        if (existingTargetAppId == null && freePriority == null) {
          showError(
            'У студента уже 5 приоритетов. Освободите один из них перед переносом в новый проект.',
          );
          return;
        }
        crossProjectMoveMut.mutate({
          sourceApplicationId: payload.applicationId,
          targetProjectId: projectId,
          targetTeamId: teamId,
          studentId: payload.studentId,
          existingTargetAppId,
          priority: freePriority ?? 1,
        });
        return;
      }

      // Pixel-port из admin.html:2880-2912:
      //   - status='Принят' (accepted): confirm + reset на 'Рекомендован'
      //     (потому что student-side accept нужно повторить в новой команде)
      //   - status='Принято ментором' / 'Рекомендован': move-team
      //     сохраняет статус
      if (payload.sourceStatus === 'Принят') {
        const ok = window.confirm(
          'Студент уже принят в команду. Переместить в другую? Статус будет сброшен на «Заявка не отправлена».',
        );
        if (!ok) return;
        recommendMut.mutate({ id: payload.applicationId, teamId });
        return;
      }
      moveTeamMut.mutate({ id: payload.applicationId, teamId });
      return;
    }
    // payload.kind === 'pool-student'
    const existing = payload.applicationsByProject[projectId];
    if (existing) {
      recommendMut.mutate({ id: existing, teamId });
      return;
    }
    // Force-create: студент не подавал заявку на этот проект.
    const freePriority = pickFreePriorityForStudent(
      payload.studentId,
      dataQuery.data,
      payload.applicationsByProject,
    );
    if (freePriority == null) {
      showError(
        'У студента уже 5 приоритетов. Освободите один из них через «Архив заявок», прежде чем добавлять в новый проект.',
      );
      return;
    }
    forceCreateMut.mutate({
      studentId: payload.studentId,
      projectId,
      teamId,
      priority: freePriority,
    });
  };

  const handleDropToPool = (payload: DistDragPayload): void => {
    if (payload.kind !== 'team-member') return;
    unrecommendMut.mutate(payload.applicationId);
  };

  const filtered = useMemo<CoordinatorDistributionProject[]>(() => {
    if (!dataQuery.data) return [];
    const term = search.trim().toLowerCase();
    return dataQuery.data.projects
      .map((p) => filterProject(p, term, statusFilter))
      .filter((p): p is CoordinatorDistributionProject => p !== null);
  }, [dataQuery.data, search, statusFilter]);

  const pool = useMemo<CoordinatorPoolStudent[]>(() => {
    if (!dataQuery.data) return [];
    if (statusFilter && statusFilter !== 'pool') return [];
    const term = search.trim().toLowerCase();
    if (!term) return dataQuery.data.pool;
    return dataQuery.data.pool.filter((s) =>
      `${s.lastName} ${s.firstName}`.toLowerCase().includes(term),
    );
  }, [dataQuery.data, search, statusFilter]);

  const toggleCollapse = (projectId: number): void => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const collapseAll = (): void => {
    if (!dataQuery.data) return;
    setCollapsedProjects(new Set(dataQuery.data.projects.map((p) => p.id)));
  };

  const expandAll = (): void => setCollapsedProjects(new Set());

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Распределение студентов</h1>
          {dataQuery.data?.deadline ? (
            <div className={styles.deadline}>Дедлайн подтверждения: {dataQuery.data.deadline}</div>
          ) : (
            <div className={styles.deadline}>Дедлайн подтверждения: 15 марта 2025</div>
          )}
        </div>
      </header>

      <div className={styles.toolbar}>
        <span className={styles.toolbarLabel}>Поиск:</span>
        <input
          type="search"
          className={styles.input}
          placeholder="Имя студента или проект..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className={`${styles.toolbarLabel} ${styles.toolbarLabelGap}`}>Статус:</span>
        <select
          className={styles.select}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Все</option>
          <option value="accepted">Принят</option>
          <option value="invited">Заявка отправлена</option>
          <option value="recommend">Заявка не отправлена</option>
          <option value="pool">В пуле (без команды)</option>
        </select>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={collapseAll}
          style={{ marginLeft: 'auto' }}
        >
          Свернуть всё
        </button>
        <button type="button" className={styles.btnSecondary} onClick={expandAll}>
          Развернуть всё
        </button>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending}
        >
          <CheckIcon />
          {runMutation.isPending ? 'Распределение…' : 'Запустить распределение'}
        </button>
      </div>

      {dataQuery.isLoading ? <div className={styles.placeholder}>Загружаем распределение…</div> : null}
      {dataQuery.error ? (
        <div className={styles.error}>{formatError(dataQuery.error, 'Не удалось загрузить')}</div>
      ) : null}

      {dataQuery.data ? (
        <div className={styles.layout}>
          <div className={styles.main}>
            {filtered.length === 0 ? (
              <div className={styles.empty}>
                {search ? 'Ничего не найдено по запросу.' : 'Активных проектов нет.'}
              </div>
            ) : (
              filtered.map((project) => (
                <DistProjectCard
                  key={project.id}
                  project={project}
                  collapsed={collapsedProjects.has(project.id)}
                  onToggleCollapse={() => toggleCollapse(project.id)}
                  onDropToTeam={handleDropToTeam}
                  onOpenDrawer={setDrawerSelection}
                  onSetStatus={handleSetStatus}
                />
              ))
            )}
          </div>
          <aside className={styles.sidebar}>
            <DistPool
              pool={pool}
              onDropToPool={handleDropToPool}
              onOpenDrawer={setDrawerSelection}
            />
            <div className={styles.helpTile}>
              <b>Координатор:</b> может вручную переносить студентов между любыми
              командами любых проектов перетаскиванием. Чтобы исключить — перетащите
              чип в правую панель. Клик по чипу — открыть профиль; клик по бейджу
              статуса — изменить статус.
            </div>
          </aside>
        </div>
      ) : null}

      <DistStudentDrawer
        student={drawerStudent}
        onSetStatus={handleSetStatus}
        onClose={() => setDrawerSelection(null)}
      />

      {runResult ? (
        <DistributionResultModal result={runResult} onClose={() => setRunResult(null)} />
      ) : null}
    </div>
  );
}

function CheckIcon(): JSX.Element {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Возвращает свободный приоритет (1..5) для студента, проверяя все его
 * существующие заявки. Используется при force-create новой заявки (как из
 * пула, так и при кросс-проектном переносе). Если в payload-е уже есть
 * mapping projectId→applicationId — берём из него приоритеты через данные
 * запроса; если данных нет — fall back на 1 (бэк отдаст 400 при дубликате).
 */
function pickFreePriorityForStudent(
  studentId: number,
  data: CoordinatorDistributionResponse | undefined,
  applicationsByProject: Record<number, number>,
): number | null {
  const used = new Set<number>();
  if (data) {
    const poolEntry = data.pool.find((s) => s.studentId === studentId);
    if (poolEntry) {
      for (const p of poolEntry.priorities) used.add(p.priority);
    }
    for (const project of data.projects) {
      for (const team of project.teams) {
        for (const m of team.members) {
          if (m.studentId !== studentId) continue;
          if (m.allPriorities && m.allPriorities.length > 0) {
            for (const p of m.allPriorities) used.add(p.priority);
          } else {
            used.add(m.priority);
          }
        }
      }
    }
  }
  // applicationsByProject не несёт priorities, но если выше data отсутствует,
  // хоть как-то ограничим количество — берём количество существующих заявок.
  if (used.size === 0) {
    for (let i = 1; i <= Object.keys(applicationsByProject).length; i += 1) {
      used.add(i);
    }
  }
  for (let i = 1; i <= 5; i += 1) {
    if (!used.has(i)) return i;
  }
  return null;
}

function filterProject(
  project: CoordinatorDistributionProject,
  term: string,
  status: string,
): CoordinatorDistributionProject | null {
  if (status === 'pool') return null;
  const teams = project.teams.map((team) => ({
    ...team,
    members: team.members.filter((m) => {
      if (status && status !== 'pool') {
        const code = m.status;
        if (status === 'accepted' && code !== 'Принят') return false;
        if (status === 'invited' && code !== 'Принято ментором') return false;
        if (
          status === 'recommend' &&
          !['Рекомендован', 'Не рекомендован', 'Не подходит', 'Ожидает'].includes(code)
        ) {
          return false;
        }
      }
      if (term) {
        const name = `${m.lastName} ${m.firstName}`.toLowerCase();
        const proj = project.title.toLowerCase();
        if (!name.includes(term) && !proj.includes(term)) return false;
      }
      return true;
    }),
  }));
  const hasMatch =
    teams.some((t) => t.members.length > 0) ||
    (!term && !status) ||
    project.title.toLowerCase().includes(term);
  if (!hasMatch) return null;
  return { ...project, teams };
}

function formatError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return `${fallback}: ${err.message}`;
  if (err instanceof Error) return `${fallback}: ${err.message}`;
  return fallback;
}

/** Собирает DrawerStudent из текущего DrawerSelection и свежих query-данных.
 *  Если selection указывает на чип, которого больше нет (например, после
 *  unrecommend он исчез из команд и попал в пул) — пытаемся переключиться
 *  по studentId на новое местоположение. Если ничего не нашли — возвращаем
 *  null (drawer закроется). */
function buildDrawerStudent(
  selection: DrawerSelection | null,
  data: CoordinatorDistributionResponse | undefined,
): DrawerStudent | null {
  if (!selection || !data) return null;

  if (selection.kind === 'team-member') {
    for (const project of data.projects) {
      const team = project.teams.find((t) => t.id === selection.teamId);
      if (!team) continue;
      const member = team.members.find((m) => m.applicationId === selection.applicationId);
      if (!member) continue;
      return {
        studentId: member.studentId,
        firstName: member.firstName,
        lastName: member.lastName,
        course: member.course,
        group: member.group,
        gpa: member.gpa,
        priorities:
          member.allPriorities && member.allPriorities.length > 0
            ? member.allPriorities.map((p) => ({
                applicationId: p.applicationId,
                projectId: p.projectId,
                projectTitle: p.projectTitle,
                company: p.company,
                mentorName: p.mentorName,
                priority: p.priority,
                status: p.status,
              }))
            : [
                {
                  applicationId: member.applicationId,
                  projectId: project.id,
                  projectTitle: project.title,
                  priority: member.priority,
                  status: member.status,
                },
              ],
        currentTeamProjectId: project.id,
        currentProjectTitle: project.title,
        currentTeamName: team.name,
        currentApplicationId: member.applicationId,
        currentTeamId: team.id,
      };
    }
    // Чип ушёл из команды — попробуем найти этого студента в пуле.
    return findStudentInPool(data, /* studentId by lookup */ null, selection.applicationId);
  }

  // selection.kind === 'pool'
  const pool = data.pool.find((s) => s.studentId === selection.studentId);
  if (!pool) {
    // Студент мог попасть в команду — найдём по studentId.
    return findStudentInTeam(data, selection.studentId);
  }
  return {
    studentId: pool.studentId,
    firstName: pool.firstName,
    lastName: pool.lastName,
    course: pool.course,
    group: pool.group,
    gpa: pool.gpa,
    priorities: pool.priorities,
    currentTeamProjectId: null,
    currentProjectTitle: null,
    currentTeamName: null,
    currentApplicationId: null,
    currentTeamId: null,
  };
}

function findStudentInPool(
  data: CoordinatorDistributionResponse,
  _studentId: number | null,
  applicationId: number,
): DrawerStudent | null {
  // Ищем студента по applicationId в пуле (он мог уйти из команды через
  // unrecommend и приехать в пул со своими приоритетами).
  for (const pool of data.pool) {
    if (pool.priorities.some((p) => p.applicationId === applicationId)) {
      return {
        studentId: pool.studentId,
        firstName: pool.firstName,
        lastName: pool.lastName,
        course: pool.course,
        group: pool.group,
        gpa: pool.gpa,
        priorities: pool.priorities,
        currentTeamProjectId: null,
        currentProjectTitle: null,
        currentTeamName: null,
        currentApplicationId: null,
        currentTeamId: null,
      };
    }
  }
  return null;
}

function findStudentInTeam(
  data: CoordinatorDistributionResponse,
  studentId: number,
): DrawerStudent | null {
  for (const project of data.projects) {
    for (const team of project.teams) {
      const member = team.members.find((m) => m.studentId === studentId);
      if (!member) continue;
      return {
        studentId: member.studentId,
        firstName: member.firstName,
        lastName: member.lastName,
        course: member.course,
        group: member.group,
        gpa: member.gpa,
        priorities:
          member.allPriorities && member.allPriorities.length > 0
            ? member.allPriorities.map((p) => ({
                applicationId: p.applicationId,
                projectId: p.projectId,
                projectTitle: p.projectTitle,
                company: p.company,
                mentorName: p.mentorName,
                priority: p.priority,
                status: p.status,
              }))
            : [],
        currentTeamProjectId: project.id,
        currentProjectTitle: project.title,
        currentTeamName: team.name,
        currentApplicationId: member.applicationId,
        currentTeamId: team.id,
      };
    }
  }
  return null;
}
