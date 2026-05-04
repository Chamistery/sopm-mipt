import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { ApiError } from '@/api/client';
import { useRequireUser } from '@/auth/useCurrentUser';
import { useMentorProjects } from './hooks/useMentorProjects';
import { ArchiveProjectCard } from './components/ArchiveProjectCard';
import styles from './MentorDashboardPage.module.css';
import archiveStyles from './ArchivePage.module.css';

const HIGHLIGHT_DURATION_MS = 2400;

/**
 * Mentor's archive — completed and archived projects only. Reuses the
 * same card grid as the main dashboard. Карточки ведут на
 * /mentor/archive/projects/:id (список команд).
 *
 * Поддерживает query-param `?highlight=:id` — после открытия страницы
 * скроллится к карточке этого проекта и подсвечивает её на 2.4с
 * (см. mentor.html, @keyframes archiveHighlightAnim).
 */
export function ArchivePage(): JSX.Element {
  const me = useRequireUser();
  const projectsQuery = useMentorProjects(me.userId, { archive: true });
  const [searchParams] = useSearchParams();
  const highlightId = Number(searchParams.get('highlight')) || null;
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!highlightId || !projectsQuery.data) return;
    if (!projectsQuery.data.some((p) => p.id === highlightId)) return;
    const node = cardRefs.current.get(highlightId);
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedId(highlightId);
    const t = window.setTimeout(() => setHighlightedId(null), HIGHLIGHT_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [highlightId, projectsQuery.data]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Архив проектов</h1>
          <div className={styles.context}>Завершённые и архивные проекты, которые вы вели</div>
        </div>
        <Link to="/mentor" className={styles.createBtn}>
          К активным
        </Link>
      </header>

      {projectsQuery.isLoading ? (
        <div className={styles.placeholder}>Загружаем архив…</div>
      ) : null}

      {projectsQuery.error ? (
        <div className={styles.error}>
          <div className={styles.errorTitle}>
            {projectsQuery.error instanceof ApiError
              ? `Ошибка ${projectsQuery.error.status}: ${projectsQuery.error.message}`
              : 'Не удалось загрузить архив'}
          </div>
        </div>
      ) : null}

      {projectsQuery.data && projectsQuery.data.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>Архив пуст</h2>
          <p className={styles.emptyText}>
            Когда вы завершите проект, он появится здесь — со всей историей команд и оценок.
          </p>
        </div>
      ) : null}

      {projectsQuery.data && projectsQuery.data.length > 0 ? (
        <div className={styles.columns}>
          {projectsQuery.data.map((project) => (
            <div
              key={project.id}
              ref={(el) => {
                if (el) cardRefs.current.set(project.id, el);
                else cardRefs.current.delete(project.id);
              }}
              className={
                highlightedId === project.id ? archiveStyles.highlight : undefined
              }
            >
              <ArchiveProjectCard
                project={project}
                to={`/mentor/archive/projects/${project.id}`}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
