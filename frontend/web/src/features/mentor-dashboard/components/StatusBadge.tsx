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

// Prototype displays a slightly shorter label than the canonical
// «Активный» — see mentor.html status-badge texts. Render «Активен» for
// the dashboard while keeping the API/model status pristine.
const STATUS_LABEL: Partial<Record<ProjectStatus, string>> = {
  Активный: 'Активен',
};

export function StatusBadge({ status }: Props): JSX.Element {
  const label = STATUS_LABEL[status] ?? status;
  return <span className={`${styles.badge} ${STATUS_CLASS[status]}`}>{label}</span>;
}
