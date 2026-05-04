/*
 * Таб «Диаграмма Ганта» страницы команды у ментора.
 *
 * Перенесено AS-IS из MentorTaskReviewPage: Гант + компактный список
 * задач к разбору + TaskActionPopup. Контекст команды (имя, шапка,
 * хлебные крошки) живёт на родительской странице, поэтому свой backLink
 * и subtitle не рисуем.
 *
 * Источник данных не меняется: useTeam → projectId → useProjectSprints
 * → useTeamGantt(teamId, sprintId). Параметр `sprintId` хранится в URL
 * рядом с `tab` чтобы при переключении табов выбранный спринт не сбрасывался.
 */

import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import {
  acceptTask,
  approveTask,
  rejectTask,
  returnTask,
  taskNeedsMentorAction,
} from '@/api/tasks';
import { pickDefaultSprint, type Sprint, type TaskDto } from '@/api/teams';
import { GanttChart } from '@/features/student-project/components/GanttChart';
import { formatISODate } from '@/features/student-project/lib/dates';
import { TaskActionPopup, type TaskActionKind } from '../components/TaskActionPopup';
import { useTeam, useProjectSprints } from '../hooks/useTeam';
import { useTeamGantt } from '../hooks/useTeamGantt';
import { actionsFor } from '../lib/taskActions';
import styles from './MentorTeamGanttTab.module.css';

interface Props {
  teamId: number;
}

export function MentorTeamGanttTab({ teamId }: Props): JSX.Element {
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
  const [popupTask, setPopupTask] = useState<TaskDto | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const todayIso = useMemo(() => formatISODate(new Date()), []);

  const refresh = (): Promise<unknown> =>
    queryClient.invalidateQueries({ queryKey: ['team', teamId, 'gantt', defaultSprintId] });

  const mutation = useMutation({
    mutationFn: async ({
      task,
      action,
      comment,
    }: {
      task: TaskDto;
      action: TaskActionKind;
      comment: string;
    }) => {
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
      setPopupTask(null);
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

  const ganttData = ganttQuery.data;
  const tasks = ganttData?.tasks ?? [];
  const filtered =
    filter === 'needs-action' ? tasks.filter((t) => taskNeedsMentorAction(t.status)) : tasks;
  const popupActions = popupTask ? actionsFor(popupTask.status).map((a) => a.kind) : [];

  const openTaskPopup = (task: TaskDto): void => {
    if (actionsFor(task.status).length === 0) return;
    setServerError(null);
    setPopupTask(task);
  };

  const sprintNumber = ganttData?.sprint.number ?? 0;
  const sprintsTotal = sprintsQuery.data?.length ?? 0;

  const setSprintId = (id: number): void => {
    const sp = new URLSearchParams(searchParams);
    sp.set('sprintId', String(id));
    setSearchParams(sp, { replace: true });
  };

  return (
    <div className={styles.tab}>
      <div className={styles.controls}>
        <SprintSwitcher
          sprints={sprintsQuery.data ?? []}
          currentId={defaultSprintId}
          onChange={setSprintId}
        />
        <FilterToggle filter={filter} onChange={setFilter} />
      </div>

      {ganttQuery.isLoading || sprintsQuery.isLoading ? (
        <div className={styles.placeholder}>Загружаем задачи…</div>
      ) : ganttQuery.error ? (
        <div className={styles.error}>
          {ganttQuery.error instanceof ApiError
            ? `Ошибка ${ganttQuery.error.status}: ${ganttQuery.error.message}`
            : 'Не удалось загрузить задачи'}
        </div>
      ) : ganttData ? (
        <>
          <GanttChart
            data={ganttData}
            todayIso={todayIso}
            currentUserId={-1}
            canEditAll={false}
            canAddTask={false}
            mode="mentor"
            onTaskClick={() => undefined}
            onTaskAction={openTaskPopup}
            onAddTask={() => undefined}
            sprintNumber={sprintNumber}
            sprintsTotal={sprintsTotal}
          />

          <section className={styles.reviewList} aria-label="Задачи к разбору">
            <div className={styles.reviewListHeader}>Задачи к разбору</div>
            {filtered.length === 0 ? (
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
                    canAct={actionsFor(task.status).length > 0}
                    onClick={() => openTaskPopup(task)}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      <TaskActionPopup
        open={popupTask != null}
        taskName={popupTask?.name ?? ''}
        actions={popupActions.length > 0 ? popupActions : ['approve']}
        isSubmitting={mutation.isPending}
        serverError={serverError}
        onClose={() => {
          if (!mutation.isPending) {
            setPopupTask(null);
            setServerError(null);
          }
        }}
        onSubmit={(action, comment) => {
          if (!popupTask) return;
          mutation.mutate({ task: popupTask, action, comment });
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
  task: TaskDto;
  busy: boolean;
  canAct: boolean;
  onClick: () => void;
}

function TaskRow({ task, busy, canAct, onClick }: RowProps): JSX.Element {
  return (
    <li
      className={`${styles.task} ${canAct ? styles.taskNeedsAction : ''}`}
      data-task-id={task.id}
    >
      <button
        type="button"
        className={styles.taskButton}
        disabled={busy || !canAct}
        onClick={onClick}
      >
        <span className={styles.taskName}>{task.name}</span>
        <span className={styles.statusTag}>{task.status}</span>
        <span className={styles.taskMeta}>
          {task.startDate} → {task.endDate} · {task.hours} ч
        </span>
      </button>
    </li>
  );
}
