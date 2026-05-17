/*
 * Дропдаун выбора спринта над диаграммой Ганта. Используется на странице
 * распределённого студента (StudentProjectPage) — UX тот же, что в
 * MentorTeamGanttTab: пользователь видит активный спринт по умолчанию и
 * может переключиться на завершённый/будущий через `?sprintId=` в URL.
 */

import type { ChangeEvent, JSX } from 'react';

import type { Sprint } from '@/api/teams';
import { formatRuRange } from '../lib/dates';
import styles from './SprintSwitcher.module.css';

interface Props {
  sprints: Sprint[];
  selectedId: number | null;
  onChange: (id: number) => void;
}

export function SprintSwitcher({ sprints, selectedId, onChange }: Props): JSX.Element {
  const handle = (e: ChangeEvent<HTMLSelectElement>): void => {
    const id = Number.parseInt(e.target.value, 10);
    if (Number.isFinite(id)) onChange(id);
  };
  return (
    <label className={styles.switcher}>
      <span className={styles.label}>Спринт:</span>
      <select className={styles.select} value={selectedId ?? ''} onChange={handle}>
        {sprints.map((s) => (
          <option key={s.id} value={s.id}>
            Спринт {s.number} · {formatRuRange(s.startDate, s.endDate)} · {s.status}
          </option>
        ))}
      </select>
    </label>
  );
}
