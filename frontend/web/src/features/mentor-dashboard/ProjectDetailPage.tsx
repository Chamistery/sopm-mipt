import { Link, useParams } from 'react-router-dom';

import { ApiError } from '@/api/client';
import type { Sprint, Team } from '@/api/teams';
import { StatusBadge } from './components/StatusBadge';
import { useProjectDetail } from './hooks/useProjectDetail';
import styles from './ProjectDetailPage.module.css';

/**
 * Mentor's project detail screen.
 *
 * Top: project meta (status, dates, mentor contact).
 * Middle: list of teams + leader. Empty state nudges the mentor toward
 * the distribution page so they can build the teams.
 * Bottom: sprints with dates and status. Each team row links to the
 * mentor task-review page (Гант).
 */
export function ProjectDetailPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const projectId = Number.parseInt(params.id ?? '', 10);
  const detail = useProjectDetail(projectId);

  if (!Number.isFinite(projectId) || projectId <= 0) {
    return (
      <div className={styles.page}>
        <ErrorPanel message="Некорректный идентификатор проекта" />
      </div>
    );
  }

  if (detail.isLoading) {
    return (
      <div className={styles.page}>
        <Link to="/mentor" className={styles.back}>
          ← К списку проектов
        </Link>
        <div className={styles.placeholder}>Загружаем проект…</div>
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
        <Link to="/mentor" className={styles.back}>
          ← К списку проектов
        </Link>
        <ErrorPanel message={msg} />
      </div>
    );
  }

  if (!detail.data) return <div className={styles.page} />;

  const { project, sprints, teams } = detail.data;

  return (
    <div className={styles.page}>
      <Link to="/mentor" className={styles.back}>
        ← К списку проектов
      </Link>

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{project.title}</h1>
          <div className={styles.metaRow}>
            <StatusBadge status={project.status} />
            {project.company ? <span className={styles.metaItem}>{project.company}</span> : null}
            {project.numTeams > 0 ? (
              <span className={styles.metaItem}>
                Команд: {project.numTeams}, размер {project.teamSizeMin}–{project.teamSizeMax}
              </span>
            ) : null}
            {project.minGpa ? (
              <span className={styles.metaItem}>GPA ≥ {project.minGpa.toFixed(2)}</span>
            ) : null}
          </div>
        </div>
        <div className={styles.actions}>
          <Link to={`/mentor/applicants/${project.id}`} className={styles.primaryBtn}>
            Открыть распределение
          </Link>
        </div>
      </header>

      {project.description ? <p className={styles.description}>{project.description}</p> : null}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Команды</h2>
          {teams.length === 0 ? (
            <Link to={`/mentor/applicants/${project.id}`} className={styles.secondaryBtn}>
              Сформировать команды
            </Link>
          ) : null}
        </div>
        {teams.length === 0 ? (
          <div className={styles.empty}>
            Команд ещё нет. Перейдите в распределение, чтобы собрать состав.
          </div>
        ) : (
          <div className={styles.teamGrid}>
            {teams.map((team) => (
              <TeamRow key={team.id} team={team} />
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Спринты</h2>
        {sprints.length === 0 ? (
          <div className={styles.empty}>Спринты ещё не запланированы.</div>
        ) : (
          <ul className={styles.sprintList}>
            {[...sprints]
              .sort((a, b) => a.number - b.number)
              .map((sprint) => (
                <SprintRow key={sprint.id} sprint={sprint} />
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TeamRow({ team }: { team: Team }): JSX.Element {
  const memberCount = team.members?.length ?? 0;
  const leaderName = team.leader
    ? `${team.leader.firstName} ${team.leader.lastName}`
    : 'Лидер не назначен';

  return (
    <article className={styles.teamCard}>
      <header className={styles.teamHead}>
        <h3 className={styles.teamName}>{team.name}</h3>
        <span className={styles.teamCount}>{memberCount} чел.</span>
      </header>
      <div className={styles.teamMeta}>{leaderName}</div>
      <div className={styles.teamActions}>
        <Link to={`/mentor/teams/${team.id}/gantt`} className={styles.linkBtn}>
          Гант команды
        </Link>
        <Link to={`/mentor/teams/${team.id}/reports`} className={styles.linkBtn}>
          Отчёты
        </Link>
      </div>
    </article>
  );
}

function SprintRow({ sprint }: { sprint: Sprint }): JSX.Element {
  return (
    <li className={styles.sprintRow}>
      <span className={styles.sprintNumber}>Спринт {sprint.number}</span>
      <span className={styles.sprintDates}>
        {sprint.startDate} → {sprint.endDate}
      </span>
      <span className={styles.sprintStatus}>{sprint.status}</span>
    </li>
  );
}

function ErrorPanel({ message }: { message: string }): JSX.Element {
  return <div className={styles.error}>{message}</div>;
}
