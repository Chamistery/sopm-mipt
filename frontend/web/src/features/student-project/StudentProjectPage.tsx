import { useMemo, useState } from 'react';

import type { TaskDto, TeamContextDto } from '@/api/teams';
import { ApiError } from '@/api/client';
import { useRequireUser } from '@/auth/useCurrentUser';
import { ROLE_LABELS_RU } from '@/auth/roles';
import { GanttChart } from './components/GanttChart';
import { TaskPopup, type CreateTaskInput, type NewTaskDraft, type TaskPatch } from './components/TaskPopup';
import { PersonalReports } from './components/PersonalReports';
import { TeamReportCard } from './components/TeamReportCard';
import { useTeamContext } from './hooks/useTeamContext';
import { useGantt } from './hooks/useGantt';
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

export function StudentProjectPage(): JSX.Element {
  const me = useRequireUser();
  const [tab, setTab] = useState<TabKey>('gantt');
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
      tab={tab}
      onTabChange={setTab}
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
  tab: TabKey;
  onTabChange: (t: TabKey) => void;
  popupOpen: boolean;
  popupTask: TaskDto | null;
  popupDraft: NewTaskDraft | null;
  openPopup: (task: TaskDto | null, draft: NewTaskDraft | null) => void;
  closePopup: () => void;
}

function Loaded({
  team,
  currentUserId,
  tab,
  onTabChange,
  popupOpen,
  popupTask,
  popupDraft,
  openPopup,
  closePopup,
}: LoadedProps): JSX.Element {
  const { teamId, projectTitle, teamName, currentSprint, sprintsTotal, members, mentor, initiator } = team;

  const ganttQuery = useGantt(teamId, currentSprint.id);
  const teamReportQuery = useTeamReport(teamId, currentSprint.id);

  // Дата «сегодня» — фиксируем в локальной таймзоне, чтобы Гант стабильно
  // подсвечивал текущий день между ререндерами.
  const todayIso = useMemo(() => formatISODate(new Date()), []);

  const me = members.find((m) => m.userId === currentUserId);
  const isLeader = me?.isLeader === true;
  const isTeamlead = me?.role === 'teamlead' || isLeader;

  const updateTask = useUpdateTask({ teamId, sprintId: currentSprint.id });
  const submitForReview = useSubmitTaskForReview({ teamId, sprintId: currentSprint.id });
  const deleteTask = useDeleteTask({ teamId, sprintId: currentSprint.id });
  const createTask = useCreateTask({ teamId, sprintId: currentSprint.id });
  const saveTeamReport = useSaveTeamReport(teamId, currentSprint.id);

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
      sprintId: currentSprint.id,
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
      startDate: currentSprint.startDate,
      endDate: currentSprint.endDate,
    });
  };

  const tasksInSprint = ganttQuery.data?.tasks ?? [];

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>Текущий проект</h1>
        <p className={styles.context}>
          {projectTitle} · {teamName} · Спринт {currentSprint.number} из {sprintsTotal}
        </p>
      </header>

      <div className={styles.chips}>
        {mentor ? (
          <span className={styles.chip}>
            Ментор: {fullNameWithMiddle({ ...mentor, middleName: mentor.middleName ?? null })}
          </span>
        ) : null}
        {initiator ? <span className={styles.chip}>Инициатор: {initiator}</span> : null}
      </div>

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

      <nav className={styles.tabs} role="tablist">
        <Tab active={tab === 'gantt'} label="Диаграмма Ганта" onClick={() => onTabChange('gantt')} />
        <Tab active={tab === 'reports'} label="Отчёты" onClick={() => onTabChange('reports')} />
        <Tab active={tab === 'meetings'} label="Встречи" onClick={() => onTabChange('meetings')} />
      </nav>

      <div className={styles.tabContent}>
        {tab === 'gantt' ? (
          <GanttTab
            ganttData={ganttQuery.data}
            isLoading={ganttQuery.isLoading}
            error={ganttQuery.error}
            todayIso={todayIso}
            currentUserId={currentUserId}
            canEditAll={isTeamlead}
            sprintNumber={currentSprint.number}
            sprintsTotal={sprintsTotal}
            onTaskClick={(t) => openPopup(t, null)}
            onAddTask={onAddTask}
          />
        ) : null}

        {tab === 'reports' ? (
          <ReportsTab
            isTeamlead={isTeamlead}
            members={members}
            tasks={tasksInSprint}
            currentUserId={currentUserId}
            sprint={currentSprint}
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
        canEditAll={isTeamlead}
        todayIso={todayIso}
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

interface GanttTabProps {
  ganttData: ReturnType<typeof useGantt>['data'];
  isLoading: boolean;
  error: unknown;
  todayIso: string;
  currentUserId: number;
  canEditAll: boolean;
  sprintNumber: number;
  sprintsTotal: number;
  onTaskClick: (t: TaskDto) => void;
  onAddTask: () => void;
}

function GanttTab({
  ganttData,
  isLoading,
  error,
  todayIso,
  currentUserId,
  canEditAll,
  sprintNumber,
  sprintsTotal,
  onTaskClick,
  onAddTask,
}: GanttTabProps): JSX.Element {
  if (isLoading) return <div className={styles.placeholder}>Загружаем диаграмму…</div>;
  if (error) {
    const msg =
      error instanceof ApiError ? `Ошибка ${error.status}: ${error.message}` : 'Не удалось загрузить задачи.';
    return <div className={styles.error}>{msg}</div>;
  }
  if (!ganttData) return <div className={styles.empty}>Нет данных по спринту.</div>;

  return (
    <GanttChart
      data={ganttData}
      todayIso={todayIso}
      currentUserId={currentUserId}
      canEditAll={canEditAll}
      canAddTask
      onTaskClick={onTaskClick}
      onAddTask={onAddTask}
      sprintNumber={sprintNumber}
      sprintsTotal={sprintsTotal}
    />
  );
}

interface ReportsTabProps {
  isTeamlead: boolean;
  members: TeamContextDto['members'];
  tasks: TaskDto[];
  currentUserId: number;
  sprint: TeamContextDto['currentSprint'];
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
