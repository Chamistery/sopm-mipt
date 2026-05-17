/*
 * StudentProjectPage — страница «Текущий проект» распределённого
 * студента / тимлида. Структурно повторяет MentorTeamPage:
 *   header (название команды + проект)
 *   members-card
 *   tabs (Диаграмма Ганта / Отчёты по спринтам / Встречи)
 *
 * Гант-таб использует тот же layout, что у ментора (controls с легендой
 * слева и SprintSwitcher справа, потом GanttChart с showLegend={false}),
 * чтобы оба экрана выглядели идентично.
 *
 * Отличия от ментора:
 * - студент видит ровно одну свою команду (без хлебных крошек)
 * - студент может править свои задачи и нажимать «Добавить задачу» в
 *   активном спринте; на завершённых и будущих спринтах — только
 *   просмотр.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { Sprint, TaskDto, TeamContextDto } from '@/api/teams';
import { ApiError } from '@/api/client';
import { useRequireUser } from '@/auth/useCurrentUser';
import { ROLE_LABELS_RU } from '@/auth/roles';
import { RequiresAttention } from '@/_shared/RequiresAttention';
import { GanttChart } from './components/GanttChart';
import { GanttLegend } from './components/GanttLegend';
import { SprintSwitcher } from './components/SprintSwitcher';
import { pickDefaultSprintId } from './lib/sprintSelection';
import { TaskPopup, type CreateTaskInput, type NewTaskDraft, type TaskPatch } from './components/TaskPopup';
import { PersonalReports } from './components/PersonalReports';
import { TeamReportCard } from './components/TeamReportCard';
import { useTeamContext } from './hooks/useTeamContext';
import { useGantt } from './hooks/useGantt';
import { useProjectSprints } from './hooks/useProjectSprints';
import {
  useCreateTask,
  useDeleteTask,
  useSubmitTaskForReview,
  useUpdateTask,
} from './hooks/useTaskMutations';
import { useSaveTeamReport, useTeamReport } from './hooks/useTeamReport';
import { avatarColor, fullNameWithMiddle, initials, shortName } from './lib/people';
import { formatISODate } from './lib/dates';
import styles from './StudentProjectPage.module.css';

type TabKey = 'gantt' | 'reports' | 'meetings';
const TAB_KEYS: TabKey[] = ['gantt', 'reports', 'meetings'];

export function StudentProjectPage(): JSX.Element {
  const me = useRequireUser();
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupTask, setPopupTask] = useState<TaskDto | null>(null);
  const [popupDraft, setPopupDraft] = useState<NewTaskDraft | null>(null);

  const teamQuery = useTeamContext(me.userId);

  if (teamQuery.isLoading) {
    return <div className={styles.placeholder}>Загружаем проект…</div>;
  }
  if (teamQuery.error) {
    const err = teamQuery.error as unknown;
    if (err instanceof ApiError && err.status === 404) {
      return (
        <div className={styles.empty}>
          Вы пока не распределены в проект. Выберите проект из каталога — после
          подачи и одобрения заявки страница откроется автоматически.
        </div>
      );
    }
    const msg =
      err instanceof ApiError ? `Ошибка ${err.status}: ${err.message}` : 'Не удалось загрузить проект.';
    return <div className={styles.error}>{msg}</div>;
  }

  const team = teamQuery.data;
  if (!team) return <div className={styles.placeholder}>Загружаем проект…</div>;

  return (
    <Loaded
      team={team}
      currentUserId={me.userId}
      popupOpen={popupOpen}
      popupTask={popupTask}
      popupDraft={popupDraft}
      openPopup={(t, d) => {
        setPopupTask(t);
        setPopupDraft(d);
        setPopupOpen(true);
      }}
      closePopup={() => {
        setPopupOpen(false);
        setPopupTask(null);
        setPopupDraft(null);
      }}
    />
  );
}

interface LoadedProps {
  team: TeamContextDto;
  currentUserId: number;
  popupOpen: boolean;
  popupTask: TaskDto | null;
  popupDraft: NewTaskDraft | null;
  openPopup: (task: TaskDto | null, draft: NewTaskDraft | null) => void;
  closePopup: () => void;
}

function Loaded({
  team,
  currentUserId,
  popupOpen,
  popupTask,
  popupDraft,
  openPopup,
  closePopup,
}: LoadedProps): JSX.Element {
  const { teamId, projectId, projectTitle, teamName, currentSprint, members, mentor, initiator } = team;
  const [searchParams, setSearchParams] = useSearchParams();

  const tabRaw = searchParams.get('tab');
  const tab: TabKey = TAB_KEYS.includes(tabRaw as TabKey) ? (tabRaw as TabKey) : 'gantt';
  const setTab = (next: TabKey): void => {
    const sp = new URLSearchParams(searchParams);
    sp.set('tab', next);
    setSearchParams(sp, { replace: true });
  };

  const sprintsQuery = useProjectSprints(projectId);
  const fallbackSprint = useMemo<Sprint>(
    () => ({
      id: currentSprint.id,
      projectId,
      number: currentSprint.number,
      startDate: currentSprint.startDate,
      endDate: currentSprint.endDate,
      status: currentSprint.status,
    }),
    [currentSprint, projectId],
  );
  // Пока /sprints не загрузились (или вернули пустой массив на ранних
  // этапах проекта), показываем хотя бы текущий спринт в дропдауне —
  // нужный для корректного onChange и pickDefault'а.
  const sprintsList = useMemo<Sprint[]>(
    () => (sprintsQuery.data && sprintsQuery.data.length > 0 ? sprintsQuery.data : [fallbackSprint]),
    [sprintsQuery.data, fallbackSprint],
  );

  const defaultSprintId = useMemo(() => pickDefaultSprintId(sprintsList) ?? currentSprint.id, [
    sprintsList,
    currentSprint.id,
  ]);
  const sprintParam = Number.parseInt(searchParams.get('sprintId') ?? '', 10);
  const selectedSprintId =
    Number.isFinite(sprintParam) && sprintsList.some((s) => s.id === sprintParam)
      ? sprintParam
      : defaultSprintId;

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

  const selectedSprint =
    sprintsList.find((s) => s.id === selectedSprintId) ?? fallbackSprint;
  const isActiveSprint = selectedSprint.status === 'Активный';

  const ganttQuery = useGantt(teamId, selectedSprint.id);
  const teamReportQuery = useTeamReport(teamId, selectedSprint.id);

  // Дата «сегодня» — фиксируем в локальной таймзоне, чтобы Гант стабильно
  // подсвечивал текущий день между ререндерами.
  const todayIso = useMemo(() => formatISODate(new Date()), []);

  const me = members.find((m) => m.userId === currentUserId);
  const isLeader = me?.isLeader === true;
  const isTeamlead = me?.role === 'teamlead' || isLeader;

  const updateTask = useUpdateTask({ teamId, sprintId: selectedSprint.id });
  const submitForReview = useSubmitTaskForReview({ teamId, sprintId: selectedSprint.id });
  const deleteTask = useDeleteTask({ teamId, sprintId: selectedSprint.id });
  const createTask = useCreateTask({ teamId, sprintId: selectedSprint.id });
  const saveTeamReport = useSaveTeamReport(teamId, selectedSprint.id);

  const handleAutoSave = async (id: number, patch: TaskPatch): Promise<boolean> => {
    await updateTask.mutateAsync({
      id,
      payload: {
        name: patch.name,
        description: patch.description,
        hours: patch.hours,
        mr: patch.mr,
        workDescription: patch.workDescription,
      },
    });
    return true;
  };

  const handleSubmitReview = async (id: number): Promise<void> => {
    await submitForReview.mutateAsync(id);
  };

  const handleCancelTask = async (id: number): Promise<void> => {
    await deleteTask.mutateAsync(id);
  };

  const handleCreateTask = async (payload: CreateTaskInput): Promise<void> => {
    await createTask.mutateAsync({
      teamId,
      sprintId: selectedSprint.id,
      assigneeId: payload.assigneeId,
      name: payload.name,
      description: payload.description,
      hours: payload.hours,
      startDate: payload.startDate,
      endDate: payload.endDate,
    });
  };

  const onAddTask = (): void => {
    openPopup(null, {
      assigneeId: currentUserId,
      startDate: selectedSprint.startDate,
      endDate: selectedSprint.endDate,
    });
  };

  const tasksInSprint = ganttQuery.data?.tasks ?? [];

  return (
    <div className={styles.page}>
      <RequiresAttention />

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{teamName}</h1>
          <div className={styles.subtitle}>
            {projectTitle}
            {mentor
              ? ` · Ментор: ${fullNameWithMiddle({ ...mentor, middleName: mentor.middleName ?? null })}`
              : ''}
            {initiator ? ` · Инициатор: ${initiator}` : ''}
          </div>
        </div>
      </header>

      <section className={styles.membersCard} aria-label="Состав команды">
        <div className={styles.membersGrid}>
          {members.map((m) => (
            <div key={m.userId} className={styles.memberChip}>
              <div className={styles.memberAvatar} style={{ background: avatarColor(m.userId) }}>
                {initials(m)}
              </div>
              <div className={styles.memberInfo}>
                <div className={styles.memberName}>
                  <span>{shortName(m)}</span>
                  {m.isLeader ? <span className={styles.badgeLeader}>Лидер</span> : null}
                  {m.userId === currentUserId ? <span className={styles.badgeYou}>Вы</span> : null}
                </div>
                <div className={styles.memberRoleLine}>
                  {m.projectRole ?? ROLE_LABELS_RU[m.role]}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <nav className={styles.tabs} role="tablist" aria-label="Разделы команды">
        <Tab active={tab === 'gantt'} label="Диаграмма Ганта" onClick={() => setTab('gantt')} />
        <Tab active={tab === 'reports'} label="Отчёты по спринтам" onClick={() => setTab('reports')} />
        <Tab active={tab === 'meetings'} label="Встречи" onClick={() => setTab('meetings')} />
      </nav>

      <div className={styles.tabContent}>
        {tab === 'gantt' ? (
          <div className={styles.gantt}>
            <div className={styles.controls}>
              <GanttLegend className={styles.legendInControls} />
              <div className={styles.controlsRight}>
                <SprintSwitcher
                  sprints={sprintsList}
                  selectedId={selectedSprintId}
                  onChange={setSprintId}
                />
                {isActiveSprint ? (
                  <button type="button" className={styles.addBtn} onClick={onAddTask}>
                    + Добавить задачу
                  </button>
                ) : null}
              </div>
            </div>

            {ganttQuery.isLoading ? (
              <div className={styles.placeholder}>Загружаем задачи…</div>
            ) : ganttQuery.error ? (
              <div className={styles.error}>
                {ganttQuery.error instanceof ApiError
                  ? `Ошибка ${ganttQuery.error.status}: ${ganttQuery.error.message}`
                  : 'Не удалось загрузить задачи'}
              </div>
            ) : ganttQuery.data ? (
              <GanttChart
                data={ganttQuery.data}
                todayIso={todayIso}
                currentUserId={currentUserId}
                canEditAll={isTeamlead && isActiveSprint}
                canAddTask={false}
                mode={isActiveSprint ? 'student' : 'mentor'}
                onTaskClick={(t) => openPopup(t, null)}
                onAddTask={onAddTask}
                sprintNumber={selectedSprint.number}
                showLegend={false}
              />
            ) : null}
          </div>
        ) : null}

        {tab === 'reports' ? (
          <ReportsTab
            isTeamlead={isTeamlead}
            members={members}
            tasks={tasksInSprint}
            currentUserId={currentUserId}
            sprint={selectedSprint}
            todayIso={todayIso}
            onTaskClick={(t) => openPopup(t, null)}
            teamReport={teamReportQuery.data ?? null}
            teamReportLoading={teamReportQuery.isLoading}
            onSaveTeamReport={async (args) => {
              await saveTeamReport.mutateAsync({
                current: teamReportQuery.data ?? null,
                summary: args.summary,
                problems: args.problems,
                nextPlan: args.nextPlan,
                ...(args.status ? { status: args.status } : {}),
              });
            }}
          />
        ) : null}

        {tab === 'meetings' ? (
          <div className={styles.empty}>Раздел «Встречи» появится в следующем PR'е.</div>
        ) : null}
      </div>

      <TaskPopup
        open={popupOpen}
        task={popupTask}
        newDraft={popupDraft ?? undefined}
        members={members}
        currentUserId={currentUserId}
        canEditAll={isTeamlead && isActiveSprint}
        todayIso={todayIso}
        sprintHint={{
          number: selectedSprint.number,
          startDate: selectedSprint.startDate,
          endDate: selectedSprint.endDate,
        }}
        callbacks={{
          onAutoSave: handleAutoSave,
          onSubmitForReview: handleSubmitReview,
          onCancelTask: handleCancelTask,
          onCreateTask: handleCreateTask,
        }}
        onClose={closePopup}
      />
    </div>
  );
}

interface TabProps {
  active: boolean;
  label: string;
  onClick: () => void;
}

function Tab({ active, label, onClick }: TabProps): JSX.Element {
  return (
    <button
      type="button"
      className={`${styles.tab} ${active ? styles.tabActive : ''}`}
      onClick={onClick}
      role="tab"
      aria-selected={active}
    >
      {label}
    </button>
  );
}

interface ReportsTabProps {
  isTeamlead: boolean;
  members: TeamContextDto['members'];
  tasks: TaskDto[];
  currentUserId: number;
  sprint: Sprint;
  todayIso: string;
  onTaskClick: (t: TaskDto) => void;
  teamReport: Parameters<typeof TeamReportCard>[0]['report'];
  teamReportLoading: boolean;
  onSaveTeamReport: Parameters<typeof TeamReportCard>[0]['onSave'];
}

function ReportsTab({
  isTeamlead,
  members,
  tasks,
  currentUserId,
  sprint,
  todayIso,
  onTaskClick,
  teamReport,
  teamReportLoading,
  onSaveTeamReport,
}: ReportsTabProps): JSX.Element {
  return (
    <>
      {isTeamlead ? (
        teamReportLoading ? (
          <div className={styles.placeholder}>Загружаем командный отчёт…</div>
        ) : (
          <TeamReportCard
            report={teamReport}
            sprintNumber={sprint.number}
            sprintStartDate={sprint.startDate}
            sprintEndDate={sprint.endDate}
            onSave={onSaveTeamReport}
          />
        )
      ) : null}

      <PersonalReports
        members={members}
        tasks={tasks}
        currentUserId={currentUserId}
        sprintNumber={sprint.number}
        sprintStartDate={sprint.startDate}
        sprintEndDate={sprint.endDate}
        todayIso={todayIso}
        onTaskClick={onTaskClick}
      />
    </>
  );
}
