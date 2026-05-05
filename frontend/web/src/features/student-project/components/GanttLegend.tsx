/*
 * Легенда диаграммы Ганта. Pixel-port из mentor.html:952-963 и
 * 1554-1561 (архивная). Отделена от GanttChart, чтобы её можно было
 * рендерить на уровне таба (как в прототипе — над gantt-sprints-container,
 * не внутри карточки спринта).
 */

import type { JSX } from 'react';

import { ARCHIVE_DONE_BG, statusVisual } from '../lib/taskStatus';
import styles from './GanttChart.module.css';

interface Props {
  variant?: 'default' | 'archive';
  /** Дополнительный класс — например, чтобы переопределить margin
   *  когда легенда лежит в `controls`-row рядом со SprintSwitcher. */
  className?: string;
}

export function GanttLegend({ variant = 'default', className }: Props): JSX.Element {
  if (variant === 'archive') {
    return (
      <div
        className={[styles.archiveLegend, className].filter(Boolean).join(' ')}
        aria-label="Легенда архивной диаграммы"
      >
        <span className={styles.archiveLegendItem}>
          <span className={styles.archiveLegendSwatch} style={{ background: ARCHIVE_DONE_BG }} />
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
    );
  }

  return (
    <div
      className={[styles.legend, className].filter(Boolean).join(' ')}
      aria-label="Легенда"
    >
      {(
        [
          'Ожидает аппрува',
          'Назначена',
          'В работе',
          'На ревью',
          'Готово',
          'Просрочена',
          'Возвращена',
        ] as const
      ).map((s) => {
        const v = statusVisual(s);
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
  );
}
