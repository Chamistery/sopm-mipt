/*
 * Таб «Диаграмма Ганта» страницы команды у ментора.
 *
 * Pixel-port из mentor.html (lines 950-967): заголовок-легенда и стек
 * Гантт-блоков по всем спринтам проекта. Никаких sprint-switcher или
 * фильтров «требует действия» — клик по любой задаче открывает полный
 * `MentorTaskPopup` с действиями (approve/reject/accept/return), если
 * статус их допускает.
 *
 * Источник данных: useTeam → projectId → useProjectSprints →
 * для каждого спринта `useTeamGantt(teamId, sprintId)`. Сейчас рендерим
 * текущий + завершённые спринты в обратной хронологии.
 */

import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { acceptTask, approveTask, rejectTask, returnTask } from '@/api/tasks';
import type { Sprint, TaskDto } from '@/api/teams';
import { GanttChart } from '@/features/student-project/components/GanttChart';
import { formatISODate } from '@/features/student-project/lib/dates';
import { MentorTaskPopup } from '../components/MentorTaskPopup';
import type { TaskActionKind } from '../components/TaskActionPopup';
import { useTeam, useProjectSprints } from '../hooks/useTeam';
import { useTeamGantt } from '../hooks/useTeamGantt';
import styles from './MentorTeamGanttTab.module.css';

interface Props {
  teamId: number;
}

export function MentorTeamGanttTab({ teamId }: Props): JSX.Element {
  const queryClient = useQueryClient();

  const teamQuery = useTeam(teamId);
  const projectId = teamQuery.data?.projectId ?? null;
  const sprintsQuery = useProjectSprints(projectId);

  const [popupTask, setPopupTask] = useState<TaskDto | null>(null);
  const [popupSprintId, setPopupSprintId] = useState<number | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const todayIso = useMemo(() => formatISODate(new Date()), []);

  // Сортировка как в прототипе: текущий спринт сверху, потом по убыванию
  // номера (Спринт 2 → Спринт 1).
  const orderedSprints = useMemo<Sprint[]>(() => {
    const list = (sprintsQuery.data ?? []).slice();
    list.sort((a, b) => {
      if (a.status === 'Активный' && b.status !== 'Активный') return -1;
      if (b.status === 'Активный' && a.status !== 'Активный') return 1;
      return b.number - a.number;
    });
    return list;
  }, [sprintsQuery.data]);

  const refresh = (sprintId: number | null): Promise<unknown> =>
    queryClient.invalidateQueries({ queryKey: ['team', teamId, 'gantt', sprintId] });

  const mutation = useMutation({
    mutationFn: async ({
      task,
      action,
      comment,
    }: {
      task: TaskDto;
      action: TaskActionKind;
      comment: string;
      sprintId: number | null;
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
    onSuccess: async (_data, vars) => {
      setServerError(null);
      setPopupTask(null);
      setPopupSprintId(null);
      await refresh(vars.sprintId);
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

  const openTaskPopup = (task: TaskDto, sprintId: number): void => {
    setServerError(null);
    setPopupTask(task);
    setPopupSprintId(sprintId);
  };

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
  if (orderedSprints.length === 0) {
    return <div className={styles.empty}>В проекте пока нет спринтов.</div>;
  }

  return (
    <div className={styles.tab}>
      {/* Легенда рендерится прямо внутри GanttChart (см. lines 952-963 prototype) */}
      {orderedSprints.map((sprint, idx) => (
        <SprintGantt
          key={sprint.id}
          teamId={teamId}
          sprint={sprint}
          sprintsTotal={orderedSprints.length}
          showLegend={idx === 0}
          todayIso={todayIso}
          onTaskClick={(task) => openTaskPopup(task, sprint.id)}
        />
      ))}

      <PopupHost
        teamId={teamId}
        sprintId={popupSprintId}
        task={popupTask}
        todayIso={todayIso}
        isSubmitting={mutation.isPending}
        serverError={serverError}
        onClose={() => {
          if (!mutation.isPending) {
            setPopupTask(null);
            setPopupSprintId(null);
            setServerError(null);
          }
        }}
        onSubmit={(action, comment) => {
          if (!popupTask) return;
          mutation.mutate({
            task: popupTask,
            action,
            comment,
            sprintId: popupSprintId,
          });
        }}
      />
    </div>
  );
}

interface PopupHostProps {
  teamId: number;
  sprintId: number | null;
  task: TaskDto | null;
  todayIso: string;
  isSubmitting: boolean;
  serverError: string | null;
  onClose: () => void;
  onSubmit: (action: TaskActionKind, comment: string) => void;
}

/**
 * Подкачивает members конкретного спринта через `useTeamGantt`. Для
 * закрытого попапа не дёргает сеть (sprintId=null → useTeamGantt
 * возвращает пустой результат).
 */
function PopupHost({
  teamId,
  sprintId,
  task,
  todayIso,
  isSubmitting,
  serverError,
  onClose,
  onSubmit,
}: PopupHostProps): JSX.Element {
  const ganttQuery = useTeamGantt(teamId, sprintId);
  return (
    <MentorTaskPopup
      open={task != null && sprintId != null}
      task={task}
      members={ganttQuery.data?.members ?? []}
      todayIso={todayIso}
      isSubmitting={isSubmitting}
      serverError={serverError}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

interface SprintGanttProps {
  teamId: number;
  sprint: Sprint;
  sprintsTotal: number;
  showLegend: boolean;
  todayIso: string;
  onTaskClick: (task: TaskDto) => void;
}

function SprintGantt({
  teamId,
  sprint,
  sprintsTotal,
  showLegend,
  todayIso,
  onTaskClick,
}: SprintGanttProps): JSX.Element {
  const ganttQuery = useTeamGantt(teamId, sprint.id);

  if (ganttQuery.isLoading) {
    return <div className={styles.placeholder}>Загружаем задачи спринта {sprint.number}…</div>;
  }
  if (ganttQuery.error) {
    return (
      <div className={styles.error}>
        {ganttQuery.error instanceof ApiError
          ? `Ошибка ${ganttQuery.error.status}: ${ganttQuery.error.message}`
          : `Не удалось загрузить задачи спринта ${sprint.number}`}
      </div>
    );
  }
  if (!ganttQuery.data) return <></>;

  return (
    <GanttChart
      data={ganttQuery.data}
      todayIso={todayIso}
      currentUserId={-1}
      canEditAll={false}
      canAddTask={false}
      mode="mentor"
      onTaskClick={onTaskClick}
      onAddTask={() => undefined}
      sprintNumber={sprint.number}
      sprintsTotal={sprintsTotal}
      showLegend={showLegend}
    />
  );
}
