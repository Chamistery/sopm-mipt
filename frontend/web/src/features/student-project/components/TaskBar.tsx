import { calcEffectiveStatus, statusVisual, wasOverdue } from '../lib/taskStatus';
import { calcBarPosition, calcHistoryMarkerPct } from '../lib/dates';
import type { TaskDto } from '@/api/teams';
import styles from './GanttChart.module.css';

interface Props {
  task: TaskDto;
  sprintStartIso: string;
  sprintEndIso: string;
  todayIso: string;
}

const HISTORY_COLORS: Record<string, string> = {
  review: 'var(--color-purple)',
  returned: 'var(--color-warning)',
  accepted: 'var(--color-success)',
};

const HISTORY_TITLES: Record<string, string> = {
  review: 'Отправлено на ревью',
  returned: 'Возвращено',
  accepted: 'Принято',
};

export function TaskBar({ task, sprintStartIso, sprintEndIso, todayIso }: Props): JSX.Element {
  const status = calcEffectiveStatus(task, todayIso);
  const visual = statusVisual(status);
  const overdue = wasOverdue(task, todayIso);
  const pos = calcBarPosition(task.startDate, task.endDate, sprintStartIso, sprintEndIso);

  const barClass = [
    styles.bar,
    overdue ? styles.barOverdueOutline : '',
    status === 'Возвращена' ? styles.barReturnedOutline : '',
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
        const pct = calcHistoryMarkerPct(h.date, sprintStartIso, sprintEndIso);
        const color = HISTORY_COLORS[h.event] ?? 'var(--color-text-muted)';
        const title = HISTORY_TITLES[h.event] ?? h.event;
        return (
          <div
            key={`${h.date}-${h.event}-${idx}`}
            className={styles.historyMarker}
            style={{ left: `${pct}%`, background: color }}
            title={`${h.date}: ${title}`}
          />
        );
      })}
    </>
  );
}
