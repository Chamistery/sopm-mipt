/*
 * DistStudentDrawer — выезжающая справа панель с полным профилем студента.
 * Pixel-port из admin.html stud-drawer (lines 2270-2287 + JS 3500-3700).
 *
 * Открывается по клику на чип-тело (не статус-бейдж). Содержит:
 *   - аватар + имя + сабтайтл (курс · GPA · группа)
 *   - 5 приоритетов (если все 5 заданы; для team-member может быть один)
 *     с подсветкой текущего проекта (если студент в команде этого проекта)
 *   - закрытие по Esc / backdrop click / кнопке ✕
 */

import { useEffect, type JSX } from 'react';

import type { CoordinatorPoolPriority } from '@/api/coordinatorDistribution';
import { colorFor, initialsFor } from './initials';
import styles from './DistStudentDrawer.module.css';

export interface DrawerStudent {
  studentId: number;
  firstName: string;
  lastName: string;
  course: number;
  group: string;
  gpa: number;
  priorities: CoordinatorPoolPriority[];
  /** projectId команды, в которой студент сейчас (если есть). */
  currentTeamProjectId?: number | null;
  /** Имя текущей команды (для отображения внизу профиля). */
  currentTeamName?: string | null;
}

interface Props {
  student: DrawerStudent | null;
  onClose: () => void;
}

export function DistStudentDrawer({ student, onClose }: Props): JSX.Element {
  useEffect(() => {
    if (!student) return;
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [student, onClose]);

  const open = student != null;

  return (
    <>
      <div
        className={`${styles.backdrop} ${open ? styles.backdropOpen : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`} role="dialog">
        {student ? <DrawerContent student={student} onClose={onClose} /> : null}
      </aside>
    </>
  );
}

function DrawerContent({ student, onClose }: { student: DrawerStudent; onClose: () => void }): JSX.Element {
  const initials = initialsFor(student.firstName, student.lastName);
  const color = colorFor(student.studentId);
  const fullName = `${student.lastName} ${student.firstName}`.trim();

  return (
    <>
      <header className={styles.head}>
        <div className={styles.identity}>
          <div className={styles.avatar} style={{ background: color }}>
            {initials}
          </div>
          <div className={styles.identityText}>
            <div className={styles.name}>{fullName}</div>
            <div className={styles.subtitle}>
              {student.course} курс · {student.gpa.toFixed(1)} · {student.group || '—'}
            </div>
          </div>
        </div>
        <button type="button" className={styles.close} onClick={onClose} title="Закрыть">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div className={styles.body}>
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Приоритеты</h3>
          {student.priorities.length === 0 ? (
            <div className={styles.empty}>Студент не подавал заявок (попал через ручное распределение).</div>
          ) : (
            <ol className={styles.priorities}>
              {[1, 2, 3, 4, 5].map((n) => {
                const p = student.priorities.find((x) => x.priority === n);
                const active = p && p.projectId === student.currentTeamProjectId;
                return (
                  <li
                    key={n}
                    className={`${styles.priorityItem} ${active ? styles.priorityActive : ''}`}
                  >
                    <span className={styles.priorityNum}>{n}.</span>
                    <span className={styles.priorityProject}>
                      {p ? p.projectTitle : <span className={styles.priorityNone}>не указан</span>}
                    </span>
                    {p ? (
                      <span className={`${styles.priorityStatus} ${styles[`status_${classifyStatus(p.status)}`]}`}>
                        {p.status}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {student.currentTeamName ? (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Текущая команда</h3>
            <div className={styles.currentTeam}>{student.currentTeamName}</div>
          </section>
        ) : null}
      </div>
    </>
  );
}

function classifyStatus(status: string): 'accepted' | 'invited' | 'recommend' {
  switch (status) {
    case 'Принят':
      return 'accepted';
    case 'Принято ментором':
      return 'invited';
    default:
      return 'recommend';
  }
}
