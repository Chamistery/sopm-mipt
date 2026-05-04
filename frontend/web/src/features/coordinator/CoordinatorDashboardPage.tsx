import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import {
  PROJECT_STATUS_APPROVED,
  updateProject,
  type ProjectListItem,
} from '@/api/projects';
import { RequiresAttention } from '@/_shared/RequiresAttention';
import { StatsCard } from './components/StatsCard';
import { useProjectsQuery } from './hooks/useProjects';
import { computeStats, pendingProjects } from './stats';
import styles from './CoordinatorDashboardPage.module.css';

/*
 * Coordinator dashboard. Pulls a single broad list of projects (no pagination
 * filter), buckets them client-side via stats.ts, surfaces those that need
 * approval, and provides a shortcut to the distribution screen.
 *
 * The brief asks for «всего / в распределении / активные / завершённые». We
 * surface drafts as the hint of the «всего» card to keep the strip at four.
 */

const LIST_LIMIT = 200;

export function CoordinatorDashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const projectsQuery = useProjectsQuery({ limit: LIST_LIMIT, offset: 0 });

  const projects = useMemo<readonly ProjectListItem[]>(
    () => projectsQuery.data?.projects ?? [],
    [projectsQuery.data?.projects],
  );
  const stats = useMemo(() => computeStats(projects), [projects]);
  const attention = useMemo(() => pendingProjects(projects), [projects]);

  const [reviewing, setReviewing] = useState<{ id: number; comment: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const approveMutation = useMutation({
    mutationFn: (id: number) =>
      updateProject(id, {
        title: titleOf(projects, id) ?? '',
        status: PROJECT_STATUS_APPROVED,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['coordinator', 'projects'] });
      setActionError(null);
    },
    onError: (err) => setActionError(formatError(err, 'Не удалось утвердить проект')),
  });

  const returnMutation = useMutation({
    mutationFn: (vars: { id: number }) =>
      updateProject(vars.id, { title: titleOf(projects, vars.id) ?? '', status: 'Черновик' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['coordinator', 'projects'] });
      setReviewing(null);
      setActionError(null);
    },
    onError: (err) => setActionError(formatError(err, 'Не удалось вернуть проект')),
  });

  return (
    <div className={styles.page}>
      <RequiresAttention />
      <section className={styles.statsGrid} aria-label="Статистика по проектам">
        <StatsCard
          tone="blue"
          label="Всего проектов"
          value={stats.total}
          hint={stats.drafts > 0 ? `${stats.drafts} в черновиках` : undefined}
        />
        <StatsCard tone="purple" label="На утверждении" value={stats.pending} />
        <StatsCard tone="green" label="Активные" value={stats.active} />
        <StatsCard tone="neutral" label="Завершённые" value={stats.completed} />
      </section>

      <section className={styles.section} aria-labelledby="attention-title">
        <header className={styles.sectionHead}>
          <div>
            <h2 id="attention-title" className={styles.sectionTitle}>
              Требует внимания
            </h2>
            <span className={styles.sectionHint}>Проекты в статусе «На утверждении»</span>
          </div>
          <Link to="/admin/projects" className={styles.btnGhost}>
            Все проекты
          </Link>
        </header>

        {projectsQuery.isLoading ? <div className={styles.empty}>Загружаем проекты…</div> : null}
        {projectsQuery.error ? (
          <div className={styles.error}>
            {formatError(projectsQuery.error, 'Не удалось загрузить проекты')}
          </div>
        ) : null}
        {actionError ? <div className={styles.error}>{actionError}</div> : null}

        {!projectsQuery.isLoading && attention.length === 0 ? (
          <div className={styles.empty}>Нет проектов, ожидающих утверждения.</div>
        ) : null}

        <div className={styles.attentionList}>
          {attention.map((p) => (
            <div key={p.id} className={styles.attentionItem}>
              <div className={styles.attentionInfo}>
                <button
                  type="button"
                  className={styles.attentionTitle}
                  onClick={() => navigate(`/admin/projects/${p.id}`)}
                >
                  {p.title}
                </button>
                <div className={styles.attentionMeta}>
                  {p.company ?? 'Компания не указана'} · ID {p.id} · мест: {p.maxSlots}
                </div>
              </div>

              {reviewing?.id === p.id ? (
                <ReviewForm
                  comment={reviewing.comment}
                  pending={returnMutation.isPending}
                  onChange={(comment) => setReviewing({ id: p.id, comment })}
                  onCancel={() => setReviewing(null)}
                  onSubmit={() => returnMutation.mutate({ id: p.id })}
                />
              ) : (
                <div className={styles.attentionActions}>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={() => approveMutation.mutate(p.id)}
                    disabled={approveMutation.isPending}
                  >
                    Утвердить
                  </button>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => setReviewing({ id: p.id, comment: '' })}
                  >
                    Вернуть на доработку
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHead}>
          <div>
            <h2 className={styles.sectionTitle}>Распределение студентов</h2>
            <span className={styles.sectionHint}>
              Запуск распределения по утверждённым проектам и ранжировкам
            </span>
          </div>
          <div className={styles.toolbar}>
            <Link to="/admin/distribution" className={styles.btnGhost}>
              Открыть распределение
            </Link>
          </div>
        </header>
      </section>
    </div>
  );
}

interface ReviewFormProps {
  comment: string;
  pending: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

function ReviewForm({
  comment,
  pending,
  onChange,
  onCancel,
  onSubmit,
}: ReviewFormProps): JSX.Element {
  return (
    <div className={styles.reviewForm}>
      <textarea
        className={styles.reviewTextarea}
        value={comment}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="Комментарий для ментора…"
      />
      <div className={styles.reviewActions}>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={onSubmit}
          disabled={pending}
        >
          {pending ? 'Возвращаем…' : 'Подтвердить возврат'}
        </button>
        <button type="button" className={styles.btnSecondary} onClick={onCancel}>
          Отмена
        </button>
      </div>
    </div>
  );
}

function titleOf(projects: readonly ProjectListItem[], id: number): string | undefined {
  return projects.find((p) => p.id === id)?.title;
}

function formatError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return `${fallback}: ${err.message}`;
  if (err instanceof Error) return `${fallback}: ${err.message}`;
  return fallback;
}
