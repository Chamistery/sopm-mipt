/*
 * Дашборд ментора. Pixel-port из mentor.html (view-dashboard).
 *
 * Структура:
 *   1. Шапка       — H1 «Дашборд ментора» + контекст семестра + CTA
 *   2. RequiresAttention блок (живёт в _shared/, своих pages-specifics не
 *      добавляем).
 *   3. «Мои проекты» — заголовок секции + легенда квадратиков спринтов.
 *   4. Сетка карточек проектов (1fr 1fr; <900px — 1 колонка).
 *
 * Источник данных — useMentorDashboard, отдаёт список MentorDashboardProject
 * (sprints + teams + sprint statuses). Старый useMentorProjects используется
 * на других экранах (архив, ApplicantsPage) и не трогается.
 */

import type { JSX } from 'react';
import { Link } from 'react-router-dom';

import { useRequireUser } from '@/auth/useCurrentUser';
import { ApiError } from '@/api/client';
import { RequiresAttention } from '@/_shared/RequiresAttention';
import { useMentorDashboard } from './hooks/useMentorDashboard';
import { ProjectCard, IterSquare } from './components/ProjectCard';
import styles from './MentorDashboardPage.module.css';

export function MentorDashboardPage(): JSX.Element {
  const me = useRequireUser();
  const dashboardQuery = useMentorDashboard(me.userId);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Дашборд ментора</h1>
          <div className={styles.context}>
            Весенний семестр 2025/2026 уч. г.
            <span className={styles.contextDot} aria-hidden="true" />
            Направление «Программная инженерия»
          </div>
        </div>
        <Link to="/mentor/projects/new" className={styles.createBtn}>
          <PlusIcon />
          Создать проект
        </Link>
      </header>

      <RequiresAttention />

      <section className={styles.projectsSection} aria-label="Мои проекты">
        <div className={styles.projectsHeader}>
          <h2 className={styles.projectsTitle}>Мои проекты</h2>
        </div>

        <div className={styles.legend}>
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

        {dashboardQuery.isLoading ? (
          <div className={styles.placeholder}>Загружаем проекты…</div>
        ) : null}

        {dashboardQuery.error ? <ErrorPanel error={dashboardQuery.error} /> : null}

        {dashboardQuery.data && dashboardQuery.data.length === 0 ? (
          <div className={styles.empty}>
            <h3 className={styles.emptyTitle}>Проектов ещё нет</h3>
            <p className={styles.emptyText}>
              Создайте первый проект — он появится в каталоге студентов после публикации.
            </p>
            <Link to="/mentor/projects/new" className={styles.createBtn}>
              Создать первый проект
            </Link>
          </div>
        ) : null}

        {dashboardQuery.data && dashboardQuery.data.length > 0 ? (
          <div className={styles.columns}>
            {dashboardQuery.data.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function PlusIcon(): JSX.Element {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M9 3v12M3 9h12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ErrorPanel({ error }: { error: unknown }): JSX.Element {
  const message =
    error instanceof ApiError ? `Ошибка ${error.status}: ${error.message}` : 'Не удалось загрузить';
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
