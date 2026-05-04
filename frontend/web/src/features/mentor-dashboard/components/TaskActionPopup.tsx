import { useEffect, useState } from 'react';

import styles from './TaskActionPopup.module.css';

export type TaskActionKind = 'approve' | 'reject' | 'accept' | 'return';

const TITLES: Record<TaskActionKind, string> = {
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

interface Props {
  open: boolean;
  taskName: string;
  action: TaskActionKind;
  isSubmitting?: boolean;
  serverError?: string | null;
  onSubmit: (comment: string) => void;
  onClose: () => void;
}

/**
 * Modal dialog the mentor uses to approve / reject / accept / return a
 * task. Comment is required for the negative actions (reject, return)
 * and optional for the positive ones (approve, accept).
 */
export function TaskActionPopup({
  open,
  taskName,
  action,
  isSubmitting,
  serverError,
  onSubmit,
  onClose,
}: Props): JSX.Element | null {
  const [comment, setComment] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setComment('');
      setTouched(false);
    }
  }, [open, action]);

  if (!open) return null;

  const required = COMMENT_REQUIRED[action];
  const trimmed = comment.trim();
  const error = required && !trimmed ? 'Комментарий обязателен' : null;

  const handleSubmit = (): void => {
    setTouched(true);
    if (error) return;
    onSubmit(trimmed);
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={TITLES[action]}
      onClick={onClose}
    >
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h2 className={styles.title}>{TITLES[action]}</h2>
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
            {required ? <span className={styles.required}> *</span> : null}
          </div>
          <textarea
            className={styles.textarea}
            rows={4}
            value={comment}
            placeholder={required ? 'Опишите, почему' : 'Необязательно'}
            onChange={(e) => setComment(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && !!error}
          />
          {touched && error ? <div className={styles.errorInline}>{error}</div> : null}
        </label>

        {serverError ? <div className={styles.serverError}>{serverError}</div> : null}

        <div className={styles.actions}>
          <button
            type="button"
            className={action === 'reject' || action === 'return' ? styles.danger : styles.primary}
            disabled={isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Сохраняем…' : SUBMIT_LABEL[action]}
          </button>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
