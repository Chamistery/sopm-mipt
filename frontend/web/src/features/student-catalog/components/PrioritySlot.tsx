import type { CatalogProject } from '../types';
import styles from './PrioritySlot.module.css';

interface Props {
  index: number;
  project: CatalogProject | null;
  /** Read-only after submission — disables move/remove buttons. */
  readOnly: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onRemove: (id: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

export function PrioritySlot({
  index,
  project,
  readOnly,
  canMoveUp,
  canMoveDown,
  onRemove,
  onMoveUp,
  onMoveDown,
}: Props): JSX.Element {
  const filled = project !== null;

  return (
    <div
      className={[styles.slot, filled ? styles.filled : '', readOnly ? styles.readOnly : '']
        .filter(Boolean)
        .join(' ')}
      data-testid={`priority-slot-${index}`}
    >
      <span className={styles.label}>
        {`Приоритет ${index}${index === 1 ? ' — самый желаемый' : ''}`}
      </span>
      {project ? (
        <div className={styles.cardInside}>
          <div className={styles.cardHeader}>
            <div className={styles.company}>{project.company ?? '—'}</div>
            {!readOnly ? (
              <button
                type="button"
                className={styles.removeX}
                aria-label="Убрать"
                onClick={() => onRemove(project.id)}
              >
                ✕
              </button>
            ) : null}
          </div>
          <div className={styles.title}>{project.title}</div>
          <div className={styles.mentor}>{project.mentorName}</div>
          {!readOnly ? (
            <div className={styles.moveRow}>
              <button
                type="button"
                className={styles.moveBtn}
                disabled={!canMoveUp}
                onClick={() => onMoveUp(index)}
                aria-label="Поднять приоритет"
              >
                ↑
              </button>
              <button
                type="button"
                className={styles.moveBtn}
                disabled={!canMoveDown}
                onClick={() => onMoveDown(index)}
                aria-label="Опустить приоритет"
              >
                ↓
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className={styles.empty}>Здесь будет проект</div>
      )}
    </div>
  );
}
