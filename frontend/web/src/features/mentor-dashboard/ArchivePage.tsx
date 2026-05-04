import { Link } from 'react-router-dom';

import { ApiError } from '@/api/client';
import { useRequireUser } from '@/auth/useCurrentUser';
import { useMentorProjects } from './hooks/useMentorProjects';
import { ProjectCard } from './components/ProjectCard';
import styles from './MentorDashboardPage.module.css';

/**
 * Mentor's archive — completed and archived projects only. Reuses the
 * same card grid and styles as the main dashboard so the look is
 * familiar; the data source filter (status = Завершён | Архивный) lives
 * inside `useMentorProjects`. Карточки ведут на /mentor/archive/projects/:id
 * (список команд), а не на обычный mentor-projects detail.
 */
export function ArchivePage(): JSX.Element {
  const me = useRequireUser();
  const projectsQuery = useMentorProjects(me.userId, { archive: true });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Архив проектов</h1>
          <p className={styles.subtitle}>Завершённые и архивные проекты, которые вы вели</p>
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
        <div className={styles.grid}>
          {projectsQuery.data.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              to={`/mentor/archive/projects/${project.id}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
