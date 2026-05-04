import type { ProjectListItem, ProjectStatus } from '@/api/projects';
import styles from './ProjectRow.module.css';

export interface ProjectRowProps {
  project: ProjectListItem;
  mentorName?: string;
  teamsCount?: number;
  onOpen: (id: number) => void;
}

const STATUS_TONE: Record<string, string> = {
  Активный: styles.statusActive,
  Опубликован: styles.statusActive,
  Утверждён: styles.statusActive,
  Черновик: styles.statusDraft,
  Завершен: styles.statusDone,
  Архивный: styles.statusMuted,
  'На утверждении': styles.statusPending,
};

function statusClass(status: ProjectStatus): string {
  return STATUS_TONE[status] ?? styles.statusMuted;
}

export function ProjectRow({
  project,
  mentorName,
  teamsCount,
  onOpen,
}: ProjectRowProps): JSX.Element {
  const filled = project.filledSlots ?? 0;
  const max = project.maxSlots ?? 0;
  const fillPct = max > 0 ? Math.min(100, Math.round((filled / max) * 100)) : 0;

  return (
    <tr
      className={styles.row}
      tabIndex={0}
      role="button"
      onClick={() => onOpen(project.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(project.id);
        }
      }}
    >
      <td className={styles.titleCell}>
        <div className={styles.title}>{project.title}</div>
        {project.course ? <div className={styles.subtitle}>{project.course}</div> : null}
      </td>
      <td>{mentorName ?? `ID ${project.mentorId}`}</td>
      <td>{project.company ?? '—'}</td>
      <td>
        <span className={`${styles.status} ${statusClass(project.status)}`}>{project.status}</span>
      </td>
      <td className={styles.fillCell}>
        <div className={styles.fillBar} aria-label={`Заполнено ${filled} из ${max}`}>
          <div className={styles.fillBarTrack}>
            <div className={styles.fillBarFill} style={{ width: `${fillPct}%` }} />
          </div>
          <span className={styles.fillText}>
            {filled}/{max}
          </span>
        </div>
      </td>
      <td className={styles.teamsCell}>{teamsCount ?? 0}</td>
    </tr>
  );
}
