import { useMemo } from 'react';

import type { GanttResponseDto, TaskDto, TeamMemberDto } from '@/api/teams';
import {
  calcTodayPct,
  formatRuRange,
  formatTimelineDayLabel,
  isWeekend,
  sprintDayList,
} from '../lib/dates';
import { calcEffectiveStatus, statusVisual, wasOverdue } from '../lib/taskStatus';
import { avatarColor, shortName } from '../lib/people';
import { TaskBar } from './TaskBar';
import styles from './GanttChart.module.css';

interface Props {
  data: GanttResponseDto;
  todayIso: string;
  currentUserId: number;
  /** Тимлид может всё, студент — только свои задачи. */
  canEditAll: boolean;
  /** «+ Добавить задачу» (показывается студенту и тимлиду на текущем спринте). */
  canAddTask: boolean;
  onTaskClick: (task: TaskDto) => void;
  onAddTask: () => void;
  sprintNumber: number;
  sprintsTotal: number;
}

export function GanttChart({
  data,
  todayIso,
  currentUserId,
  canEditAll,
  canAddTask,
  onTaskClick,
  onAddTask,
  sprintNumber,
  sprintsTotal,
}: Props): JSX.Element {
  const { sprint, members, tasks } = data;

  const days = useMemo(
    () => sprintDayList(sprint.startDate, sprint.endDate),
    [sprint.startDate, sprint.endDate],
  );

  const todayPct = useMemo(
    () => calcTodayPct(todayIso, sprint.startDate, sprint.endDate),
    [todayIso, sprint.startDate, sprint.endDate],
  );

  // Группируем задачи по исполнителю; «свой» — наверху.
  const grouped = useMemo(() => groupByPerson(tasks, members, currentUserId), [
    tasks,
    members,
    currentUserId,
  ]);

  const minBarsWidth = days.length * 28;

  return (
    <section className={styles.wrapper} aria-label="Диаграмма Ганта">
      <div className={styles.headerBar}>
        <div>
          Спринт {sprintNumber} из {sprintsTotal}
          <span className={styles.headerMeta}>
            {' '}
            · {formatRuRange(sprint.startDate, sprint.endDate)} · {days.length} дн.
          </span>
        </div>
        {canAddTask ? (
          <button type="button" className={styles.addButton} onClick={onAddTask}>
            + Добавить задачу
          </button>
        ) : null}
      </div>

      {tasks.length === 0 ? (
        <div className={styles.empty}>В этом спринте задач пока нет.</div>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table} style={{ minWidth: `${344 + minBarsWidth}px` }}>
            <thead>
              <tr>
                <th className={styles.colTask}>Задача</th>
                <th className={styles.colStatus} aria-label="Статус" />
                <th className={styles.colHours}>Ч.</th>
                <th>
                  <div className={styles.timelineHeader}>
                    {days.map((iso, idx) => {
                      const prev = idx === 0 ? null : days[idx - 1] ?? null;
                      const isToday = iso === todayIso;
                      const cls = [
                        styles.timelineDay,
                        isWeekend(iso) ? styles.weekend : '',
                        isToday ? styles.today : '',
                      ]
                        .filter(Boolean)
                        .join(' ');
                      return (
                        <div key={iso} className={cls}>
                          {formatTimelineDayLabel(iso, prev)}
                        </div>
                      );
                    })}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((g) => (
                <PersonRows
                  key={g.member.userId}
                  group={g}
                  currentUserId={currentUserId}
                  canEditAll={canEditAll}
                  todayIso={todayIso}
                  sprintStartIso={sprint.startDate}
                  sprintEndIso={sprint.endDate}
                  onTaskClick={onTaskClick}
                />
              ))}
            </tbody>
          </table>

          {todayPct != null ? (
            <div
              className={styles.todayLine}
              style={{ left: `calc(${344}px + (100% - ${344}px) * ${todayPct} / 100)` }}
            />
          ) : null}
        </div>
      )}

      <div className={styles.legend} aria-label="Легенда">
        {(
          [
            ['Ожидает аппрува'],
            ['Назначена'],
            ['В работе'],
            ['На ревью'],
            ['Возвращена'],
            ['Готово'],
          ] as const
        ).map(([s]) => {
          const v = statusVisual(s);
          return (
            <span key={s} className={styles.legendItem}>
              <span
                className={styles.legendDot}
                style={{ background: v.bg, border: v.border ? `1px solid ${v.border}` : 'none' }}
              />
              {s}
            </span>
          );
        })}
      </div>
    </section>
  );
}

