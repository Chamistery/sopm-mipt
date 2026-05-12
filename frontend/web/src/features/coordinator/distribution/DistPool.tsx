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
import styles from './DistPool.module.css';

interface Props {
  pool: CoordinatorPoolStudent[];
  onDropToPool: (payload: DistDragPayload) => void;
}

export function DistPool({ pool, onDropToPool }: Props): JSX.Element {
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
          pool.map((s) => <PoolChip key={s.studentId} student={s} />)
        )}
      </div>
    </div>
  );
}

interface PoolChipProps {
  student: CoordinatorPoolStudent;
}

function PoolChip({ student }: PoolChipProps): JSX.Element {
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

  return (
    <div
      className={styles.chip}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      title={`Приоритеты: ${student.priorities.map((p) => `${p.priority}. ${p.projectTitle}`).join(', ')}`}
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
    </div>
  );
}
