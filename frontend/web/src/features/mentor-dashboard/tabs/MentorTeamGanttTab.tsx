/*
 * Таб «Диаграмма Ганта» страницы команды у ментора.
 *
 * Layout: над диаграммой — легенда (как в прототипе mentor.html:952-963)
 * слева и SprintSwitcher (выпадающий список выбора спринта) справа.
 * Активный спринт по умолчанию; выбор сохраняется в URL `?sprintId=`.
 *
 * Источник данных: useTeam → projectId → useProjectSprints; данные одного
 * спринта подгружаются `useTeamGantt(teamId, sprintId)`.
 */

import type { ChangeEvent, JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { acceptTask, approveTask, rejectTask, returnTask } from '@/api/tasks';
import type { Sprint, TaskDto } from '@/api/teams';
import { GanttChart } from '@/features/student-project/components/GanttChart';
import { GanttLegend } from '@/features/student-project/components/GanttLegend';
import { formatISODate, formatRuRange } from '@/features/student-project/lib/dates';
import { MentorTaskPopup } from '../components/MentorTaskPopup';
import type { TaskActionKind } from '../components/TaskActionPopup';
import { useTeam, useProjectSprints } from '../hooks/useTeam';
import { useTeamGantt } from '../hooks/useTeamGantt';
import styles from './MentorTeamGanttTab.module.css';

interface Props {
  teamId: number;
  /**
   * mode='coordinator' — режим только-чтения. Клик по задаче открывает
   * попап с информацией, но без кнопок approve/reject/accept/return.
   * task-flow остаётся за ментором/тимлидом.
   */
  mode?: 'mentor' | 'coordinator';
}

export function MentorTeamGanttTab({ teamId, mode = 'mentor' }: Props): JSX.Element {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const teamQuery = useTeam(teamId);
  const projectId = teamQuery.data?.projectId ?? null;
  const sprintsQuery = useProjectSprints(projectId);

  const todayIso = useMemo(() => formatISODate(new Date()), []);

  const sprints = sprintsQuery.data ?? [];
  const defaultSprintId = useMemo(() => pickDefaultSprintId(sprints), [sprints]);
  const sprintParam = Number.parseInt(searchParams.get('sprintId') ?? '', 10);
  const selectedSprintId =
    Number.isFinite(sprintParam) && sprints.some((s) => s.id === sprintParam)
      ? sprintParam
      : defaultSprintId;

  // Если в URL пришёл невалидный sprintId — нормализуем тихо при первом
  // монтировании, чтобы был bookmark-friendly URL.
  useEffect(() => {
    if (selectedSprintId == null) return;
    if (sprintParam !== selectedSprintId && searchParams.get('sprintId') == null) {
      const sp = new URLSearchParams(searchParams);
      sp.set('sprintId', String(selectedSprintId));
      setSearchParams(sp, { replace: true });
    }
  }, [selectedSprintId, sprintParam, searchParams, setSearchParams]);

  const setSprintId = (id: number): void => {
    const sp = new URLSearchParams(searchParams);
    sp.set('sprintId', String(id));
    setSearchParams(sp, { replace: true });
  };

  const ganttQuery = useTeamGantt(teamId, selectedSprintId);

  const [popupTask, setPopupTask] = useState<TaskDto | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const refresh = (): Promise<unknown> =>
    queryClient.invalidateQueries({ queryKey: ['team', teamId, 'gantt', selectedSprintId] });

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

  if (sprintsQuery.isLoading) {
    return <div className={styles.placeholder}>Загружаем спринты…</div>;
  }
  if (sprintsQuery.error) {
    return (
      <div className={styles.error}>
        {sprintsQuery.error instanceof ApiError
          ? `Ошибка ${sprintsQuery.error.status}: ${sprintsQuery.error.message}`
          : 'Не удалось загрузить спринты'}
      </div>
    );
  }
  if (sprints.length === 0) {
    return <div className={styles.empty}>В проекте пока нет спринтов.</div>;
  }

  const selectedSprint = sprints.find((s) => s.id === selectedSprintId) ?? null;

  return (
    <div className={styles.tab}>
      <div className={styles.controls}>
        <GanttLegend className={styles.legendInControls} />
        <SprintSwitcher
          sprints={sprints}
          selectedId={selectedSprintId}
          onChange={setSprintId}
        />
      </div>

      {ganttQuery.isLoading ? (
        <div className={styles.placeholder}>Загружаем задачи…</div>
      ) : ganttQuery.error ? (
        <div className={styles.error}>
          {ganttQuery.error instanceof ApiError
            ? `Ошибка ${ganttQuery.error.status}: ${ganttQuery.error.message}`
            : 'Не удалось загрузить задачи'}
        </div>
      ) : ganttQuery.data && selectedSprint ? (
        <GanttChart
          data={ganttQuery.data}
          todayIso={todayIso}
          currentUserId={-1}
          canEditAll={false}
          canAddTask={false}
          mode="mentor"
          onTaskClick={(task) => {
            setServerError(null);
            setPopupTask(task);
          }}
          onAddTask={() => undefined}
          sprintNumber={selectedSprint.number}
          sprintsTotal={sprints.length}
          showLegend={false}
        />
      ) : null}

      <MentorTaskPopup
        open={popupTask != null}
        task={popupTask}
        members={ganttQuery.data?.members ?? []}
        todayIso={todayIso}
        isSubmitting={mutation.isPending}
        serverError={serverError}
        readOnly={mode === 'coordinator'}
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
  selectedId: number | null;
  onChange: (id: number) => void;
}

function SprintSwitcher({ sprints, selectedId, onChange }: SprintSwitcherProps): JSX.Element {
  const handle = (e: ChangeEvent<HTMLSelectElement>): void => {
    const id = Number.parseInt(e.target.value, 10);
    if (Number.isFinite(id)) onChange(id);
  };
  return (
    <label className={styles.switcher}>
      <span className={styles.switcherLabel}>Спринт:</span>
      <select
        className={styles.switcherSelect}
        value={selectedId ?? ''}
        onChange={handle}
      >
        {sprints.map((s) => (
          <option key={s.id} value={s.id}>
            Спринт {s.number} · {formatRuRange(s.startDate, s.endDate)} · {s.status}
          </option>
        ))}
      </select>
    </label>
  );
}

function pickDefaultSprintId(sprints: Sprint[]): number | null {
  if (sprints.length === 0) return null;
  const active = sprints.find((s) => s.status === 'Активный');
  if (active) return active.id;
  // fallback: последний завершённый или первый
  const finished = [...sprints].reverse().find((s) => s.status === 'Завершён');
  return (finished ?? sprints[0])?.id ?? null;
}
