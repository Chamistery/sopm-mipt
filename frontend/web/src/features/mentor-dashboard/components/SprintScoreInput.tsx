import { useEffect, useState } from 'react';

import { MAX_SCORE, MIN_SCORE, validateScore } from '@/api/sprintScores';
import styles from './SprintScoreInput.module.css';

export interface SprintScoreDraft {
  studentId: number;
  studentName: string;
  /** Existing score id, if the mentor has already saved one. */
  existingId: number | null;
  score: number | null;
  comment: string;
  /** Whether the local draft differs from the persisted value. */
  dirty: boolean;
}

interface Props {
  draft: SprintScoreDraft;
  isSaving?: boolean;
  serverError?: string | null;
  onChange: (next: SprintScoreDraft) => void;
  onSave: (draft: SprintScoreDraft) => void;
}

/**
 * Single-student sprint-score row. Lets the mentor type a score (0..10)
 * and an optional comment, then saves it via the parent. Used by the
 * report-review screen as a sub-form per team member.
 */
export function SprintScoreInput({
  draft,
  isSaving,
  serverError,
  onChange,
  onSave,
}: Props): JSX.Element {
  const [touched, setTouched] = useState(false);
  const error = draft.score == null ? null : validateScore(draft.score);

  useEffect(() => {
    setTouched(false);
  }, [draft.studentId]);

  return (
    <div className={styles.row}>
      <div className={styles.name}>{draft.studentName}</div>
      <label className={styles.scoreField}>
        <span className={styles.label}>Балл</span>
        <input
          className={`${styles.input} ${touched && error ? styles.inputError : ''}`}
          type="number"
          min={MIN_SCORE}
          max={MAX_SCORE}
          step={1}
          value={draft.score ?? ''}
          onBlur={() => setTouched(true)}
          onChange={(e) => {
            const raw = e.target.value;
            const parsed = raw === '' ? null : Number.parseInt(raw, 10);
            onChange({
              ...draft,
              score: parsed,
              dirty: true,
            });
          }}
        />
      </label>
      <label className={styles.commentField}>
        <span className={styles.label}>Комментарий</span>
        <input
          className={styles.input}
          type="text"
          value={draft.comment}
          placeholder="Необязательно"
          onChange={(e) => onChange({ ...draft, comment: e.target.value, dirty: true })}
        />
      </label>
      <button
        type="button"
        className={styles.save}
        onClick={() => {
          setTouched(true);
          if (error || draft.score == null) return;
          onSave(draft);
        }}
        disabled={isSaving || !draft.dirty || draft.score == null || error != null}
      >
        {isSaving ? 'Сохраняем…' : draft.existingId != null ? 'Обновить' : 'Сохранить'}
      </button>
      {touched && error ? <div className={styles.errorInline}>{error}</div> : null}
      {serverError ? <div className={styles.errorInline}>{serverError}</div> : null}
    </div>
  );
}

