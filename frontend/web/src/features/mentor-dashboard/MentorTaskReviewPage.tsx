import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import {
  acceptTask,
  approveTask,
  rejectTask,
  returnTask,
  taskNeedsMentorAction,
  type Task,
} from '@/api/tasks';
import { pickDefaultSprint, type Sprint } from '@/api/teams';
import { TaskActionPopup, type TaskActionKind } from './components/TaskActionPopup';
import { useTeam, useProjectSprints } from './hooks/useTeam';
import { useTeamGantt } from './hooks/useTeamGantt';
import { actionsFor } from './lib/taskActions';
import styles from './MentorTaskReviewPage.module.css';

/**
 * Mentor's task-review screen. Reuses the team's gantt aggregate to show
 * tasks for a sprint and surfaces the four moderation actions:
 *   - "Ожидает аппрува" → approve / reject
 *   - "На ревью"        → accept / return
 * Negative actions require a comment (validated in TaskActionPopup).
 *
 * The full visual gantt with bars is intentionally *not* rebuilt here:
 * the brief allows a "minimum viable" task table for the mentor view.
 */
export function MentorTaskReviewPage(): JSX.Element {
  const params = useParams<{ teamId: string }>();
  const teamId = Number.parseInt(params.teamId ?? '', 10);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const teamQuery = useTeam(teamId);
  const projectId = teamQuery.data?.projectId ?? null;
  const sprintsQuery = useProjectSprints(projectId);

  const sprintParam = Number.parseInt(searchParams.get('sprintId') ?? '', 10);
  const defaultSprintId = useMemo(() => {
    if (Number.isFinite(sprintParam) && sprintParam > 0) return sprintParam;
    return pickDefaultSprint(sprintsQuery.data ?? [])?.id ?? null;
  }, [sprintParam, sprintsQuery.data]);

  const ganttQuery = useTeamGantt(teamId, defaultSprintId);

  const [filter, setFilter] = useState<'all' | 'needs-action'>('needs-action');
  const [popup, setPopup] = useState<{ task: Task; action: TaskActionKind } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const refresh = (): Promise<unknown> =>
    queryClient.invalidateQueries({ queryKey: ['team', teamId, 'gantt', defaultSprintId] });

  const mutation = useMutation({
    mutationFn: async ({ task, action, comment }: { task: Task; action: TaskActionKind; comment: string }) => {
      switch (action) {
        case 'approve':
          return approveTask(task.id, comment || undefined);
        case 'reject':
          return rejectTask(task.id, comment);
        case 'accept':
          return acceptTask(task.id, comment || undefined);
        case 'return':
          return returnTask(task.id, comment);
      }
    },
    onSuccess: async () => {
      setServerError(null);
      setPopup(null);
      await refresh();
    },
    onError: (err: unknown) => {
      setServerError(
        err instanceof ApiError
          ? `Ошибка ${err.status}: ${err.message}`
          : err instanceof Error
            ? err.message
            : 'Не удалось обновить задачу',
      );
    },
  });

  if (!Number.isFinite(teamId) || teamId <= 0) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>Некорректный идентификатор команды</div>
      </div>
    );
  }

  const tasks = ganttQuery.data?.tasks ?? [];
  const filtered = filter === 'needs-action' ? tasks.filter((t) => taskNeedsMentorAction(t.status)) : tasks;

  return (
    <div className={styles.page}>
      <Link to="/mentor" className={styles.back}>
        ← К списку проектов
      </Link>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Задачи команды</h1>
          {teamQuery.data ? <div className={styles.subtitle}>{teamQuery.data.name}</div> : null}
        </div>
        <div className={styles.headerControls}>
          <SprintSwitcher
            sprints={sprintsQuery.data ?? []}
            currentId={defaultSprintId}
            onChange={(id) => {
              setSearchParams({ sprintId: String(id) });
            }}
          />
          <FilterToggle filter={filter} onChange={setFilter} />
        </div>
      </header>

      {ganttQuery.isLoading || sprintsQuery.isLoading ? (
        <div className={styles.placeholder}>Загружаем задачи…</div>
      ) : ganttQuery.error ? (
        <div className={styles.error}>
          {ganttQuery.error instanceof ApiError
            ? `Ошибка ${ganttQuery.error.status}: ${ganttQuery.error.message}`
            : 'Не удалось загрузить задачи'}
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          {filter === 'needs-action'
            ? 'Нет задач, требующих действия. Покажите все, чтобы посмотреть остальные.'
            : 'В этом спринте задач нет.'}
        </div>
      ) : (
        <ul className={styles.taskList}>
          {filtered.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              busy={mutation.isPending}
              onAction={(action) => {
                setServerError(null);
                setPopup({ task, action });
              }}
            />
          ))}
        </ul>
      )}

      <TaskActionPopup
        open={popup != null}
        taskName={popup?.task.name ?? ''}
        action={popup?.action ?? 'approve'}
        isSubmitting={mutation.isPending}
        serverError={serverError}
        onClose={() => {
          if (!mutation.isPending) {
            setPopup(null);
            setServerError(null);
          }
        }}
        onSubmit={(comment) => {
          if (!popup) return;
          mutation.mutate({ task: popup.task, action: popup.action, comment });
        }}
      />
    </div>
  );
}

