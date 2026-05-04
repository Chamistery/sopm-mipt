/*
 * ArchiveProjectCard — компактная карточка для страницы архива.
 *
 * Существует отдельно от ProjectCard, потому что:
 *   - ProjectCard теперь привязан к MentorDashboardProject (sprints + teams)
 *     — данные, которых нет у архивных проектов из listProjects
 *   - архивная карточка показывает прогрессбар и завершённый статус, а не
 *     текущий спринт + iter-track.
 *
 * Когда archive получит свой агрегированный endpoint, эту карточку можно
 * заменить полной версией ProjectCard. Пока — пиксельный плейсхолдер.
 */

import type { JSX } from 'react';
import { Link } from 'react-router-dom';

import { projectFillRatio, projectMaxSlots, type ProjectListItem } from '@/api/projects';
import { StatusBadge } from './StatusBadge';
import styles from './ArchiveProjectCard.module.css';

interface Props {
  project: ProjectListItem;
  /** Override link target. По умолчанию ведёт на дашборд (страницы детали
   * проекта у ментора нет — ArchivePage всегда передаёт `to` явно). */
  to?: string;
}

export function ArchiveProjectCard({ project, to }: Props): JSX.Element {
  const ratio = projectFillRatio(project);
  const percent = Math.round(ratio * 100);
  const maxSlots = projectMaxSlots(project);
  const href = to ?? `/mentor/archive/projects/${project.id}`;

  return (
    <Link to={href} className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{project.title}</h3>
        <StatusBadge status={project.status} />
      </div>
      <div className={styles.meta}>
        {project.company ? <span>Инициатор: {project.company}</span> : null}
        {project.numTeams > 0 ? <span>Команд: {project.numTeams}</span> : null}
      </div>
      <div className={styles.progress}>
        <div className={styles.progressLabel}>
          <span>Заполненность</span>
          <span className={styles.progressValue}>
            {project.acceptedCount} / {maxSlots} ({percent}%)
          </span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${percent}%` }} />
        </div>
      </div>
    </Link>
  );
}
