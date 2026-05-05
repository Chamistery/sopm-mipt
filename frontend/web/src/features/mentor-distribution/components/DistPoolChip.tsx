import { useState, type DragEvent } from 'react';

import type { ApplicantItem } from '@/api/applications';
import { setApplicantDragData } from '../lib/dragData';
import { avatarColorFor, initialsFor } from '../lib/chipDisplay';
import styles from './DistPoolChip.module.css';

export interface DistPoolChipProps {
  item: ApplicantItem;
  projectId: number;
  priority: number;
  qualified: boolean;
  group?: string;
  /** Disable drag while a mutation is pending. */
  disabled?: boolean;
}

/**
 * Чип студента в пуле заявок: 200px, drag-source.
 * При starting drag — кладёт payload в DataTransfer (см. dragData.ts).
 */
export function DistPoolChip({
  item,
  projectId,
  priority,
  qualified,
  group,
  disabled,
}: DistPoolChipProps): JSX.Element {
  const [dragging, setDragging] = useState(false);

  const [firstName = '', lastName = ''] = item.name.split(' ');
  const fullName = lastName ? `${lastName} ${firstName}` : item.name;

  const onDragStart = (e: DragEvent<HTMLDivElement>): void => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    setApplicantDragData(e.dataTransfer, {
      applicationId: item.applicationId,
      projectId,
      priority,
      sourceTeamId: null,
      qualified,
    });
    setDragging(true);
  };

  const onDragEnd = (): void => setDragging(false);

  return (
    <div
      className={`${styles.chip} ${qualified ? '' : styles.chipUnqual} ${dragging ? styles.dragging : ''}`}
      draggable={!disabled}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-application-id={item.applicationId}
      data-priority={priority}
      data-qualified={qualified}
      role="button"
      tabIndex={0}
      aria-label={`${fullName}, GPA ${item.gpa.toFixed(1)}`}
    >
      <div
        className={styles.avatar}
        style={qualified ? { background: avatarColorFor(item.studentId) } : undefined}
      >
        {initialsFor(firstName, lastName)}
      </div>
      <div className={styles.body}>
        <div className={styles.top}>
          <span className={styles.name}>{fullName}</span>
          <span className={styles.gpa}>{item.gpa.toFixed(1)}</span>
        </div>
        <div className={styles.sub}>
          <span>{item.course} курс</span>
          {group ? (
            <>
              <span className={styles.dot}>·</span>
              <span>{group}</span>
            </>
          ) : null}
          {!qualified ? (
            <>
              <span className={styles.dot}>·</span>
              <span className={styles.unqualMark} title="Не соответствует требованиям">
                ⚠ Не подходит
              </span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
