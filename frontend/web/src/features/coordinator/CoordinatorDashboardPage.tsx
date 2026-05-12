/*
 * Dashboard координатора. Pixel-port из admin.html (view-dashboard,
 * lines 803-983). Источник данных — GET /api/coordinator/dashboard,
 * который отдаёт всё в одном запросе: stats + attention + projects (с
 * полем mentor для отображения в meta каждой карточки).
 */

import type { JSX } from 'react';
import { Link } from 'react-router-dom';

import { ApiError } from '@/api/client';
import { IterSquare } from '@/features/mentor-dashboard/components/ProjectCard';
import { StatsRow } from './components/StatsRow';
import { AttentionList } from './components/AttentionList';
import { CoordProjectCard } from './components/CoordProjectCard';
import { useCoordinatorDashboard } from './hooks/useCoordinatorDashboard';
import styles from './CoordinatorDashboardPage.module.css';

export function CoordinatorDashboardPage(): JSX.Element {
  const query = useCoordinatorDashboard();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Панель управления</h1>
          <div className={styles.context}>
            Весенний семестр 2025/2026
            <span className={styles.contextDot} aria-hidden="true" />
            Направление «Программная инженерия»
          </div>
        </div>
        <Link to="/admin/projects/new" className={styles.createBtn}>
          <PlusIcon />
          Создать проект
        </Link>
      </header>

      {query.isLoading ? <div className={styles.placeholder}>Загружаем дашборд…</div> : null}

      {query.error ? <ErrorPanel error={query.error} /> : null}

      {query.data ? (
        <>
          <StatsRow stats={query.data.stats} />
          <AttentionList attention={query.data.attention} />

          <div className={styles.projectsHeader}>
            <h2 className={styles.projectsTitle}>Проекты</h2>
          </div>

          <div className={styles.legend} aria-label="Легенда статусов спринтов">
            <span className={styles.legendItem}>
              <IterSquare state="reviewed" size={16} />
              Проверен
            </span>
            <span className={styles.legendItem}>
              <IterSquare state="pending-review" size={16} />
              Ждёт проверки
            </span>
            <span className={styles.legendItem}>
              <IterSquare state="missed" size={16} />
              Не сдан
            </span>
            <span className={styles.legendItem}>
              <IterSquare state="current" size={16} />
              Текущий
            </span>
            <span className={styles.legendItem}>
              <IterSquare state="future" size={16} />
              Будущий
            </span>
          </div>

          {query.data.projects.length === 0 ? (
            <div className={styles.empty}>
              <h3 className={styles.emptyTitle}>Проектов ещё нет</h3>
              <p className={styles.emptyText}>
                Создайте первый проект — он появится в каталоге студентов после публикации.
              </p>
            </div>
          ) : (
            <div className={styles.columns}>
              {query.data.projects.map((p) => (
                <CoordProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function PlusIcon(): JSX.Element {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ErrorPanel({ error }: { error: unknown }): JSX.Element {
  const message =
    error instanceof ApiError
      ? `Ошибка ${error.status}: ${error.message}`
      : error instanceof Error
        ? error.message
        : 'Не удалось загрузить';
  return (
    <div className={styles.error}>
      <div className={styles.errorTitle}>{message}</div>
      <p className={styles.errorHint}>
        Проверьте, что бэкенд запущен (<code>make up</code>) и переменная{' '}
        <code>VITE_API_TARGET</code> указывает на нужный адрес.
      </p>
    </div>
  );
}
