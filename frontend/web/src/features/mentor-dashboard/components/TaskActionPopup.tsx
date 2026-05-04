import { useEffect, useState } from 'react';

import styles from './TaskActionPopup.module.css';

export type TaskActionKind = 'approve' | 'reject' | 'accept' | 'return';

const SINGLE_TITLES: Record<TaskActionKind, string> = {
  approve: 'Аппрувить задачу',
  reject: 'Отклонить задачу',
  accept: 'Принять задачу',
  return: 'Вернуть задачу на доработку',
};

const SUBMIT_LABEL: Record<TaskActionKind, string> = {
  approve: 'Аппрувить',
  reject: 'Отклонить',
  accept: 'Принять',
  return: 'Вернуть',
};

const COMMENT_REQUIRED: Record<TaskActionKind, boolean> = {
  approve: false,
  reject: true,
  accept: false,
  return: true,
};

const NEGATIVE = new Set<TaskActionKind>(['reject', 'return']);

interface Props {
  open: boolean;
  taskName: string;
  /** Available actions; popup renders one button per kind. */
  actions: TaskActionKind[];
  isSubmitting?: boolean;
  serverError?: string | null;
  onSubmit: (action: TaskActionKind, comment: string) => void;
  onClose: () => void;
}

/**
 * Modal dialog the mentor uses to approve / reject / accept / return a
 * task. Comment is required for the negative actions (reject, return)
 * and optional for the positive ones (approve, accept).
 *
 * `actions` lists what the mentor can do for this task — one button per
 * kind, keyed by the task's status. Single-button mode (e.g. just
 * `['approve']`) keeps the per-action title; multi-button mode shows a
 * neutral title and lets the mentor pick at submit time.
 */
export function TaskActionPopup({
  open,
  taskName,
  actions,
  isSubmitting,
  serverError,
  onSubmit,
  onClose,
}: Props): JSX.Element | null {
  const [comment, setComment] = useState('');
  const [touched, setTouched] = useState(false);
  const [pendingAction, setPendingAction] = useState<TaskActionKind | null>(null);

  useEffect(() => {
    if (open) {
      setComment('');
      setTouched(false);
      setPendingAction(null);
    }
  }, [open, actions]);

  if (!open) return null;

  const trimmed = comment.trim();
  const requiresComment = pendingAction != null && COMMENT_REQUIRED[pendingAction];
  const error = requiresComment && !trimmed ? 'Комментарий обязателен' : null;

  const title =
    actions.length === 1 && actions[0] != null ? SINGLE_TITLES[actions[0]] : 'Действие над задачей';

  const handleClick = (action: TaskActionKind): void => {
    setTouched(true);
    setPendingAction(action);
    if (COMMENT_REQUIRED[action] && !trimmed) return;
    onSubmit(action, trimmed);
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </header>

        <p className={styles.taskName}>«{taskName}»</p>

        <label className={styles.field}>
          <div className={styles.label}>
            Комментарий
            {requiresComment ? <span className={styles.required}> *</span> : null}
          </div>
          <textarea
            className={styles.textarea}
            rows={4}
            value={comment}
            placeholder="Комментарий (обязателен для отклонения / возврата)"
            onChange={(e) => setComment(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && !!error}
          />
          {touched && error ? <div className={styles.errorInline}>{error}</div> : null}
        </label>

        {serverError ? <div className={styles.serverError}>{serverError}</div> : null}

        <div className={styles.actions}>
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              className={NEGATIVE.has(action) ? styles.danger : styles.primary}
              disabled={isSubmitting}
              onClick={() => handleClick(action)}
            >
              {isSubmitting && pendingAction === action ? 'Сохраняем…' : SUBMIT_LABEL[action]}
            </button>
          ))}
          <button type="button" className={styles.secondary} onClick={onClose} disabled={isSubmitting}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