interface PersonGroup {
  member: TeamMemberDto;
  tasks: TaskDto[];
}

function groupByPerson(
  tasks: TaskDto[],
  members: TeamMemberDto[],
  currentUserId: number,
): PersonGroup[] {
  const map = new Map<number, PersonGroup>();
  for (const m of members) {
    map.set(m.userId, { member: m, tasks: [] });
  }
  for (const t of tasks) {
    let group = map.get(t.assigneeId);
    if (!group) {
      const placeholder: TeamMemberDto = {
        userId: t.assigneeId,
        firstName: '',
        lastName: `Участник #${t.assigneeId}`,
        role: 'student',
        isLeader: false,
      };
      group = { member: placeholder, tasks: [] };
      map.set(t.assigneeId, group);
    }
    group.tasks.push(t);
  }
  // Текущий пользователь — первый, далее остальные с задачами.
  const ordered: PersonGroup[] = [];
  const me = map.get(currentUserId);
  if (me && me.tasks.length > 0) ordered.push(me);
  for (const [uid, g] of map) {
    if (uid === currentUserId) continue;
    if (g.tasks.length === 0) continue;
    ordered.push(g);
  }
  return ordered;
}

interface PersonRowsProps {
  group: PersonGroup;
  currentUserId: number;
  canEditAll: boolean;
  todayIso: string;
  sprintStartIso: string;
  sprintEndIso: string;
  onTaskClick: (task: TaskDto) => void;
}

function PersonRows({
  group,
  currentUserId,
  canEditAll,
  todayIso,
  sprintStartIso,
  sprintEndIso,
  onTaskClick,
}: PersonRowsProps): JSX.Element {
  const isYou = group.member.userId === currentUserId;
  return (
    <>
      <tr className={styles.personRow}>
        <td className={styles.colTask}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: avatarColor(group.member.userId),
                display: 'inline-block',
              }}
            />
            {shortName(group.member)}
            {isYou ? (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--color-success)',
                  background: 'var(--color-success-bg)',
                  padding: '0 5px',
                  borderRadius: 3,
                  marginLeft: 4,
                }}
              >
                Вы
              </span>
            ) : null}
          </span>
        </td>
        <td className={styles.colStatus} />
        <td className={styles.colHours} />
        <td />
      </tr>
      {group.tasks.map((task) => {
        const status = calcEffectiveStatus(task, todayIso);
        const visual = statusVisual(status);
        const overdue = wasOverdue(task, todayIso);
        const isOwn = task.assigneeId === currentUserId || canEditAll;
        return (
          <tr
            key={task.id}
            className={styles.taskRow}
            data-task-id={task.id}
            onClick={() => onTaskClick(task)}
          >
            <td className={styles.colTask}>
              <div className={styles.taskName}>
                <span className={styles.iconSlot} aria-hidden="true">
                  {isOwn ? '✎' : ''}
                </span>
                <span className={styles.taskNameText}>{task.name}</span>
              </div>
            </td>
            <td className={styles.colStatus}>
              <span
                className={styles.statusDot}
                style={{
                  background: visual.bg,
                  outline: overdue ? '2px solid var(--color-danger)' : 'none',
                  outlineOffset: -1,
                }}
                title={status}
              />
            </td>
            <td className={`${styles.colHours} ${styles.hoursCell}`}>{task.hours}ч</td>
            <td>
              <div className={styles.barsCell}>
                <TaskBar
                  task={task}
                  sprintStartIso={sprintStartIso}
                  sprintEndIso={sprintEndIso}
                  todayIso={todayIso}
                />
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
}
