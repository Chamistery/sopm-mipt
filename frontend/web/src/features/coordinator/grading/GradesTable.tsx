/*
 * GradesTable — таблица оценок. Pixel-port из admin.html (view-grading
 * tab-grades, lines 1848-1955). Колонки:
 *   Студент / Проект / Команда / Ментор(/10) / КТУ / Трекер(/10) /
 *   Защита(/10) / Peer / Итого
 * Ячейка раскрашивается green / yellow по значению (≥8, ≥6, иначе empty).
 *
 * Координатор может кликнуть на любую ячейку-оценку (mentor/tracker/
 * defense/peer) или КТУ — открывается EditScoreModal с пер-спринтным
 * редактированием. Ячейка «Итого» — read-only (производное).
 */

import { useState, type JSX } from 'react';

import type { CoordinatorGradingRow } from '@/api/coordinatorGrading';
import type { SprintScoreCategory } from '@/api/sprintScores';

import { EditScoreModal } from './EditScoreModal';
import styles from './GradesTable.module.css';

interface Props {
  rows: CoordinatorGradingRow[];
}

interface EditTarget {
  studentId: number;
  studentName: string;
  teamId: number;
  category: SprintScoreCategory;
}

export function GradesTable({ rows }: Props): JSX.Element {
  const [edit, setEdit] = useState<EditTarget | null>(null);

  if (rows.length === 0) {
    return <div className={styles.empty}>Нет оценок для отображения.</div>;
  }

  const openEditor = (row: CoordinatorGradingRow, category: SprintScoreCategory): void => {
    if (!row.teamId) return;
    setEdit({
      studentId: row.studentId,
      studentName: row.studentName,
      teamId: row.teamId,
      category,
    });
  };

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
            <tr key={`${r.studentId}-${r.teamId}`}>
              <td className={styles.cellBold}>{r.studentName}</td>
              <td>{r.projectTitle ?? em()}</td>
              <td>{r.teamName ?? em()}</td>
              <ScoreCell value={r.mentorAvg} onClick={() => openEditor(r, 'mentor')} />
              <KtuCell value={r.ktu} onClick={() => openEditor(r, 'mentor')} />
              <ScoreCell value={r.tracker} onClick={() => openEditor(r, 'tracker')} />
              <ScoreCell value={r.defense} onClick={() => openEditor(r, 'defense')} />
              <ScoreCell value={r.peerReview} onClick={() => openEditor(r, 'peer')} />
              <td className={styles.cellBold}>
                {r.total == null ? em() : r.total.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {edit != null ? (
        <EditScoreModal
          studentId={edit.studentId}
          studentName={edit.studentName}
          teamId={edit.teamId}
          category={edit.category}
          onClose={() => setEdit(null)}
        />
      ) : null}
    </div>
  );
}

interface CellProps {
  value?: number | null;
  onClick: () => void;
}

function ScoreCell({ value, onClick }: CellProps): JSX.Element {
  const cls =
    value == null ? '' : value >= 8 ? styles.green : value >= 6 ? styles.yellow : '';
  return (
    <td className={`${cls} ${styles.editable}`}>
      <button
        type="button"
        className={styles.cellBtn}
        onClick={onClick}
        title="Редактировать оценки по спринтам"
      >
        {value == null ? <span className={styles.empty}>—</span> : value.toFixed(1)}
      </button>
    </td>
  );
}

function KtuCell({ value, onClick }: CellProps): JSX.Element {
  return (
    <td className={styles.editable}>
      <button
        type="button"
        className={styles.cellBtn}
        onClick={onClick}
        title="Редактировать оценки ментора и КТУ"
      >
        {value == null ? <span className={styles.empty}>—</span> : value.toFixed(1)}
      </button>
    </td>
  );
}

function em(): JSX.Element {
  return <span className={styles.empty}>—</span>;
}
