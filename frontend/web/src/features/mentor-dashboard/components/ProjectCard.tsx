import { Link } from 'react-router-dom';

import { projectFillRatio, projectMaxSlots, type ProjectListItem } from '@/api/projects';
import { StatusBadge } from './StatusBadge';
import styles from './ProjectCard.module.css';

interface Props {
  project: ProjectListItem;
}

export function ProjectCard({ project }: Props): JSX.Element {
  const ratio = projectFillRatio(project);
  const percent = Math.round(ratio * 100);
  const maxSlots = projectMaxSlots(project);

  return (
    <Link to={`/mentor/projects/${project.id}`} className={styles.card}>
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
