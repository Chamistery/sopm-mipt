/*
 * GradesTable — таблица оценок. Pixel-port из admin.html (view-grading
 * tab-grades, lines 1848-1955). Колонки:
 *   Студент / Проект / Команда / Ментор(/10) / КТУ / Трекер(/10) /
 *   Защита(/10) / Peer / Итого
 * Ячейка раскрашивается green / yellow по значению (≥8, ≥6, иначе empty).
 */

import type { JSX } from 'react';

import type { CoordinatorGradingRow } from '@/api/coordinatorGrading';
import styles from './GradesTable.module.css';

interface Props {
  rows: CoordinatorGradingRow[];
}

export function GradesTable({ rows }: Props): JSX.Element {
  if (rows.length === 0) {
    return <div className={styles.empty}>Нет оценок для отображения.</div>;
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Студент</th>
            <th scope="col">Проект</th>
            <th scope="col">Команда</th>
            <th scope="col">Ментор (/10)</th>
            <th scope="col">КТУ</th>
            <th scope="col">Трекер (/10)</th>
            <th scope="col">Защита (/10)</th>
            <th scope="col">Peer</th>
            <th scope="col">Итого</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.studentId}-${r.teamName ?? ''}`}>
              <td className={styles.cellBold}>{r.studentName}</td>
              <td>{r.projectTitle ?? em()}</td>
              <td>{r.teamName ?? em()}</td>
              <ScoreCell value={r.mentorAvg} />
              <td>{r.ktu == null ? em() : r.ktu.toFixed(1)}</td>
              <ScoreCell value={r.tracker} />
              <ScoreCell value={r.defense} />
              <ScoreCell value={r.peerReview} />
              <td className={styles.cellBold}>
                {r.total == null ? em() : r.total.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScoreCell({ value }: { value?: number | null }): JSX.Element {
  if (value == null) {
    return (
      <td>
        <span className={styles.empty}>—</span>
      </td>
    );
  }
  const cls = value >= 8 ? styles.green : value >= 6 ? styles.yellow : '';
  return <td className={cls}>{value.toFixed(1)}</td>;
}

function em(): JSX.Element {
  return <span className={styles.empty}>—</span>;
}
