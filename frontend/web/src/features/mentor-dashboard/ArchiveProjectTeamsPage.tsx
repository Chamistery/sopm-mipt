import { Link, useParams } from 'react-router-dom';

import { ApiError } from '@/api/client';
import type { Team } from '@/api/teams';
import { useProjectDetail } from './hooks/useProjectDetail';
import styles from './ArchiveProjectTeamsPage.module.css';

/**
 * Промежуточный экран архива: список команд завершённого проекта.
 *
 * Даже когда команда одна, показываем её через тот же list, чтобы переход
 * по архивным проектам был единообразным «проект → команды → команда».
 * Конечный экран команды живёт в `ArchiveTeamPage`.
 */
export function ArchiveProjectTeamsPage(): JSX.Element {
  const params = useParams<{ projectId: string }>();
  const projectId = Number.parseInt(params.projectId ?? '', 10);
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
      <nav className={styles.crumbs} aria-label="Хлебные крошки">
        <Link to="/mentor/archive" className={styles.crumbLink}>
          Архив проектов
        </Link>
        <span className={styles.crumbSep} aria-hidden="true">
          /
        </span>
        <span className={styles.crumbCurrent}>{project.title}</span>
      </nav>

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
            <TeamRow key={team.id} team={team} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ArchiveBackLink(): JSX.Element {
  return (
    <Link to="/mentor/archive" className={styles.back}>
      ← К архиву проектов
    </Link>
  );
}

function TeamRow({ team }: { team: Team }): JSX.Element {
  const memberCount = team.members?.length ?? 0;
  const leaderName = team.leader
    ? `${team.leader.lastName} ${team.leader.firstName}`
    : 'Лидер не назначен';

  return (
    <li>
      <Link to={`/mentor/archive/teams/${team.id}`} className={styles.teamCard}>
        <div className={styles.teamCardHead}>
          <h3 className={styles.teamName}>{team.name}</h3>
          <span className={styles.teamCount}>{memberCount} чел.</span>
        </div>
        <div className={styles.teamLeader}>Лидер: {leaderName}</div>
      </Link>
    </li>
  );
}
