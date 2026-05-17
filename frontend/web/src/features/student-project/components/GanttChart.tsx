import { useMemo } from 'react';

import type { GanttResponseDto, TaskDto, TeamMemberDto } from '@/api/teams';
import {
  calcTodayPct,
  formatRuRange,
  formatTimelineDayLabel,
  isWeekend,
  sprintDayList,
} from '../lib/dates';
import {
  ARCHIVE_DONE_BG,
  archiveStatusVisual,
  calcEffectiveStatus,
  statusVisual,
  wasOverdue,
} from '../lib/taskStatus';
import { avatarColor, shortName } from '../lib/people';
import { TaskBar } from './TaskBar';
import styles from './GanttChart.module.css';

export type GanttMode = 'student' | 'mentor' | 'archive';

/*
 * Суммарная ширина sticky-колонок (Задача 220 + Статус 30 + Часы 50).
 * Должна совпадать с CSS-настройками .colTask/.colStatus/.colHours;
 * используется в minWidth таблицы и в position-расчёте today-line.
 */
const STICKY_COLS_WIDTH = 300;

/**
 * «(текущий)» / «(завершён)» / «(запланирован)» рядом с номером спринта в
 * шапке Ганта. archive-режим всегда «завершён», иначе берём по
 * sprint.status.
 */
function sprintLabelSuffix(status: SprintDtoStatus, isArchive: boolean): string {
  if (isArchive) return ' (завершён)';
  switch (status) {
    case 'Активный':
      return ' (текущий)';
    case 'Завершён':
      return ' (завершён)';
    case 'Запланирован':
      return ' (запланирован)';
    default:
      return '';
  }
}

type SprintDtoStatus = 'Запланирован' | 'Активный' | 'Завершён';

interface Props {
  data: GanttResponseDto;
  todayIso: string;
  currentUserId: number;
  /** Тимлид может всё, студент — только свои задачи. Игнорируется в `mode='mentor'|'archive'`. */
  canEditAll: boolean;
  /** «+ Добавить задачу». Игнорируется в `mode='mentor'|'archive'`. */
  canAddTask: boolean;
  /**
   * `'student'` (по умолчанию) — обычный режим: клик зовёт `onTaskClick`,
   * показываются иконки-карандаши у своих задач, кнопка добавления и пр.
   * `'mentor'` — read-only диаграмма: ни добавления, ни иконок-карандашей,
   * клик по любой задаче зовёт `onTaskClick` (или `onTaskAction` если он
   * передан — для обратной совместимости со старыми вызовами, где
   * у ментора был только action-popup).
   * `'archive'` — read-only финальный вид завершённого спринта: ни кликов,
   * ни мутаций; зелёно-фиолетовая палитра, своя легенда.
   */
  mode?: GanttMode;
  onTaskClick: (task: TaskDto) => void;
  /**
   * Опциональный обработчик «кликнули по задаче, по которой ментор
   * может что-то сделать». Если передан в режиме `'mentor'`, заменяет
   * `onTaskClick` для всех тасков. Оставлен для обратной совместимости —
   * в типичной странице ментора достаточно `onTaskClick`.
   */
  onTaskAction?: (task: TaskDto) => void;
  onAddTask: () => void;
  sprintNumber: number;
  /**
   * Показывать ли встроенную легенду. Используется только в архивном
   * режиме (зелёно-фиолетовая палитра по прототипу mentor.html:1554-1560).
   * В режиме `student`/`mentor` встроенная легенда не рендерится в любом
   * случае: студент по дизайну живёт без легенды, а ментор использует
   * отдельный `<GanttLegend/>`.
   */
  showLegend?: boolean;
}

