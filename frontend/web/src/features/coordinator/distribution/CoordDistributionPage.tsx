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
  COORDINATOR_DISTRIBUTION_KEY,
  useCoordinatorDistribution,
} from '../hooks/useCoordinatorDistribution';
import { DistProjectCard } from './DistProjectCard';
import { DistPool } from './DistPool';
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
    const usedPriorities = new Set(
      Object.values(payload.applicationsByProject).map((appId) => appId), // приоритеты не приходят в payload
    );
    // applicationsByProject содержит только projectId→applicationId, но нам
    // нужны использованные ПРИОРИТЕТЫ. Тянем их из dataQuery.data.pool по
    // studentId.
    const poolEntry = dataQuery.data?.pool.find((s) => s.studentId === payload.studentId);
    const priorityNumbers = new Set((poolEntry?.priorities ?? []).map((p) => p.priority));
    let freePriority = 0;
    for (let i = 1; i <= 5; i += 1) {
      if (!priorityNumbers.has(i)) {
        freePriority = i;
        break;
      }
    }
    if (!freePriority) {
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
    // silence linter
    void usedPriorities;
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
          onClick={() => showError('Сервис распределения временно недоступен')}
        >
          <CheckIcon />
          Запустить распределение
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
