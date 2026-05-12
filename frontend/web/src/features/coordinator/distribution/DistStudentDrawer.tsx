/*
 * DistStudentDrawer — выезжающая справа панель с полным профилем студента.
 * Pixel-port из admin.html (lines 435-559 + JS 2978-3071).
 *
 * Структура (точно как в прототипе):
 *   header:
 *     stud-drawer-link (button-like с hover-стрелкой):
 *       avatar 40×40 + ФИО + subtitle («project · team» либо «Не распределён»)
 *     close-кнопка 32×32
 *   body:
 *     [только если в команде] Секция «Статус заявки» — 3 радио-кнопки
 *     Секция «Академические данные» — 3 строки (Курс / Группа / Средний балл)
 *     Секция «Приоритеты студента (N из 5)» — нумерованный список
 *       с подсветкой текущего проекта + «ТЕКУЩАЯ» pill
 *
 * Закрытие — Esc / backdrop click / close-кнопка.
 */

import { useEffect, type JSX } from 'react';

import type { CoordinatorPoolPriority } from '@/api/coordinatorDistribution';
import { colorFor, initialsFor } from './initials';
import { GDIST_STATUSES, gdistStatusOf, type GdistStatusKey } from './statusInfo';
import styles from './DistStudentDrawer.module.css';

export interface DrawerStudent {
  studentId: number;
  firstName: string;
  lastName: string;
  course: number;
  group: string;
  gpa: number;
  priorities: CoordinatorPoolPriority[];
  /** projectId команды, в которой студент сейчас. */
  currentTeamProjectId?: number | null;
  /** Название проекта текущей команды. */
  currentProjectTitle?: string | null;
  /** Название текущей команды. */
  currentTeamName?: string | null;
  /** applicationId текущей заявки (для смены статуса). */
  currentApplicationId?: number | null;
  /** teamId текущей команды (для recommend-мутации). */
  currentTeamId?: number | null;
}

interface Props {
  student: DrawerStudent | null;
  /** Меняет статус application'а текущей команды через тот же mutation, что
   *  и popover-меню статусов. */
  onSetStatus?: (applicationId: number, teamId: number, key: GdistStatusKey) => void;
  onClose: () => void;
}

export function DistStudentDrawer({ student, onSetStatus, onClose }: Props): JSX.Element {
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
        {student ? (
          <DrawerContent student={student} onClose={onClose} onSetStatus={onSetStatus} />
        ) : null}
      </aside>
    </>
  );
}

interface ContentProps {
  student: DrawerStudent;
  onClose: () => void;
  onSetStatus?: (applicationId: number, teamId: number, key: GdistStatusKey) => void;
}

function DrawerContent({ student, onClose, onSetStatus }: ContentProps): JSX.Element {
  const initials = initialsFor(student.firstName, student.lastName);
  const color = colorFor(student.studentId);
  const fullName = `${student.lastName} ${student.firstName}`.trim();
  const inTeam =
    student.currentTeamId != null && student.currentApplicationId != null;
  const subtitle = inTeam
    ? `${student.currentProjectTitle || 'Проект'} · ${student.currentTeamName || ''}`
    : 'Не распределён в команду';
  const priorities = student.priorities;
  const currentApp = priorities.find(
    (p) => p.projectId === student.currentTeamProjectId,
  );
  const currentStatus = currentApp ? gdistStatusOf(currentApp.status).key : null;

  return (
    <>
      <header className={styles.head}>
        <button type="button" className={styles.headLink} title="Открыть полный профиль студента">
          <div className={styles.avatar} style={{ background: color }}>
            {initials}
          </div>
          <div className={styles.headLinkText}>
            <div className={styles.headTitle}>{fullName}</div>
            <div className={styles.headSubtitle}>{subtitle}</div>
          </div>
          <svg
            className={styles.headLinkIco}
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 3l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          title="Закрыть"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M4 4l10 10M14 4L4 14"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      <div className={styles.body}>
        {inTeam ? (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Статус заявки</h3>
            <div className={styles.statusOptions}>
              {GDIST_STATUSES.map((s) => {
                const selected = currentStatus === s.key;
                return (
                  <label
                    key={s.key}
                    className={`${styles.statusLabel} ${selected ? styles.statusLabelSelected : ''}`}
                  >
                    <input
                      type="radio"
                      name="stud-drawer-status"
                      value={s.key}
                      checked={selected}
                      onChange={() => {
                        if (
                          onSetStatus &&
                          student.currentApplicationId != null &&
                          student.currentTeamId != null
                        ) {
                          onSetStatus(
                            student.currentApplicationId,
                            student.currentTeamId,
                            s.key,
                          );
                        }
                      }}
                    />
                    <span className={`${styles.dotColor} ${styles[`dot_${s.className}`]}`} />
                    <span className={styles.statusTxt}>{s.label}</span>
                  </label>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Академические данные</h3>
          <InfoRow label="Курс" value={String(student.course)} />
          <InfoRow label="Группа" value={student.group || '—'} />
          <InfoRow label="Средний балл" value={student.gpa.toFixed(1)} />
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            Приоритеты студента ({priorities.length} из 5)
          </h3>
          {priorities.length === 0 ? (
            <div className={styles.priorityEmpty}>
              Студент не подавал заявок (добавлен координатором вручную).
            </div>
          ) : (
            <div className={styles.priorityList}>
              {priorities.map((p, idx) => {
                const isCurrent = p.projectId === student.currentTeamProjectId;
                const hint =
                  idx === 0
                    ? 'Самый желанный'
                    : idx === priorities.length - 1 && priorities.length === 5
                      ? 'Наименее желанный'
                      : '';
                const metaParts: string[] = [];
                if (p.company) metaParts.push(p.company);
                if (p.mentorName) metaParts.push(`Ментор: ${p.mentorName}`);
                if (hint) metaParts.push(hint);
                return (
                  <div
                    key={p.applicationId}
                    className={`${styles.priorityItem} ${isCurrent ? styles.priorityCurrent : ''}`}
                  >
                    <span className={styles.priorityNum}>{p.priority}</span>
                    <div className={styles.priorityText}>
                      <div className={styles.priorityName}>{p.projectTitle}</div>
                      {metaParts.length > 0 ? (
                        <div className={styles.priorityMeta}>{metaParts.join(' · ')}</div>
                      ) : null}
                    </div>
                    {isCurrent ? <span className={styles.priorityNow}>Текущая</span> : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}
