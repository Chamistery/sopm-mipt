import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ApiError } from '@/api/client';
import {
  PROJECT_STATUS_OFFICIAL,
  PROJECT_STATUS_PENDING,
  PROJECT_STATUS_APPROVED,
  type ProjectListItem,
  type ProjectStatus,
} from '@/api/projects';
import { ProjectRow } from './components/ProjectRow';
import { useProjectsQuery } from './hooks/useProjects';
import { filterProjects } from './filters';
import styles from './ProjectsListPage.module.css';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: readonly ProjectStatus[] = [
  ...PROJECT_STATUS_OFFICIAL,
  PROJECT_STATUS_PENDING,
  PROJECT_STATUS_APPROVED,
];

export function ProjectsListPage(): JSX.Element {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('');
  const [search, setSearch] = useState('');

  const query = useProjectsQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    status: statusFilter === '' ? undefined : statusFilter,
  });

  const projects = useMemo<readonly ProjectListItem[]>(
    () => query.data?.projects ?? [],
    [query.data?.projects],
  );
  const total = query.data?.total ?? 0;

  const visible = useMemo(() => filterProjects(projects, search), [projects, search]);

  const handleStatusChange = (next: ProjectStatus | ''): void => {
    setStatusFilter(next);
    setPage(0);
  };

  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <input
          type="search"
          className={styles.input}
          placeholder="Поиск по названию или компании…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Поиск проектов"
        />
        <select
          className={styles.select}
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value as ProjectStatus | '')}
          aria-label="Фильтр по статусу"
        >
          <option value="">Все статусы</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.tableWrap}>
        {query.isLoading ? <div className={styles.loading}>Загружаем…</div> : null}
        {query.error ? (
          <div className={styles.error}>{formatError(query.error)}</div>
        ) : null}

        {!query.isLoading && !query.error ? (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Проект</th>
                  <th scope="col">Ментор</th>
                  <th scope="col">Компания</th>
                  <th scope="col">Статус</th>
                  <th scope="col">Заполнение</th>
                  <th scope="col">Команды</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    onOpen={(id) => navigate(`/admin/projects/${id}`)}
                  />
                ))}
              </tbody>
            </table>
            {visible.length === 0 ? (
              <div className={styles.empty}>
                {search ? 'Ничего не найдено по запросу.' : 'Нет проектов.'}
              </div>
            ) : null}

            <div className={styles.pagination}>
              <span>
                Стр. {page + 1} из {lastPage + 1} · всего {total}
              </span>
              <div className={styles.pageButtons}>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Назад
                </button>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  disabled={page >= lastPage}
                >
                  Вперёд
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function formatError(err: unknown): string {
  if (err instanceof ApiError) return `Ошибка ${err.status}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return 'Не удалось загрузить проекты';
}
