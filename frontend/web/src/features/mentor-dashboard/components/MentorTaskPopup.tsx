/*
 * Полный попап задачи для ментора.
 *
 * Поведение из прототипа (mentor.html → showTaskDetail / mentorActions):
 *   * клик по любой задаче в Гант-режиме → открыт попап с полной
 *     информацией (название, статус, исполнитель, сроки, описание,
 *     описание выполненной работы, MR, история комментариев ментора);
 *   * для статусов «Ожидает аппрува» / «На ревью» внизу появляются
 *     парные кнопки действий (approve|reject / accept|return);
 *   * выбранная негативная кнопка раскрывает textarea, в котором
 *     ментор обязан указать комментарий (для approve/accept коммент
 *     опционален);
 *   * для статусов без actions попап работает как read-only вьюер.
 *
 * В отличие от компактного `TaskActionPopup` этот компонент даёт
 * ментору контекст — что за задача и что было сделано. Сценарий
 * мутации (approve / reject / accept / return + comment) тот же.
 */

import { useEffect, useMemo, useState } from 'react';
import type { JSX } from 'react';

import type { TaskDto, TeamMemberDto } from '@/api/teams';
import { formatRuRange } from '@/features/student-project/lib/dates';
import { avatarColor, findMember, fullNameWithMiddle, initials, shortName } from '@/features/student-project/lib/people';
import { calcEffectiveStatus, statusVisual, wasOverdue } from '@/features/student-project/lib/taskStatus';
import { ReadonlyBody } from '@/features/student-project/components/TaskPopup';
import sharedStyles from '@/features/student-project/components/TaskPopup.module.css';
import { actionsFor } from '../lib/taskActions';
import type { TaskActionKind } from './TaskActionPopup';
import styles from './MentorTaskPopup.module.css';

const COMMENT_REQUIRED: Record<TaskActionKind, boolean> = {
  approve: false,
  reject: true,
  accept: false,
  return: true,
};

const COMMENT_LABEL: Record<TaskActionKind, string> = {
  approve: 'Комментарий (необязательно)',
  reject: 'Причина отклонения',
  accept: 'Комментарий (что сделано хорошо, замечания)',
  return: 'Что нужно доработать',
};

const COMMENT_PLACEHOLDER: Record<TaskActionKind, string> = {
  approve: 'Пожелания, рекомендации к выполнению…',
  reject: 'Опишите почему задача отклонена…',
  accept: 'Задача выполнена качественно…',
  return: 'Опишите замечания к работе…',
};

const ACTION_BUTTON_LABEL: Record<TaskActionKind, string> = {
  approve: 'Аппрувить',
  reject: 'Отклонить',
  accept: 'Принять',
  return: 'Вернуть',
};

const CONFIRM_LABEL: Record<TaskActionKind, string> = {
  approve: 'Подтвердить аппрув',
  reject: 'Подтвердить отклонение',
  accept: 'Подтвердить принятие',
  return: 'Подтвердить возврат',
};

const POSITIVE = new Set<TaskActionKind>(['approve', 'accept']);

interface Props {
  open: boolean;
  task: TaskDto | null;
  members: TeamMemberDto[];
  todayIso: string;
  isSubmitting?: boolean;
  serverError?: string | null;
  onSubmit: (action: TaskActionKind, comment: string) => void;
  onClose: () => void;
}

