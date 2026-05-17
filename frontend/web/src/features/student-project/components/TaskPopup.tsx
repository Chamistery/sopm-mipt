import { useEffect, useMemo, useRef, useState } from 'react';

import type { TaskDto, TeamMemberDto } from '@/api/teams';
import { ApiError } from '@/api/client';
import { calcEffectiveStatus, statusVisual, wasOverdue } from '../lib/taskStatus';
import { avatarColor, findMember, fullNameWithMiddle, initials, shortName } from '../lib/people';
import { formatRuLongRange, formatRuRange } from '../lib/dates';
import styles from './TaskPopup.module.css';

/*
 * Универсальный попап задачи. Работает в двух режимах:
 *  - editable: ассайнй задачи или тимлид команды.
 *  - readonly: чужая задача или статус «На ревью» / «Готово» / «Отклонена».
 *
 * Сетевой слой передаётся колбэками — TaskPopup не дёргает React Query
 * напрямую, чтобы оставаться легко тестируемым в Storybook.
 */

export interface TaskPopupCallbacks {
  /** Авто-сохранение при закрытии. Возвращает true если что-то изменилось. */
  onAutoSave?: (id: number, patch: TaskPatch) => Promise<boolean>;
  onSubmitForReview?: (id: number) => Promise<void>;
  onCancelTask?: (id: number) => Promise<void>;
  onCreateTask?: (payload: CreateTaskInput) => Promise<void>;
}

export interface TaskPatch {
  name: string;
  description: string | null;
  hours: number;
  mr: string | null;
  workDescription: string | null;
}

export interface CreateTaskInput {
  name: string;
  description: string | null;
  hours: number;
  startDate: string;
  endDate: string;
  assigneeId: number;
}

export interface NewTaskDraft {
  /** Используется при создании новой задачи. */
  assigneeId: number;
  /** Дефолтная дата начала и одновременно нижняя граница (start of sprint). */
  startDate: string;
  /** Дефолтная дата окончания и одновременно верхняя граница (end of sprint). */
  endDate: string;
}

interface Props {
  /** Открыто ли окно. Если false — ничего не рендерим. */
  open: boolean;
  /** Существующая задача либо null если создаём новую. */
  task: TaskDto | null;
  /** Когда task = null, нужны дефолты (исполнитель + даты спринта). */
  newDraft?: NewTaskDraft;
  members: TeamMemberDto[];
  currentUserId: number;
  /** Тимлид может редактировать любую задачу. */
  canEditAll: boolean;
  todayIso: string;
  /**
   * Опциональная подпись «Спринт N: ...» под полями дат. Совпадает с
   * прототипом student_assigned.html:267. Если не передано — не рендерим.
   */
  sprintHint?: { number: number; startDate: string; endDate: string };
  callbacks: TaskPopupCallbacks;
  onClose: () => void;
}

