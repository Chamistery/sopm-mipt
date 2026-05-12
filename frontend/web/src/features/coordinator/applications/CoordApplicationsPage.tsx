/*
 * Page координатора «Заявки на проекты». Pixel-port из admin.html
 * (view-applications, lines 2187-2212 + render JS 3796-3935).
 *
 * Источник данных — GET /api/coordinator/applications. На клик «Утвердить» /
 * «Отклонить» — POST /api/projects/:id/change-request/{approve|reject},
 * после успешной мутации список перезапрашивается.
 *
 * Что отложено (known TODO):
 *   - Кнопка «Посмотреть проект» — пока ведёт в /admin/projects/:id (будет
 *     корректная страница в view-project).
 *   - Фильтр по статусу одобрено/отклонено — у нас нет audit-log, поэтому
 *     показываем только pending. Селект статуса оставлен, но при выборе
 *     'approved'/'rejected' рендерим пустой список.
 */

import { useMemo, useState, type JSX } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import {
  getCoordinatorApplications,
} from '@/api/coordinatorApplications';
import {
  approveProjectChangeRequest,
  rejectProjectChangeRequest,
} from '@/api/projects';
import type { Project } from '@/api/projects';
import { useToast } from '@/_shared/Toast';
import {
  buildApplicationsFromProjects,
  type CoordApplication,
} from './buildApplications';
import { AppCard } from './AppCard';
import styles from './CoordApplicationsPage.module.css';

export const COORDINATOR_APPLICATIONS_KEY = ['coordinator', 'applications'] as const;

export function CoordApplicationsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [typeFilter, setTypeFilter] = useState<'all' | 'create' | 'edit'>('all');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | ''>('pending');

  const dataQuery = useQuery({
    queryKey: COORDINATOR_APPLICATIONS_KEY,
    queryFn: getCoordinatorApplications,
  });

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: COORDINATOR_APPLICATIONS_KEY });
    void queryClient.invalidateQueries({ queryKey: ['coordinator', 'dashboard'] });
  };

  const approveMut = useMutation({
    mutationFn: (projectId: number) => approveProjectChangeRequest(projectId),
    onSuccess: () => {
      invalidate();
      showSuccess('Изменения применены к проекту');
    },
    onError: (err) => showError(formatError(err, 'Не удалось утвердить заявку')),
  });

  const rejectMut = useMutation({
    mutationFn: (projectId: number) => rejectProjectChangeRequest(projectId),
    onSuccess: () => {
      invalidate();
      showSuccess('Заявка отклонена');
    },
    onError: (err) => showError(formatError(err, 'Не удалось отклонить заявку')),
  });

  const apps = useMemo<CoordApplication[]>(() => {
    const projects: Project[] = dataQuery.data?.applications ?? [];
    return buildApplicationsFromProjects(projects);
  }, [dataQuery.data]);

  const filtered = useMemo(() => {
    if (statusFilter && statusFilter !== 'pending') return []; // history TODO
    if (typeFilter === 'all') return apps;
    return apps.filter((a) => a.type === typeFilter);
  }, [apps, typeFilter, statusFilter]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Заявки на создание и редактирование проектов</h1>
        <div className={styles.context}>
          Заявки требуют утверждения координатором. После апрува изменения
          применяются к проекту.
        </div>
      </header>

      <div className={styles.toolbar}>
        <span className={styles.label}>Тип:</span>
        <select
          className={styles.select}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
        >
          <option value="all">Все</option>
          <option value="create">Создание</option>
          <option value="edit">Редактирование</option>
        </select>
        <span className={`${styles.label} ${styles.labelGap}`}>Статус:</span>
        <select
          className={styles.select}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
        >
          <option value="pending">Ожидают</option>
          <option value="approved">Утверждены</option>
          <option value="rejected">Отклонены</option>
          <option value="">Все</option>
        </select>
      </div>

      {dataQuery.isLoading ? (
        <div className={styles.placeholder}>Загружаем заявки…</div>
      ) : null}
      {dataQuery.error ? (
        <div className={styles.error}>{formatError(dataQuery.error, 'Не удалось загрузить')}</div>
      ) : null}

      {dataQuery.data ? (
        <div className={styles.list}>
          {filtered.length === 0 ? (
            <div className={styles.empty}>
              {statusFilter && statusFilter !== 'pending'
                ? 'История утверждённых/отклонённых заявок пока не ведётся.'
                : 'Нет заявок по выбранным фильтрам.'}
            </div>
          ) : (
            filtered.map((app) => (
              <AppCard
                key={`${app.projectId}-${app.type}`}
                application={app}
                onApprove={() => approveMut.mutate(app.projectId)}
                onReject={() => rejectMut.mutate(app.projectId)}
                approving={approveMut.isPending && approveMut.variables === app.projectId}
                rejecting={rejectMut.isPending && rejectMut.variables === app.projectId}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function formatError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return `${fallback}: ${err.message}`;
  if (err instanceof Error) return `${fallback}: ${err.message}`;
  return fallback;
}
