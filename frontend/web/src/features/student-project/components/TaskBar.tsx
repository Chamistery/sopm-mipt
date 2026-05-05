import {
  archiveStatusVisual,
  calcEffectiveStatus,
  statusVisual,
  wasOverdue,
} from '../lib/taskStatus';
import { calcBarPosition, calcHistoryMarkerPct } from '../lib/dates';
import type { TaskDto } from '@/api/teams';
import styles from './GanttChart.module.css';

interface Props {
  task: TaskDto;
  sprintStartIso: string;
  sprintEndIso: string;
  todayIso: string;
  /**
   * Архивный режим — палитра «зелёный/фиолетовый/серый», без overdue-обводки
   * и без история-маркеров (финальное состояние без таймлайна событий).
   */
  archive?: boolean;
}

/*
 * Цвета и подписи маркеров событий — выверены по mentor.html:961-963 и
 * common.css:.gantt-event-marker.ev-{review|returned|accepted}. Используем
 * именно эти hex'ы (не токены `--color-warning` и пр.), чтобы оттенки
 * полосок легенды и баров совпадали 1:1 с прототипом.
 */
const HISTORY_COLORS: Record<string, string> = {
  review: '#6d5dd3',
  returned: '#fbbf24',
  accepted: '#34d399',
};

const HISTORY_TITLES: Record<string, string> = {
  review: 'Отправлено на ревью',
  returned: 'Возвращено',
  accepted: 'Принято',
};

export function TaskBar({
  task,
  sprintStartIso,
  sprintEndIso,
  todayIso,
  archive = false,
}: Props): JSX.Element {
  const status = calcEffectiveStatus(task, todayIso);
  const visual = archive ? archiveStatusVisual(status) : statusVisual(status);
  const overdue = !archive && wasOverdue(task, todayIso);
  const pos = calcBarPosition(task.startDate, task.endDate, sprintStartIso, sprintEndIso);

  const barClass = [
    styles.bar,
    overdue ? styles.barOverdueOutline : '',
    !archive && status === 'Возвращена' ? styles.barReturnedOutline : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div
        data-testid="task-bar"
        data-status={status}
        className={barClass}
        style={{
          left: `${pos.leftPct}%`,
          width: `${pos.widthPct}%`,
          background: visual.bg,
          borderColor: visual.border,
        }}
        title={`${task.name} · ${status}`}
      />
      {(task.history ?? []).map((h, idx) => {
        const pct = calcHistoryMarkerPct(h.day, sprintStartIso, sprintEndIso);
        const color = HISTORY_COLORS[h.event] ?? 'var(--color-text-muted)';
        const title = HISTORY_TITLES[h.event] ?? h.event;
        return (
          <div
            key={`${h.day}-${h.event}-${idx}`}
            className={styles.historyMarker}
            style={{ left: `calc(${pct}% - 2.5px)`, background: color }}
            title={`${title} · день ${h.day + 1}`}
          />
        );
      })}
    </>
  );
}
