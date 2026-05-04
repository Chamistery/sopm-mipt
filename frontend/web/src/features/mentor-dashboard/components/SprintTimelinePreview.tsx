import {
  calculateSprintTimeline,
  formatRussianDayMonth,
  type SprintsConfig,
} from '../lib/projectFormState';
import styles from './SprintTimelinePreview.module.css';

interface Props {
  config: SprintsConfig;
  /** Только в mode='custom': обновить длительность одной плашки. */
  onCustomDurationChange?: (sprintIndex: number, weeks: number) => void;
}

/** Live-preview расписания спринтов — горизонтальные плашки с диапазоном дат. */
export function SprintTimelinePreview({ config, onCustomDurationChange }: Props): JSX.Element {
  const timeline = calculateSprintTimeline(config);

  if (!timeline) {
    return (
      <div className={styles.placeholder}>
        Укажите количество спринтов и дату начала, чтобы увидеть расписание
      </div>
    );
  }

  return (
    <div className={styles.list} data-testid="sprint-timeline">
      <div className={styles.headerRow}>
        <span className={styles.colSprint}>Спринт</span>
        {config.mode === 'custom' ? <span className={styles.colDuration}>Длительность</span> : null}
        <span className={styles.colDates}>Даты</span>
        <span className={styles.colDays}>Дней</span>
      </div>
      {timeline.rows.map((row, idx) => (
        <div
          key={row.number}
          className={`${styles.row} ${idx % 2 === 1 ? styles.rowAlt : ''}`}
          data-sprint={row.number}
        >
          <span className={styles.colSprintNum}>Спринт {row.number}</span>
          {config.mode === 'custom' ? (
            <select
              className={styles.durationSelect}
              value={row.weeks}
              onChange={(e) => onCustomDurationChange?.(idx, Number(e.target.value))}
              aria-label={`Длительность спринта ${row.number}`}
            >
              <option value={1}>1 неделя</option>
              <option value={2}>2 недели</option>
              <option value={3}>3 недели</option>
              <option value={4}>4 недели</option>
            </select>
          ) : null}
          <span className={styles.colDates}>
            {formatRussianDayMonth(row.startDate)} — {formatRussianDayMonth(row.endDate)}
          </span>
          <span className={styles.colDays}>{row.days} дн.</span>
        </div>
      ))}
      <div className={styles.totalRow}>
        <span>
          Итого: {formatRussianDayMonth(timeline.totalStart)} —{' '}
          {formatRussianDayMonth(timeline.totalEnd)}
        </span>
        <span>
          {timeline.totalDays} дн. (~{timeline.totalWeeks} нед.)
        </span>
      </div>
    </div>
  );
}
