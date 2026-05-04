import { Link } from 'react-router-dom';

import { useRequireUser } from '@/auth/useCurrentUser';
import { ApiError } from '@/api/client';
import { RequiresAttention } from '@/_shared/RequiresAttention';
import { useMentorProjects } from './hooks/useMentorProjects';
import { ProjectCard } from './components/ProjectCard';
import styles from './MentorDashboardPage.module.css';

export function MentorDashboardPage(): JSX.Element {
  const me = useRequireUser();
  const projectsQuery = useMentorProjects(me.userId);

  return (
    <div className={styles.page}>
      <RequiresAttention />
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Мои проекты</h1>
          <p className={styles.subtitle}>
            Здесь все ваши проекты — активные, опубликованные и в архиве
          </p>
        </div>
        <Link to="/mentor/projects/new" className={styles.createBtn}>
          + Новый проект
        </Link>
      </header>

      {projectsQuery.isLoading ? (
        <div className={styles.placeholder}>Загружаем проекты…</div>
      ) : null}

      {projectsQuery.error ? <ErrorPanel error={projectsQuery.error} /> : null}

      {projectsQuery.data && projectsQuery.data.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>Проектов ещё нет</h2>
          <p className={styles.emptyText}>
            Создайте первый проект — он появится в каталоге студентов после публикации.
          </p>
          <Link to="/mentor/projects/new" className={styles.createBtn}>
            Создать первый проект
          </Link>
        </div>
      ) : null}

      {projectsQuery.data && projectsQuery.data.length > 0 ? (
        <div className={styles.grid}>
          {projectsQuery.data.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ErrorPanel({ error }: { error: unknown }): JSX.Element {
  const message =
    error instanceof ApiError ? `Ошибка ${error.status}: ${error.message}` : 'Не удалось загрузить';
  return (
    <div className={styles.error}>
      <div className={styles.errorTitle}>{message}</div>
      <p className={styles.errorHint}>
        Проверьте, что бэкенд запущен (<code>make docker-up</code> в{' '}
        <code>backend/project-service</code>) и переменная <code>VITE_API_TARGET</code> указывает
        на нужный адрес.
      </p>
    </div>
  );
}
