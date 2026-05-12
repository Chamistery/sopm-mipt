/*
 * DistPool — правая боковая панель «Нераспределённые». Pixel-port из admin.html
 * (gdist-sidebar + gdist-unassigned).
 *
 * Чипы пула без status-badge (потому что студент пока ни в одной команде).
 * При drag'е сюда чипа из команды — onDropToPool вызывается, что приводит
 * к unrecommendApplicant.
 */

import { useState, type DragEvent, type JSX } from 'react';

import type { CoordinatorPoolStudent } from '@/api/coordinatorDistribution';
import {
  hasDragPayload,
  readDragPayload,
  writeDragPayload,
  type DistDragPayload,
} from './dragData';
import { colorFor, initialsFor } from './initials';
import type { DrawerSelection } from './CoordDistributionPage';
import styles from './DistPool.module.css';

interface Props {
  pool: CoordinatorPoolStudent[];
  onDropToPool: (payload: DistDragPayload) => void;
  onOpenDrawer: (selection: DrawerSelection) => void;
}

export function DistPool({ pool, onDropToPool, onOpenDrawer }: Props): JSX.Element {
  const [over, setOver] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>): void => {
    if (!hasDragPayload(e.nativeEvent)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    setOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>): void => {
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as Node).contains(related)) return;
    setOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setOver(false);
    const payload = readDragPayload(e.nativeEvent);
    if (payload) onDropToPool(payload);
  };

  return (
    <div
      className={`${styles.box} ${over ? styles.dragOver : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={styles.title}>Нераспределённые ({pool.length})</div>
      <div className={styles.list}>
        {pool.length === 0 ? (
          <div className={styles.empty}>Пул пуст — все студенты в командах.</div>
        ) : (
          pool.map((s) => (
            <PoolChip key={s.studentId} student={s} onOpenDrawer={onOpenDrawer} />
          ))
        )}
      </div>
    </div>
  );
}

interface PoolChipProps {
  student: CoordinatorPoolStudent;
  onOpenDrawer: (selection: DrawerSelection) => void;
}

function PoolChip({ student, onOpenDrawer }: PoolChipProps): JSX.Element {
  const initials = initialsFor(student.firstName, student.lastName);
  const color = colorFor(student.studentId);
  const applicationsByProject: Record<number, number> = {};
  student.priorities.forEach((p) => {
    applicationsByProject[p.projectId] = p.applicationId;
  });

  const handleDragStart = (e: DragEvent<HTMLDivElement>): void => {
    writeDragPayload(e.nativeEvent, {
      kind: 'pool-student',
      studentId: student.studentId,
      applicationsByProject,
    });
    e.currentTarget.classList.add(styles.dragging);
  };

  const handleDragEnd = (e: DragEvent<HTMLDivElement>): void => {
    e.currentTarget.classList.remove(styles.dragging);
  };

  const handleClick = (): void => {
    onOpenDrawer({ kind: 'pool', studentId: student.studentId });
  };

  return (
    <div
      className={styles.chip}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className={styles.avatar} style={{ background: color }}>
        {initials}
      </div>
      <div className={styles.chipBody}>
        <div className={styles.chipName}>
          {student.lastName} {student.firstName.charAt(0)}.
        </div>
        <div className={styles.chipSub}>
          {student.course} курс · {student.gpa.toFixed(1)} · {student.group || '—'}
        </div>
      </div>
      <svg
        className={styles.expandIco}
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M5 3l4 4-4 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
