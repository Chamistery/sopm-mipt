import { useState, type DragEvent } from 'react';

import type { CatalogProject } from '../types';
import { ProjectCard } from './ProjectCard';
import styles from './PrioritySlot.module.css';

interface Props {
  index: number;
  project: CatalogProject | null;
  /** Read-only after submission — disables drag/remove. */
  readOnly: boolean;
  /** Was just filled — triggers slotPop animation. */
  justFilled?: boolean;
  onRemove: (id: number) => void;
  onShowDetails: (id: number) => void;
  /** Notify parent that a drag from this slot index has started. */
  onDragStartSlot: (from: number) => void;
  /** Notify parent that a drop happened on this slot index. */
  onDropOnSlot: (to: number) => void;
  /** Notify parent that the current drag operation ended (cleanup). */
  onDragEndSlot: () => void;
}

function DragIcon(): JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx="7" cy="5" r="1.2" fill="currentColor" />
      <circle cx="13" cy="5" r="1.2" fill="currentColor" />
      <circle cx="7" cy="10" r="1.2" fill="currentColor" />
      <circle cx="13" cy="10" r="1.2" fill="currentColor" />
      <circle cx="7" cy="15" r="1.2" fill="currentColor" />
      <circle cx="13" cy="15" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function PrioritySlot({
  index,
  project,
  readOnly,
  justFilled = false,
  onRemove,
  onShowDetails,
  onDragStartSlot,
  onDropOnSlot,
  onDragEndSlot,
}: Props): JSX.Element {
  const [dragOver, setDragOver] = useState(false);
  const [dragging, setDragging] = useState(false);
  const filled = project !== null;

  const handleDragOver = (e: DragEvent<HTMLDivElement>): void => {
    if (readOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragOver) setDragOver(true);
  };

  const handleDragLeave = (): void => {
    if (dragOver) setDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    if (readOnly) return;
    e.preventDefault();
    setDragOver(false);
    onDropOnSlot(index);
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>): void => {
    e.dataTransfer.effectAllowed = 'move';
    /*
     * Firefox требует setData, иначе drag не стартует.
     * Контент не используем — источник трекаем через ref в родителе.
     */
    e.dataTransfer.setData('text/plain', String(index));
    setDragging(true);
    onDragStartSlot(index);
  };

  const handleDragEnd = (): void => {
    setDragging(false);
    onDragEndSlot();
  };

  return (
    <div
      className={[
        styles.slot,
        filled ? styles.filled : '',
        readOnly ? styles.readOnly : '',
        dragOver ? styles.dragOver : '',
        justFilled ? styles.justFilled : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid={`priority-slot-${index}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <span className={styles.label}>
        {`Приоритет ${index}${index === 1 ? ' — самый желаемый' : ''}`}
      </span>
      {project ? (
        <ProjectCard
          project={project}
          selected
          selectionFull={false}
          readOnly={readOnly}
          variant="slot"
          draggable={!readOnly}
          dragging={dragging}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onSelect={() => {}}
          onRemove={onRemove}
          onShowDetails={onShowDetails}
        />
      ) : (
        <div className={styles.empty}>
          <DragIcon />
          <span>Перетащите сюда проект</span>
        </div>
      )}
    </div>
  );
}