export function MentorTaskPopup({
  open,
  task,
  members,
  todayIso,
  isSubmitting,
  serverError,
  onSubmit,
  onClose,
}: Props): JSX.Element | null {
  const [pendingAction, setPendingAction] = useState<TaskActionKind | null>(null);
  const [comment, setComment] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Сбросить локальное состояние при открытии другого таска.
  useEffect(() => {
    if (open) {
      setPendingAction(null);
      setComment('');
      setValidationError(null);
    }
  }, [open, task?.id]);

  const effectiveStatus = useMemo(
    () => (task ? calcEffectiveStatus(task, todayIso) : null),
    [task, todayIso],
  );

  const availableActions: TaskActionKind[] = useMemo(() => {
    if (!task) return [];
    return actionsFor(task.status).map((a) => a.kind);
  }, [task]);

  if (!open || !task) return null;

  const member = findMember(members, task.assigneeId);
  const personLabel = member ? shortName(member) : `Участник #${task.assigneeId}`;
  const personFull = member ? fullNameWithMiddle(member) : personLabel;
  const personInitials = member ? initials(member) : '??';
  const dateRange = formatRuRange(task.startDate, task.endDate);

  const visual = effectiveStatus ? statusVisual(effectiveStatus) : null;
  const overdueChip = wasOverdue(task, todayIso);

  const handleSelectAction = (action: TaskActionKind): void => {
    setPendingAction(action);
    setValidationError(null);
  };

  const handleConfirm = (): void => {
    if (!pendingAction) return;
    const trimmed = comment.trim();
    if (COMMENT_REQUIRED[pendingAction] && !trimmed) {
      setValidationError(
        pendingAction === 'reject'
          ? 'Укажите причину отклонения'
          : 'Опишите что нужно доработать',
      );
      return;
    }
    onSubmit(pendingAction, trimmed);
  };

  const showActions = availableActions.length > 0;

  return (
    <div
      className={sharedStyles.overlay}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className={sharedStyles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mentor-task-popup-title"
      >
        <div className={sharedStyles.header}>
          <div style={{ flex: 1 }}>
            <h3 id="mentor-task-popup-title" className={sharedStyles.title}>
              {task.name}
            </h3>
            <div className={sharedStyles.headerMeta}>
              {visual && effectiveStatus ? (
                <span
                  className={sharedStyles.statusChip}
                  style={{ background: visual.chipBg, color: visual.text }}
                >
                  {effectiveStatus}
                </span>
              ) : null}
              {overdueChip ? <span className={sharedStyles.overdueChip}>Просрочена</span> : null}
              <span className={sharedStyles.assignee} title={personFull}>
                <span
                  className={sharedStyles.avatar}
                  style={{ background: avatarColor(task.assigneeId) }}
                  aria-hidden="true"
                >
                  {personInitials}
                </span>
                {personLabel}
              </span>
              {task.mr ? (
                <a
                  href={task.mr}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--color-accent)', fontSize: 12, fontWeight: 600 }}
                >
                  MR ↗
                </a>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className={sharedStyles.closeBtn}
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <ReadonlyBody task={task} dateRange={dateRange} />

        {showActions ? (
          <div className={styles.actionsBlock}>
            <div className={styles.actionButtons} role="group" aria-label="Действия ментора">
              {availableActions.map((action) => {
                const positive = POSITIVE.has(action);
                const selected = pendingAction === action;
                return (
                  <button
                    key={action}
                    type="button"
                    className={[
                      styles.actionBtn,
                      positive ? styles.actionBtnPositive : styles.actionBtnNegative,
                      selected ? styles.actionBtnSelected : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-pressed={selected}
                    disabled={isSubmitting}
                    onClick={() => handleSelectAction(action)}
                  >
                    {ACTION_BUTTON_LABEL[action]}
                  </button>
                );
              })}
            </div>

            {pendingAction ? (
              <div className={styles.commentArea}>
                <label className={styles.commentLabel}>
                  {COMMENT_LABEL[pendingAction]}
                  {COMMENT_REQUIRED[pendingAction] ? (
                    <span className={styles.required}> *</span>
                  ) : null}
                </label>
                <textarea
                  className={styles.commentInput}
                  data-action={pendingAction}
                  value={comment}
                  placeholder={COMMENT_PLACEHOLDER[pendingAction]}
                  onChange={(e) => {
                    setComment(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  rows={4}
                />
                {validationError ? (
                  <div className={styles.validationError}>{validationError}</div>
                ) : null}
                {serverError ? (
                  <div className={styles.serverError}>{serverError}</div>
                ) : null}
                <button
                  type="button"
                  className={[
                    styles.confirmBtn,
                    POSITIVE.has(pendingAction) ? styles.confirmPositive : styles.confirmNegative,
                  ].join(' ')}
                  disabled={isSubmitting}
                  onClick={handleConfirm}
                >
                  {isSubmitting ? 'Сохраняем…' : CONFIRM_LABEL[pendingAction]}
                </button>
              </div>
            ) : null}
          </div>
        ) : serverError ? (
          <div className={styles.serverError}>{serverError}</div>
        ) : null}
      </div>
    </div>
  );
}