export function TaskPopup({
  open,
  task,
  newDraft,
  members,
  currentUserId,
  canEditAll,
  todayIso,
  sprintHint,
  callbacks,
  onClose,
}: Props): JSX.Element | null {
  const isCreating = task === null;

  const ownerId = task?.assigneeId ?? newDraft?.assigneeId ?? currentUserId;
  const isOwn = ownerId === currentUserId;
  const editable = isCreating || isOwn || canEditAll;

  const effectiveStatus = useMemo(
    () => (task ? calcEffectiveStatus(task, todayIso) : null),
    [task, todayIso],
  );

  const lockedByStatus =
    effectiveStatus === 'На ревью' ||
    effectiveStatus === 'Готово' ||
    effectiveStatus === 'Отклонена';

  // editable + не залочен по статусу = форма доступна
  const formEditable = editable && !lockedByStatus;

  const initialForm = useMemo<TaskPatch>(
    () =>
      task
        ? {
            name: task.name,
            description: task.description ?? '',
            hours: task.hours,
            mr: task.mr ?? '',
            workDescription: task.workDescription ?? '',
          }
        : { name: '', description: '', hours: 8, mr: '', workDescription: '' },
    [task],
  );

  const [form, setForm] = useState<TaskPatch>(initialForm);
  // Даты задачи держим отдельно: при создании их выбирает студент в
  // пределах спринта; при редактировании показываем readonly значения.
  // Бэкенд сейчас не позволяет двигать существующую задачу — так что
  // редактируются только в режиме «Новая задача» (прототип
  // student_assigned.html:316 — даты всегда readOnly после создания).
  const initialDates = useMemo(
    () => ({
      startDate: task?.startDate ?? newDraft?.startDate ?? '',
      endDate: task?.endDate ?? newDraft?.endDate ?? '',
    }),
    [task, newDraft],
  );
  const [dates, setDates] = useState(initialDates);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const closingRef = useRef(false);

  // Re-init form when открываем другой таск.
  useEffect(() => {
    if (open) {
      setForm(initialForm);
      setDates(initialDates);
      setError(null);
      closingRef.current = false;
    }
  }, [open, initialForm, initialDates]);

  if (!open) return null;

  const member = findMember(members, ownerId);
  const personLabel = member ? shortName(member) : `Участник #${ownerId}`;
  const personFull = member ? fullNameWithMiddle(member) : personLabel;
  const personInitials = member ? initials(member) : '??';

  const dateRange = task
    ? formatRuRange(task.startDate, task.endDate)
    : newDraft
      ? formatRuRange(newDraft.startDate, newDraft.endDate)
      : '';

  const update = (patch: Partial<TaskPatch>): void => setForm((prev) => ({ ...prev, ...patch }));

  const formatError = (e: unknown): string =>
    e instanceof ApiError
      ? `Ошибка ${e.status}: ${e.message}`
      : e instanceof Error
        ? e.message
        : 'Не удалось выполнить действие';

  // Закрытие с авто-сохранением (только если что-то правили).
  const handleClose = async (): Promise<void> => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (task && formEditable && callbacks.onAutoSave) {
      const dirty =
        form.name !== initialForm.name ||
        form.description !== initialForm.description ||
        form.hours !== initialForm.hours ||
        form.mr !== initialForm.mr ||
        form.workDescription !== initialForm.workDescription;
      if (dirty && form.name.trim()) {
        try {
          const changed = await callbacks.onAutoSave(task.id, {
            name: form.name.trim(),
            description: (form.description ?? '').trim() || null,
            hours: Number(form.hours) || task.hours,
            mr: (form.mr ?? '').trim() || null,
            workDescription: (form.workDescription ?? '').trim() || null,
          });
          if (changed) {
            setSavedToast(true);
            window.setTimeout(() => setSavedToast(false), 1500);
          }
        } catch (e) {
          // На закрытии ошибку можно проглотить, чтобы UI не залипал;
          // в проде будет нормальный snackbar.
          console.warn('TaskPopup auto-save failed', e);
        }
      }
    }
    onClose();
  };

  const handleSubmitReview = async (): Promise<void> => {
    if (!task || !callbacks.onSubmitForReview) return;
    if (!form.workDescription?.trim() && !form.mr?.trim()) {
      setError('Заполните описание работы или прикрепите MR перед отправкой');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Сначала сохраняем правки, потом отправляем.
      if (callbacks.onAutoSave) {
        await callbacks.onAutoSave(task.id, {
          name: form.name.trim(),
          description: (form.description ?? '').trim() || null,
          hours: Number(form.hours) || task.hours,
          mr: (form.mr ?? '').trim() || null,
          workDescription: (form.workDescription ?? '').trim() || null,
        });
      }
      await callbacks.onSubmitForReview(task.id);
      onClose();
    } catch (e) {
      setError(formatError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleCancelTask = async (): Promise<void> => {
    if (!task || !callbacks.onCancelTask) return;
    setBusy(true);
    setError(null);
    try {
      await callbacks.onCancelTask(task.id);
      onClose();
    } catch (e) {
      setError(formatError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async (): Promise<void> => {
    if (!callbacks.onCreateTask || !newDraft) return;
    if (!form.name.trim()) {
      setError('Введите название задачи');
      return;
    }
    if (!dates.startDate || !dates.endDate) {
      setError('Укажите даты задачи');
      return;
    }
    if (dates.endDate < dates.startDate) {
      setError('Дата окончания не может быть раньше начала');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await callbacks.onCreateTask({
        name: form.name.trim(),
        description: (form.description ?? '').trim() || null,
        hours: Number(form.hours) || 8,
        startDate: dates.startDate,
        endDate: dates.endDate,
        assigneeId: newDraft.assigneeId,
      });
      onClose();
    } catch (e) {
      setError(formatError(e));
    } finally {
      setBusy(false);
    }
  };

  const visual = effectiveStatus ? statusVisual(effectiveStatus) : null;
  const overdueChip = task ? wasOverdue(task, todayIso) : false;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) void handleClose();
      }}
      role="presentation"
    >
      <div
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-popup-title"
      >
        <div className={styles.header}>
          <div style={{ flex: 1 }}>
            <h3 id="task-popup-title" className={styles.title}>
              {isCreating ? 'Новая задача' : task?.name}
            </h3>
            <div className={styles.headerMeta}>
              {visual && effectiveStatus ? (
                <span
                  className={styles.statusChip}
                  style={{ background: visual.chipBg, color: visual.text }}
                >
                  {effectiveStatus}
                </span>
              ) : null}
              {overdueChip ? <span className={styles.overdueChip}>Просрочена</span> : null}
              <span className={styles.assignee} title={personFull}>
                <span
                  className={styles.avatar}
                  style={{ background: avatarColor(ownerId) }}
                  aria-hidden="true"
                >
                  {personInitials}
                </span>
                {personLabel}
              </span>
              {task?.mr ? (
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
            className={styles.closeBtn}
            onClick={() => void handleClose()}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        {formEditable ? (
          <EditableBody
            form={form}
            isCreating={isCreating}
            update={update}
            dates={dates}
            updateDates={(patch) => setDates((prev) => ({ ...prev, ...patch }))}
            sprintBounds={newDraft ?? null}
            sprintHint={sprintHint}
            mrPlaceholder="!123 или https://gitlab.com/…"
          />
        ) : (
          <ReadonlyBody task={task} dateRange={dateRange} />
        )}

        <div className={styles.actions}>
          {error ? <span className={styles.errorInline}>{error}</span> : null}
          {savedToast ? (
            <span style={{ marginRight: 'auto', fontSize: 12, color: 'var(--color-success)' }}>
              Сохранено
            </span>
          ) : null}
          {renderActionButtons({
            isCreating,
            effectiveStatus,
            formEditable,
            busy,
            onSubmitReview: handleSubmitReview,
            onCancelTask: handleCancelTask,
            onCreate: handleCreate,
          })}
        </div>
      </div>
    </div>
  );
}

interface EditableBodyProps {
  form: TaskPatch;
  isCreating: boolean;
  update: (patch: Partial<TaskPatch>) => void;
  dates: { startDate: string; endDate: string };
  updateDates: (patch: Partial<{ startDate: string; endDate: string }>) => void;
  /** Спринтовые границы (min/max). Берутся из newDraft (которое всегда
   *  содержит даты начала/конца спринта). null = редактирование задачи
   *  без сведений о спринте — даты будут readOnly. */
  sprintBounds: { startDate: string; endDate: string } | null;
  sprintHint?: { number: number; startDate: string; endDate: string };
  mrPlaceholder: string;
}

function EditableBody({
  form,
  isCreating,
  update,
  dates,
  updateDates,
  sprintBounds,
  sprintHint,
  mrPlaceholder,
}: EditableBodyProps): JSX.Element {
  // Прототип student_assigned.html:316 — у студента даты задачи нельзя
  // изменить после создания (только при «Новая задача»). Сохраняем то же
  // ограничение: показываем поля всегда, но в режиме редактирования
  // делаем их readOnly.
  const datesReadOnly = !isCreating;
  return (
    <>
      <div className={styles.field}>
        <label className={styles.label}>Название задачи *</label>
        <input
          className={styles.input}
          value={form.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Краткое название задачи"
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Описание</label>
        <textarea
          className={styles.textarea}
          value={form.description ?? ''}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Подробное описание задачи…"
        />
      </div>
      <div className={styles.gridTwo}>
        <div>
          <label className={styles.label}>Часы (план)</label>
          <input
            className={styles.input}
            type="number"
            min={1}
            max={200}
            value={form.hours}
            onChange={(e) => update({ hours: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className={styles.gridTwo}>
        <div>
          <label className={styles.label}>Дата начала</label>
          <input
            className={styles.input}
            type="date"
            value={dates.startDate}
            min={sprintBounds?.startDate}
            max={sprintBounds?.endDate}
            readOnly={datesReadOnly}
            onChange={(e) => updateDates({ startDate: e.target.value })}
          />
        </div>
        <div>
          <label className={styles.label}>Дата окончания</label>
          <input
            className={styles.input}
            type="date"
            value={dates.endDate}
            min={sprintBounds?.startDate ?? dates.startDate}
            max={sprintBounds?.endDate}
            readOnly={datesReadOnly}
            onChange={(e) => updateDates({ endDate: e.target.value })}
          />
        </div>
      </div>
      {sprintHint ? (
        <div className={styles.hint}>
          Спринт {sprintHint.number}: {formatRuLongRange(sprintHint.startDate, sprintHint.endDate)}
        </div>
      ) : null}
      {!isCreating ? (
        <>
          <div className={styles.field}>
            <label className={styles.label}>Merge Request</label>
            <input
              className={styles.input}
              value={form.mr ?? ''}
              onChange={(e) => update({ mr: e.target.value })}
              placeholder={mrPlaceholder}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Описание выполненной работы</label>
            <textarea
              className={styles.textarea}
              value={form.workDescription ?? ''}
              onChange={(e) => update({ workDescription: e.target.value })}
              placeholder="Что было сделано по задаче…"
            />
          </div>
        </>
      ) : null}
    </>
  );
}

export interface ReadonlyBodyProps {
  task: TaskDto | null;
  dateRange: string;
}

/**
 * Read-only тело попапа задачи. Экспортируется отдельно, чтобы его
 * мог переиспользовать `MentorTaskPopup` (полная карточка + actions
 * внизу) — DRY между ролями: студент видит ту же раскладку информации.
 */
export function ReadonlyBody({ task, dateRange }: ReadonlyBodyProps): JSX.Element | null {
  if (!task) return null;
  return (
    <div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Сроки</span>
        <span className={styles.rowValue}>{dateRange}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Часы</span>
        <span className={styles.rowValue}>{task.hours}ч</span>
      </div>
      <div className={styles.block}>
        <div className={styles.blockTitle}>Описание</div>
        {task.description ? (
          <div className={styles.blockText}>{task.description}</div>
        ) : (
          <div className={styles.blockEmpty}>Не заполнено</div>
        )}
      </div>
      <div className={styles.block}>
        <div className={styles.blockTitle}>Выполненная работа</div>
        {task.workDescription ? (
          <div className={styles.blockText}>{task.workDescription}</div>
        ) : (
          <div className={styles.blockEmpty}>Не заполнено</div>
        )}
      </div>
      {task.mr ? (
        <div className={styles.block}>
          <div className={styles.blockTitle}>Merge Request</div>
          <a
            href={task.mr}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 13, color: 'var(--color-accent)', fontWeight: 600 }}
          >
            {task.mr}
          </a>
        </div>
      ) : null}
      {task.mentorComments && task.mentorComments.length > 0 ? (
        <div className={styles.block}>
          <div className={styles.blockTitle}>Комментарии ментора</div>
          {task.mentorComments.map((c, idx) => (
            <div key={idx} className={styles.blockText} style={{ marginBottom: 6 }}>
              <strong style={{ display: 'block', fontSize: 11 }}>{c.action}</strong>
              {c.text}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface ActionsProps {
  isCreating: boolean;
  effectiveStatus: ReturnType<typeof calcEffectiveStatus> | null;
  formEditable: boolean;
  busy: boolean;
  onSubmitReview: () => Promise<void>;
  onCancelTask: () => Promise<void>;
  onCreate: () => Promise<void>;
}

function renderActionButtons({
  isCreating,
  effectiveStatus,
  formEditable,
  busy,
  onSubmitReview,
  onCancelTask,
  onCreate,
}: ActionsProps): JSX.Element | null {
  if (isCreating) {
    return (
      <button
        type="button"
        className={styles.btnPrimary}
        onClick={() => void onCreate()}
        disabled={busy}
      >
        {busy ? 'Создаём…' : 'Создать задачу'}
      </button>
    );
  }
  if (!formEditable) return null;
  if (effectiveStatus === 'Ожидает аппрува') {
    return (
      <button
        type="button"
        className={styles.btnDanger}
        onClick={() => void onCancelTask()}
        disabled={busy}
      >
        {busy ? 'Отменяем…' : 'Отменить задачу'}
      </button>
    );
  }
  if (
    effectiveStatus === 'В работе' ||
    effectiveStatus === 'Возвращена' ||
    effectiveStatus === 'Просрочена'
  ) {
    return (
      <button
        type="button"
        className={styles.btnReview}
        onClick={() => void onSubmitReview()}
        disabled={busy}
      >
        {busy ? 'Отправляем…' : 'Отправить на ревью'}
      </button>
    );
  }
  return null;
}
