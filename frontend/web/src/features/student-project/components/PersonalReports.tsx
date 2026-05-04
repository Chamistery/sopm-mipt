import { useMemo } from 'react';

import type { TaskDto, TeamMemberDto } from '@/api/teams';
import { calcEffectiveStatus, statusVisual, wasOverdue } from '../lib/taskStatus';
import { avatarColor, fullNameWithMiddle, initials, shortName } from '../lib/people';
import { formatRuRange } from '../lib/dates';
import styles from './PersonalReports.module.css';

interface Props {
  members: TeamMemberDto[];
  tasks: TaskDto[];
  currentUserId: number;
  sprintNumber: number;
  sprintStartDate: string;
  sprintEndDate: string;
  todayIso: string;
  onTaskClick: (task: TaskDto) => void;
}

/*
 * Личные отчёты: на каждый участник — карточка со списком задач спринта.
 * Свой отчёт первый (с акцентным border), остальные ниже.
 */
export function PersonalReports({
  members,
  tasks,
  currentUserId,
  sprintNumber,
  sprintStartDate,
  sprintEndDate,
  todayIso,
  onTaskClick,
}: Props): JSX.Element {
  const tasksByMember = useMemo(() => {
    const map = new Map<number, TaskDto[]>();
    for (const t of tasks) {
      const list = map.get(t.assigneeId) ?? [];
      list.push(t);
      map.set(t.assigneeId, list);
    }
    return map;
  }, [tasks]);

  // Текущий пользователь — первым; затем остальные участники.
  const ordered = useMemo(() => {
    const me = members.find((m) => m.userId === currentUserId);
    const rest = members.filter((m) => m.userId !== currentUserId);
    return me ? [me, ...rest] : rest;
  }, [members, currentUserId]);

  return (
    <section className={styles.wrapper} aria-label={`Личные отчёты — Спринт ${sprintNumber}`}>
      <div className={styles.head}>
        <h3 className={styles.title}>Личные отчёты — Спринт {sprintNumber}</h3>
        <span className={styles.dateRange}>
          {formatRuRange(sprintStartDate, sprintEndDate)}
        </span>
      </div>

      {ordered.length === 0 ? (
        <div className={styles.empty}>В команде нет участников.</div>
      ) : (
        ordered.map((member) => (
          <MemberCard
            key={member.userId}
            member={member}
            isOwn={member.userId === currentUserId}
            tasks={tasksByMember.get(member.userId) ?? []}
            todayIso={todayIso}
            onTaskClick={onTaskClick}
          />
        ))
      )}
    </section>
  );
}

interface MemberCardProps {
  member: TeamMemberDto;
  isOwn: boolean;
  tasks: TaskDto[];
  todayIso: string;
  onTaskClick: (task: TaskDto) => void;
}

function MemberCard({ member, isOwn, tasks, todayIso, onTaskClick }: MemberCardProps): JSX.Element {
  const totalHours = tasks.reduce((s, t) => s + t.hours, 0);
  return (
    <div className={`${styles.memberCard} ${isOwn ? styles.memberCardOwn : ''}`}>
      <div className={styles.memberHead}>
        <div
          className={styles.memberAvatar}
          style={{ background: avatarColor(member.userId) }}
          title={fullNameWithMiddle(member)}
          aria-hidden="true"
        >
          {initials(member)}
        </div>
        <div>
          <div className={styles.memberName}>{shortName(member)}</div>
          {member.projectRole ? (
            <div className={styles.memberRole}>{member.projectRole}</div>
          ) : null}
        </div>
        {member.isLeader ? <span className={styles.badgeLeader}>Лидер</span> : null}
        {isOwn ? <span className={styles.badgeYou}>Вы</span> : null}
        {totalHours > 0 ? <span className={styles.hours}>{totalHours}ч</span> : null}
      </div>

      {tasks.length === 0 ? (
        <div className={styles.noTasks}>Нет задач в этом спринте</div>
      ) : (
        <>
          <div className={styles.tasksHint}>
            Задачи в спринте{isOwn ? ' (кликните для редактирования)' : ''}:
          </div>
          <div className={styles.taskList}>
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} todayIso={todayIso} onClick={() => onTaskClick(t)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface TaskRowProps {
  task: TaskDto;
  todayIso: string;
  onClick: () => void;
}

function TaskRow({ task, todayIso, onClick }: TaskRowProps): JSX.Element {
  const status = calcEffectiveStatus(task, todayIso);
  const visual = statusVisual(status);
  const overdue = wasOverdue(task, todayIso);
  return (
    <div
      className={styles.taskRow}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <span
        className={styles.statusChip}
        style={{
          background: visual.chipBg,
          color: visual.text,
          outline: overdue ? '1px solid var(--color-danger)' : 'none',
        }}
      >
        {status}
      </span>
      <span className={styles.taskName}>{task.name}</span>
      {task.mr ? <span className={styles.mr}>MR ↗</span> : null}
      <span className={styles.taskHours}>{task.hours}ч</span>
    </div>
  );
}
