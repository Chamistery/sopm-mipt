import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { getProject, type Project } from '@/api/projects';
import type { Team } from '@/api/teams';
import { useProjectDetail } from './hooks/useProjectDetail';
import { chainUrl, parseChain, popToChain } from './lib/archiveChain';
import { useArchiveBasePath } from './lib/archiveBasePath';
import styles from './ArchiveProjectTeamsPage.module.css';

/**
 * Промежуточный экран архива: список команд завершённого проекта.
 *
 * Хлебные крошки поддерживают chained navigation через ?chain=id1,id2,…
 * — это id архивных проектов выше по цепочке предшественников. Каждая
 * крошка кликабельна и ведёт на соответствующий уровень.
 */
export function ArchiveProjectTeamsPage(): JSX.Element {
  const params = useParams<{ projectId: string }>();
  const projectId = Number.parseInt(params.projectId ?? '', 10);
  const [searchParams] = useSearchParams();
  const chain = parseChain(searchParams.get('chain'));
  const detail = useProjectDetail(projectId);

  if (!Number.isFinite(projectId) || projectId <= 0) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>Некорректный идентификатор проекта</div>
      </div>
    );
  }

  if (detail.isLoading) {
    return (
      <div className={styles.page}>
        <ArchiveBackLink />
        <div className={styles.placeholder}>Загружаем архив проекта…</div>
      </div>
    );
  }

  if (detail.error) {
    const msg =
      detail.error instanceof ApiError
        ? `Ошибка ${detail.error.status}: ${detail.error.message}`
        : 'Не удалось загрузить проект';
    return (
      <div className={styles.page}>
        <ArchiveBackLink />
        <div className={styles.error}>{msg}</div>
      </div>
    );
  }

  if (!detail.data) return <div className={styles.page} />;

  const { project, teams } = detail.data;

  return (
    <div className={styles.page}>
      <ArchiveBreadcrumbs chain={chain} currentTitle={project.title} />

      <header className={styles.header}>
        <h1 className={styles.title}>{project.title}</h1>
        <p className={styles.subtitle}>
          {project.company ? `Инициатор: ${project.company} · ` : ''}
          Команд: {teams.length}
        </p>
      </header>

      {teams.length === 0 ? (
        <div className={styles.empty}>В этом проекте не было команд.</div>
      ) : (
        <ul className={styles.teamList}>
          {teams.map((team) => (
            <TeamRow key={team.id} team={team} chain={chain} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ArchiveBackLink(): JSX.Element {
  const basePath = useArchiveBasePath();
  return (
    <Link to={basePath} className={styles.back}>
      ← К архиву проектов
    </Link>
  );
}

interface TeamRowProps {
  team: Team;
  chain: number[];
}

function TeamRow({ team, chain }: TeamRowProps): JSX.Element {
  const basePath = useArchiveBasePath();
  const memberCount = team.members?.length ?? 0;
  const leaderName = team.leader
    ? `${team.leader.lastName} ${team.leader.firstName}`
    : 'Лидер не назначен';
  // Команда — лист цепочки, поэтому передаём chain без изменений.
  const href = chainUrl(`${basePath}/teams/${team.id}`, chain);

  return (
    <li>
      <Link to={href} className={styles.teamCard}>
        <div className={styles.teamCardHead}>
          <h3 className={styles.teamName}>{team.name}</h3>
          <span className={styles.teamCount}>{memberCount} чел.</span>
        </div>
        <div className={styles.teamLeader}>Лидер: {leaderName}</div>
      </Link>
    </li>
  );
}

/**
 * Хлебные крошки: «Архив проектов → <chain[0].title> → … → <текущий>».
 * Заголовки промежуточных проектов из chain[] подгружаются через
 * useQueries (один GET /projects/:id на каждый), потому что детали
 * предшественников не присутствуют в текущем ProjectFull.
 */
interface BreadcrumbsProps {
  chain: number[];
  currentTitle: string;
}

export function ArchiveBreadcrumbs({ chain, currentTitle }: BreadcrumbsProps): JSX.Element {
  const basePath = useArchiveBasePath();
  const queries = useQueries({
    queries: chain.map((id) => ({
      queryKey: ['project', id],
      queryFn: () => getProject(id),
      enabled: Number.isFinite(id) && id > 0,
    })),
  });

  const titles = useMemo(
    () =>
      chain.map((id, idx) => {
        const data = queries[idx]?.data as Project | undefined;
        return { id, title: data?.title ?? `Проект #${id}` };
      }),
    [chain, queries],
  );

  return (
    <nav className={styles.crumbs} aria-label="Хлебные крошки">
      <Link to={basePath} className={styles.crumbLink}>
        Архив проектов
      </Link>
      {titles.map((entry) => {
        // У крошки крошек: chain до этой точки.
        const popped = popToChain(chain, entry.id);
        const href = chainUrl(`${basePath}/projects/${entry.id}`, popped);
        return (
          <span key={entry.id} className={styles.crumbGroup}>
            <span className={styles.crumbSep} aria-hidden="true">/</span>
            <Link to={href} className={styles.crumbLink}>
              {entry.title}
            </Link>
          </span>
        );
      })}
      <span className={styles.crumbSep} aria-hidden="true">/</span>
      <span className={styles.crumbCurrent}>{currentTitle}</span>
    </nav>
  );
}
