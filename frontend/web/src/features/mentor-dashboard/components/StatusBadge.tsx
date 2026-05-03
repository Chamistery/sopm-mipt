import type { ProjectStatus } from '@/api/projects';
import styles from './StatusBadge.module.css';

interface Props {
  status: ProjectStatus;
}

const STATUS_CLASS: Record<ProjectStatus, string> = {
  Черновик: styles.draft,
  Опубликован: styles.published,
  Активный: styles.active,
  Завершён: styles.finished,
  Архивный: styles.archive,
  // Coord-only extension statuses (see ADR-pending in projects.ts).
  'На утверждении': styles.draft,
  Утверждён: styles.published,
};

export function StatusBadge({ status }: Props): JSX.Element {
  return <span className={`${styles.badge} ${STATUS_CLASS[status]}`}>{status}</span>;
}