interface SprintSwitcherProps {
  sprints: Sprint[];
  currentId: number | null;
  onChange: (id: number) => void;
}

function SprintSwitcher({ sprints, currentId, onChange }: SprintSwitcherProps): JSX.Element | null {
  if (sprints.length === 0) return null;
  return (
    <label className={styles.sprintPick}>
      <span className={styles.controlLabel}>Спринт</span>
      <select
        className={styles.select}
        value={currentId ?? ''}
        onChange={(e) => onChange(Number.parseInt(e.target.value, 10))}
      >
        {sprints
          .slice()
          .sort((a, b) => a.number - b.number)
          .map((s) => (
            <option key={s.id} value={s.id}>
              Спринт {s.number} · {s.status}
            </option>
          ))}
      </select>
    </label>
  );
}

interface FilterToggleProps {
  filter: 'all' | 'needs-action';
  onChange: (next: 'all' | 'needs-action') => void;
}

function FilterToggle({ filter, onChange }: FilterToggleProps): JSX.Element {
  return (
    <div className={styles.toggle} role="group" aria-label="Фильтр задач">
      <button
        type="button"
        className={filter === 'needs-action' ? styles.toggleActive : styles.toggleBtn}
        onClick={() => onChange('needs-action')}
      >
        Требует действия
      </button>
      <button
        type="button"
        className={filter === 'all' ? styles.toggleActive : styles.toggleBtn}
        onClick={() => onChange('all')}
      >
        Все задачи
      </button>
    </div>
  );
}

interface RowProps {
  task: Task;
  busy: boolean;
  onAction: (action: TaskActionKind) => void;
}

function TaskRow({ task, busy, onAction }: RowProps): JSX.Element {
  const actions = actionsFor(task.status);

  return (
    <li className={`${styles.task} ${actions.length > 0 ? styles.taskNeedsAction : ''}`}>
      <div className={styles.taskMain}>
        <div className={styles.taskHead}>
          <span className={styles.taskName}>{task.name}</span>
          <span className={styles.statusTag}>{task.status}</span>
        </div>
        <div className={styles.taskMeta}>
          <span>Исполнитель: {task.assigneeName || `#${task.assigneeId}`}</span>
          <span>
            {task.startDate} → {task.endDate}
          </span>
          <span>{task.hoursEstimate} ч</span>
        </div>
        {task.workDescription ? (
          <p className={styles.workDescription}>{task.workDescription}</p>
        ) : null}
        {task.mrLink ? (
          <a className={styles.mrLink} href={task.mrLink} target="_blank" rel="noreferrer">
            MR / результат →
          </a>
        ) : null}
      </div>

      {actions.length > 0 ? (
        <div className={styles.taskActions}>
          {actions.map((a) => (
            <button
              key={a.kind}
              type="button"
              className={a.kind === 'reject' || a.kind === 'return' ? styles.btnDanger : styles.btnPrimary}
              disabled={busy}
              onClick={() => onAction(a.kind)}
            >
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
    </li>
  );
}

