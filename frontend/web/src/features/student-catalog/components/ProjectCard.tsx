import type { CatalogProject } from '../types';
import styles from './ProjectCard.module.css';

interface Props {
  project: CatalogProject;
  /** True when the project sits in one of the student's priority slots. */
  selected: boolean;
  /** When true, the «Хочу в проект» button is hidden (5 already chosen). */
  selectionFull: boolean;
  /** Application has been submitted — UI is read-only. */
  readOnly: boolean;
  onSelect: (id: number) => void;
  onRemove: (id: number) => void;
  onShowDetails: (id: number) => void;
}

export function ProjectCard({
  project,
  selected,
  selectionFull,
  readOnly,
  onSelect,
  onRemove,
  onShowDetails,
}: Props): JSX.Element {
  const { unqualified } = project;

  return (
    <div
      className={[
        styles.card,
        selected ? styles.selected : '',
        unqualified ? styles.unqualified : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid={`project-card-${project.id}`}
    >
      {unqualified ? (
        <div className={styles.unqualifiedBadge} title={project.unqualifiedReason}>
          Не соответствует требованиям
        </div>
      ) : null}
      {selected ? <div className={styles.selectedBadge}>✓ Выбран</div> : null}

      <div className={styles.company}>{project.company ?? '—'}</div>
      <div className={styles.title}>{project.title}</div>
      <div className={styles.mentor}>
        <PersonIcon />
        <span>{project.mentorName}</span>
      </div>

      <div className={styles.expanded}>
        <div className={styles.stats}>
          <span className={styles.stat}>
            <b>{project.maxSlots}</b> мест
          </span>
          {project.filledSlots != null ? (
            <span className={styles.stat}>
              <b>{project.filledSlots}</b> занято
            </span>
          ) : null}
          {project.course ? (
            <span className={styles.stat}>
              <b>{project.course}</b> курс
            </span>
          ) : null}
        </div>

        <div className={styles.actions}>
          {readOnly ? (
            selected ? (
              <div className={styles.readOnlyMark}>✓ В заявке</div>
            ) : null
          ) : selected ? (
            <button
              type="button"
              className={styles.removeBtn}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(project.id);
              }}
            >
              Убрать из выбранных
            </button>
          ) : selectionFull ? (
            <div className={styles.fullHint}>Выбрано 5 проектов</div>
          ) : (
            <button
              type="button"
              className={styles.wantBtn}
              disabled={unqualified}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(project.id);
              }}
            >
              Хочу в проект
            </button>
          )}
          <button
            type="button"
            className={styles.detailsBtn}
            onClick={(e) => {
              e.stopPropagation();
              onShowDetails(project.id);
            }}
          >
            Подробнее
          </button>
        </div>
      </div>
    </div>
  );
}

function PersonIcon(): JSX.Element {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 15c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