export function GanttChart({
  data,
  todayIso,
  currentUserId,
  canEditAll,
  canAddTask,
  mode = 'student',
  onTaskClick,
  onTaskAction,
  onAddTask,
  sprintNumber,
  showLegend = true,
}: Props): JSX.Element {
  const { sprint, members, tasks } = data;
  const isMentor = mode === 'mentor';
  const isArchive = mode === 'archive';
  const isReadOnly = isMentor || isArchive;

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

  const handleTaskClick = (task: TaskDto): void => {
    if (isArchive) return;
    if (isMentor && onTaskAction) {
      // legacy путь — старые вызовы передавали только onTaskAction
      onTaskAction(task);
      return;
    }
    onTaskClick(task);
  };

  return (
    <section className={styles.wrapper} aria-label="Диаграмма Ганта">
      <div className={styles.headerBar}>
        <div>
          Спринт {sprintNumber}
          {sprintLabelSuffix(sprint.status, isArchive)}
          <span className={styles.headerMeta}>
            {' '}
            · {formatRuRange(sprint.startDate, sprint.endDate)} · {days.length} дн.
          </span>
        </div>
        {!isReadOnly && canAddTask ? (
          <button type="button" className={styles.addButton} onClick={onAddTask}>
            + Добавить задачу
          </button>
        ) : null}
      </div>

      {/*
       * Легенда статусов + блок event-маркеров справа от вертикальной
       * полоски — пиксельная копия прототипа student_assigned.html:104-117
       * (у ментора в его шапке есть отдельный <GanttLegend/>, поэтому он
       * передаёт showLegend={false}). Архивный режим использует
       * упрощённую палитру.
       */}
      {!showLegend ? null : isArchive ? (
        <div className={styles.archiveLegend} aria-label="Легенда архивной диаграммы">
          <span className={styles.archiveLegendItem}>
            <span
              className={styles.archiveLegendSwatch}
              style={{ background: ARCHIVE_DONE_BG }}
            />
            Готово (принято ментором)
          </span>
          <span className={styles.legendEvents} aria-label="События задач">
            <span className={styles.legendItem}>
              <span className={styles.legendEventMarker} style={{ background: '#6d5dd3' }} />
              На ревью
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendEventMarker} style={{ background: '#34d399' }} />
              Принято
            </span>
          </span>
        </div>
      ) : (
        <div className={styles.legend} aria-label="Легенда">
          {(['Ожидает аппрува', 'Назначена', 'В работе', 'На ревью', 'Готово', 'Просрочена', 'Возвращена'] as const).map((s) => {
            const v = statusVisual(s);
            // «Просрочена» в прототипе — синий бар + outline danger (не border).
            // «Возвращена» — warning-bg + warning border. Различаем для точности.
            const isOverdue = s === 'Просрочена';
            return (
              <span key={s} className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{
                    background: v.bg,
                    border: !isOverdue && v.border ? `1px solid ${v.border}` : 'none',
                    outline: isOverdue ? `1px solid var(--color-danger)` : 'none',
                    outlineOffset: 0,
                  }}
                />
                {s}
              </span>
            );
          })}
          <span className={styles.legendEvents} aria-label="События задач">
            <span className={styles.legendItem}>
              <span className={styles.legendEventMarker} style={{ background: '#6d5dd3' }} />
              На ревью
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendEventMarker} style={{ background: '#fbbf24' }} />
              Возвращено
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendEventMarker} style={{ background: '#34d399' }} />
              Принято
            </span>
          </span>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className={styles.empty}>В этом спринте задач пока нет.</div>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table} style={{ minWidth: `${STICKY_COLS_WIDTH + minBarsWidth}px` }}>
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
                  isMentor={isMentor}
                  isArchive={isArchive}
                  todayIso={todayIso}
                  sprintStartIso={sprint.startDate}
                  sprintEndIso={sprint.endDate}
                  onTaskClick={handleTaskClick}
                />
              ))}
            </tbody>
          </table>

          {todayPct != null ? (
            <div
              className={styles.todayLine}
              style={{ left: `calc(${STICKY_COLS_WIDTH}px + (100% - ${STICKY_COLS_WIDTH}px) * ${todayPct} / 100)` }}
            />
          ) : null}
        </div>
      )}

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
  isMentor: boolean;
  isArchive: boolean;
  todayIso: string;
  sprintStartIso: string;
  sprintEndIso: string;
  onTaskClick: (task: TaskDto) => void;
}

function PersonRows({
  group,
  currentUserId,
  canEditAll,
  isMentor,
  isArchive,
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
        const visual = isArchive ? archiveStatusVisual(status) : statusVisual(status);
        const overdue = !isArchive && wasOverdue(task, todayIso);
        const showPencil = !isMentor && !isArchive && (task.assigneeId === currentUserId || canEditAll);
        return (
          <tr
            key={task.id}
            className={`${styles.taskRow} ${isArchive ? styles.taskRowArchive : ''}`}
            data-task-id={task.id}
            onClick={() => onTaskClick(task)}
          >
            <td className={styles.colTask}>
              <div className={styles.taskName}>
                <span className={styles.iconSlot} aria-hidden="true">
                  {showPencil ? '✎' : ''}
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
                  archive={isArchive}
                />
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
}
