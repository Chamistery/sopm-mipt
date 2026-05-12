/*
 * Page координатора «Распределение студентов». Pixel-port из admin.html
 * (view-distribution, lines 1174-1827).
 *
 * Структура:
 *   page-header        - заголовок + deadline
 *   gdist-toolbar      - search + status-filter + collapse/expand + run-button
 *   gdist-layout (flex)
 *     gdist-main       - список проектов с командами (D&D-target)
 *     gdist-sidebar    - пул нераспределённых (D&D-source/target)
 *
 * D&D реализован через HTML5 Drag and Drop API: payload в DataTransfer,
 * мутации (recommend / unrecommend) идут через TanStack Query, инвалидируя
 * COORDINATOR_DISTRIBUTION_KEY. Никаких глобальных сторов.
 *
 * Что отложено (known TODO):
 *   - student drawer (полный профиль студента с приоритетами)
 *   - status menu при клике на бейдж (пока статус показывается, но не
 *     меняется напрямую — только через D&D)
 *   - run-button на бэке (есть useGenerateDistribution, но фоновый сервис
 *     не запускается; кнопка вызывает мутацию которая отдаёт unavailable)
 */

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { recommendApplicant, unrecommendApplicant } from '@/api/applications';
import type {
  CoordinatorDistributionProject,
  CoordinatorPoolStudent,
} from '@/api/coordinatorDistribution';
import { useToast } from '@/_shared/Toast';
import {
  COORDINATOR_DISTRIBUTION_KEY,
  useCoordinatorDistribution,
} from '../hooks/useCoordinatorDistribution';
import { DistProjectCard } from './DistProjectCard';
import { DistPool } from './DistPool';
import {
  DIST_DRAG_MIME,
  hasDragPayload,
  readDragPayload,
  type DistDragPayload,
} from './dragData';
import styles from './CoordDistributionPage.module.css';

export function CoordDistributionPage(): JSX.Element {
  const dataQuery = useCoordinatorDistribution();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [collapsedProjects, setCollapsedProjects] = useState<Set<number>>(new Set());

  const recommendMut = useMutation({
    mutationFn: ({ id, teamId }: { id: number; teamId: number }) =>
      recommendApplicant(id, teamId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: COORDINATOR_DISTRIBUTION_KEY });
      showSuccess('Студент перемещён');
    },
    onError: (err) => showError(formatError(err, 'Не удалось переместить студента')),
  });

  const unrecommendMut = useMutation({
    mutationFn: (id: number) => unrecommendApplicant(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: COORDINATOR_DISTRIBUTION_KEY });
      showSuccess('Студент возвращён в пул');
    },
    onError: (err) => showError(formatError(err, 'Не удалось вернуть студента в пул')),
  });

  const handleDropToTeam = (payload: DistDragPayload, teamId: number, projectId: number): void => {
    if (payload.kind === 'team-member') {
      if (payload.sourceTeamId === teamId) return;
      recommendMut.mutate({ id: payload.applicationId, teamId });
      return;
    }
    // payload.kind === 'pool-student'
    const appId = payload.applicationsByProject[projectId];
    if (!appId) {
      showError(
        'Студент не подал заявку на этот проект. Создайте заявку через CRM или попросите студента подать её сам.',
      );
      return;
    }
    recommendMut.mutate({ id: appId, teamId });
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
                />
              ))
            )}
          </div>
          <aside className={styles.sidebar}>
            <DistPool pool={pool} onDropToPool={handleDropToPool} />
            <div className={styles.helpTile}>
              <b>Координатор:</b> может вручную переносить студентов между любыми
              командами любых проектов перетаскиванием. Чтобы исключить — перетащите
              чип в правую панель.
            </div>
          </aside>
        </div>
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

function filterProject(
  project: CoordinatorDistributionProject,
  term: string,
  status: string,
): CoordinatorDistributionProject | null {
  // Если выбран фильтр «В пуле» — проекты не показываем.
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

// Re-export of constant for type tests; кладём здесь чтобы ToolSearch не ругался
export { DIST_DRAG_MIME };

void hasDragPayload;
void readDragPayload;
