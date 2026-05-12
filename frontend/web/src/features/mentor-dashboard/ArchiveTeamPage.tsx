import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { getProjectPredecessor } from '@/api/projects';
import { listMeetings } from '@/api/meetings';
import type { Meeting } from '@/api/types';
import { listSprintScores, type SprintScore } from '@/api/sprintScores';
import type { Sprint } from '@/api/teams';
import { listTeamReports, type TeamReport } from '@/api/teamReports';
import { ROLE_LABELS_RU } from '@/auth/roles';
import { GanttChart } from '@/features/student-project/components/GanttChart';
import {
  formatISODate,
  formatRuDate,
  formatRuRange,
} from '@/features/student-project/lib/dates';
import { avatarColor, initials } from '@/features/student-project/lib/people';
import { formatFinalGradeLabel } from './lib/finalGrade';
import { chainUrl, parseChain, pushToChain } from './lib/archiveChain';
import { useArchiveBasePath } from './lib/archiveBasePath';
import { useProjectSprints, useTeam } from './hooks/useTeam';
import { useTeamGantt } from './hooks/useTeamGantt';
import { useProjectDetail } from './hooks/useProjectDetail';
import { ArchiveBreadcrumbs } from './ArchiveProjectTeamsPage';
import styles from './ArchiveTeamPage.module.css';

type TabKey = 'gantt' | 'reports' | 'meetings';
const TAB_KEYS: TabKey[] = ['gantt', 'reports', 'meetings'];

/**
 * Финальный экран архивной команды. Read-only по построению: Гант — в
 * архивной палитре, отчёты в заглушенном виде, встречи без формы.
 *
 * Финальная оценка считается локально (см. lib/finalGrade.ts) — бэк не
 * хранит её отдельным полем; когда добавит, заменим на чтение поля.
 */
export function ArchiveTeamPage(): JSX.Element {
  const basePath = useArchiveBasePath();
  const params = useParams<{ teamId: string }>();
  const teamId = Number.parseInt(params.teamId ?? '', 10);
  const [searchParams, setSearchParams] = useSearchParams();
  const chain = parseChain(searchParams.get('chain'));

  const teamQuery = useTeam(teamId);
  const projectId = teamQuery.data?.projectId ?? null;
  const projectQuery = useProjectDetail(projectId ?? 0);
  const sprintsQuery = useProjectSprints(projectId);
  const scoresQuery = useTeamScores(teamId);
  const predecessorQuery = useQuery({
    queryKey: ['project', projectId, 'predecessor'],
    queryFn: () => getProjectPredecessor(projectId ?? 0),
    enabled: projectId != null && projectId > 0,
  });

  const tabRaw = searchParams.get('tab');
  const tab: TabKey = TAB_KEYS.includes(tabRaw as TabKey) ? (tabRaw as TabKey) : 'gantt';

  const setTab = (next: TabKey): void => {
    const sp = new URLSearchParams(searchParams);
    sp.set('tab', next);
    setSearchParams(sp, { replace: true });
  };

  if (!Number.isFinite(teamId) || teamId <= 0) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>Некорректный идентификатор команды</div>
      </div>
    );
  }

  if (teamQuery.isLoading || projectQuery.isLoading) {
    return (
      <div className={styles.page}>
        <BackLink />
        <div className={styles.placeholder}>Загружаем архив команды…</div>
      </div>
    );
  }

  if (teamQuery.error || !teamQuery.data) {
    const msg =
      teamQuery.error instanceof ApiError
        ? `Ошибка ${teamQuery.error.status}: ${teamQuery.error.message}`
        : 'Не удалось загрузить команду';
    return (
      <div className={styles.page}>
        <BackLink />
        <div className={styles.error}>{msg}</div>
      </div>
    );
  }

  const team = teamQuery.data;
  const project = projectQuery.data?.project ?? null;
  const sprints = sprintsQuery.data ?? [];
  const scores: SprintScore[] = scoresQuery.data ?? [];
  const finalGradeLabel = formatFinalGradeLabel(scores);

  // Архивный спринт — последний по номеру; если params не задал tab — Гант
  // показывает именно его (и пользователь может переключаться селектором).
  const lastSprint = sprints.length > 0 ? [...sprints].sort((a, b) => b.number - a.number)[0] ?? null : null;
  const sprintParam = Number.parseInt(searchParams.get('sprintId') ?? '', 10);
  const selectedSprintId = Number.isFinite(sprintParam) && sprintParam > 0 ? sprintParam : lastSprint?.id ?? null;

  const setSprintId = (id: number): void => {
    const sp = new URLSearchParams(searchParams);
    sp.set('sprintId', String(id));
    setSearchParams(sp, { replace: true });
  };

  // «Архив → … → <project>» как chained-крошки. Сам проект — текущая
  // (некликабельная) точка; chain содержит предшественников выше.
  // Внутри ArchiveBreadcrumbs мы рендерим всё, кроме последнего листа —
  // здесь же добавляем сам проект как «текущий», и название команды
  // как заключительный сегмент.
  const projectTitle = project?.title ?? 'Проект';
  const projectId_ = project?.id ?? null;
  const predecessorId = predecessorQuery.data?.id ?? null;
  // chain для кнопки «Открыть предшественника»: добавляем текущий проект.
  const chainForPredecessor =
    projectId_ != null ? pushToChain(chain, projectId_) : chain;

  return (
    <div className={styles.page}>
      <ArchiveBreadcrumbs
        chain={projectId_ != null ? [...chain, projectId_] : chain}
        currentTitle={team.name}
      />

      <header className={styles.header}>
        <h1 className={styles.title}>{team.name}</h1>
        <div className={styles.subtitle}>
          {projectTitle ? `${projectTitle} · команда` : 'Команда архивного проекта'}
        </div>
      </header>

      <div className={styles.banner} role="note">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className={styles.bannerIcon}
        >
          <path
            d="M3 5h10M4 5v7a1 1 0 001 1h6a1 1 0 001-1V5M6 8h4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        <span className={styles.bannerText}>
          Проект <b>завершён</b>. Все спринты закрыты. Диаграмма, отчёты и встречи представлены в
          итоговом состоянии без возможности редактирования.
        </span>
        <span className={styles.gradePill} data-testid="archive-final-grade">
          {finalGradeLabel}
        </span>
      </div>

      {predecessorId != null ? (
        <Link
          to={chainUrl(`${basePath}/projects/${predecessorId}`, chainForPredecessor)}
          className={styles.predecessorLink}
          data-testid="archive-open-predecessor"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Открыть предшественника проекта
        </Link>
      ) : null}

      <MembersCard team={team} />

      <nav className={styles.tabs} role="tablist" aria-label="Разделы архивной команды">
        <Tab active={tab === 'gantt'} label="Итоговая диаграмма" onClick={() => setTab('gantt')} />
        <Tab active={tab === 'reports'} label="Итоговые отчёты" onClick={() => setTab('reports')} />
        <Tab active={tab === 'meetings'} label="Встречи" onClick={() => setTab('meetings')} />
      </nav>

      <div className={styles.tabContent}>
        {tab === 'gantt' ? (
          <GanttTab
            teamId={teamId}
            sprints={sprints}
            selectedSprintId={selectedSprintId}
            onSprintChange={setSprintId}
          />
        ) : null}
        {tab === 'reports' ? <ReportsTab teamId={teamId} sprints={sprints} /> : null}
        {tab === 'meetings' ? <MeetingsTab teamId={teamId} /> : null}
      </div>
    </div>
  );
}

function BackLink(): JSX.Element {
  const basePath = useArchiveBasePath();
  return (
    <Link to={basePath} className={styles.back}>
      ← К архиву проектов
    </Link>
  );
}

function MembersCard({ team }: { team: NonNullable<ReturnType<typeof useTeam>['data']> }): JSX.Element {
  const members = team.members ?? [];
  const leader = members.find((m) => m.isLeader);
  const leaderName = leader
    ? `${leader.user.lastName} ${leader.user.firstName}`
    : team.leader
      ? `${team.leader.lastName} ${team.leader.firstName}`
      : 'Лидер не назначен';

  return (
    <section className={styles.membersCard} aria-label="Состав команды">
      <div className={styles.membersHead}>
        <h2 className={styles.membersTitle}>Состав команды</h2>
        <span className={styles.membersLeader}>Тимлид: {leaderName}</span>
      </div>
      {members.length === 0 ? (
        <div className={styles.empty}>Состав команды не сохранён.</div>
      ) : (
        <div className={styles.membersGrid}>
          {members.map((m) => {
            const member = {
              firstName: m.user.firstName,
              lastName: m.user.lastName,
              middleName: m.user.middleName ?? null,
            };
            return (
              <div key={m.userId} className={styles.memberChip}>
                <div className={styles.memberAvatar} style={{ background: avatarColor(m.userId) }}>
                  {initials(member)}
                </div>
                <div className={styles.memberInfo}>
                  <div className={styles.memberName}>
                    {m.user.lastName} {m.user.firstName}
                    {m.isLeader ? <span className={styles.badgeLeader}>Лидер</span> : null}
                  </div>
                  <div className={styles.memberRoleLine}>
                    {m.roleInTeam ?? ROLE_LABELS_RU[m.user.role]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

interface GanttTabProps {
  teamId: number;
  sprints: Sprint[];
  selectedSprintId: number | null;
  onSprintChange: (id: number) => void;
}

function GanttTab({
  teamId,
  sprints,
  selectedSprintId,
  onSprintChange,
}: GanttTabProps): JSX.Element {
  const ganttQuery = useTeamGantt(teamId, selectedSprintId);
  const todayIso = useMemo(() => formatISODate(new Date()), []);

  if (sprints.length === 0) {
    return <div className={styles.empty}>В этом проекте не было спринтов.</div>;
  }

  const sortedSprints = [...sprints].sort((a, b) => a.number - b.number);
  const sprintNumber = ganttQuery.data?.sprint.number ?? 0;

  return (
    <>
      <div className={styles.sprintBar}>
        <label className={styles.sprintPick}>
          <span className={styles.controlLabel}>Спринт</span>
          <select
            className={styles.select}
            value={selectedSprintId ?? ''}
            onChange={(e) => onSprintChange(Number.parseInt(e.target.value, 10))}
          >
            {sortedSprints.map((s) => (
              <option key={s.id} value={s.id}>
                Спринт {s.number} · {s.status}
              </option>
            ))}
          </select>
        </label>
      </div>

      {ganttQuery.isLoading ? (
        <div className={styles.placeholder}>Загружаем диаграмму…</div>
      ) : ganttQuery.error ? (
        <div className={styles.error}>
          {ganttQuery.error instanceof ApiError
            ? `Ошибка ${ganttQuery.error.status}: ${ganttQuery.error.message}`
            : 'Не удалось загрузить диаграмму'}
        </div>
      ) : ganttQuery.data ? (
        <GanttChart
          data={ganttQuery.data}
          todayIso={todayIso}
          currentUserId={-1}
          canEditAll={false}
          canAddTask={false}
          mode="archive"
          onTaskClick={() => undefined}
          onAddTask={() => undefined}
          sprintNumber={sprintNumber}
          sprintsTotal={sortedSprints.length}
        />
      ) : null}
    </>
  );
}

function ReportsTab({ teamId, sprints }: { teamId: number; sprints: Sprint[] }): JSX.Element {
  const reportsQuery = useQuery<TeamReport[]>({
    queryKey: ['team', teamId, 'reports'],
    queryFn: () => listTeamReports({ teamId }),
    enabled: Number.isFinite(teamId) && teamId > 0,
  });

  if (reportsQuery.isLoading) {
    return <div className={styles.placeholder}>Загружаем отчёты…</div>;
  }
  if (reportsQuery.error) {
    return (
      <div className={styles.error}>
        {reportsQuery.error instanceof ApiError
          ? `Ошибка ${reportsQuery.error.status}: ${reportsQuery.error.message}`
          : 'Не удалось загрузить отчёты'}
      </div>
    );
  }

  const reports = reportsQuery.data ?? [];
  if (reports.length === 0) {
    return <div className={styles.empty}>Командных отчётов нет.</div>;
  }

  const sprintMap = new Map(sprints.map((s) => [s.id, s]));
  const sorted = [...reports].sort((a, b) => {
    const sa = sprintMap.get(a.sprintId)?.number ?? 0;
    const sb = sprintMap.get(b.sprintId)?.number ?? 0;
    return sa - sb;
  });

  return (
    <ul className={styles.reportList}>
      {sorted.map((r) => {
        const sprint = sprintMap.get(r.sprintId);
        return (
          <li key={r.id} className={styles.reportCard}>
            <div className={styles.reportHead}>
              <h3 className={styles.reportTitle}>
                {sprint ? `Спринт ${sprint.number}` : `Отчёт #${r.id}`}
              </h3>
              {sprint ? (
                <span className={styles.reportRange}>
                  {formatRuRange(sprint.startDate, sprint.endDate)}
                </span>
              ) : null}
              <span className={styles.reportStatus}>{r.status}</span>
            </div>
            {r.summary ? (
              <ReportField label="Что сделано" value={r.summary} />
            ) : null}
            {r.problems ? <ReportField label="Проблемы и риски" value={r.problems} /> : null}
            {r.nextPlan ? <ReportField label="План на следующий спринт" value={r.nextPlan} /> : null}
            {r.mentorComment ? (
              <div className={styles.mentorBlock}>
                <div className={styles.mentorTitle}>Комментарий ментора</div>
                <div className={styles.mentorText}>{r.mentorComment}</div>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function ReportField({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className={styles.reportField}>
      <div className={styles.reportFieldLabel}>{label}</div>
      <div className={styles.reportFieldValue}>{value}</div>
    </div>
  );
}

function MeetingsTab({ teamId }: { teamId: number }): JSX.Element {
  const meetingsQuery = useQuery<Meeting[]>({
    queryKey: ['team', teamId, 'meetings', 'archive'],
    queryFn: () => listMeetings({ teamId }),
    enabled: Number.isFinite(teamId) && teamId > 0,
  });

  if (meetingsQuery.isLoading) {
    return <div className={styles.placeholder}>Загружаем встречи…</div>;
  }
  if (meetingsQuery.error) {
    return (
      <div className={styles.error}>
        {meetingsQuery.error instanceof ApiError
          ? `Ошибка ${meetingsQuery.error.status}: ${meetingsQuery.error.message}`
          : 'Не удалось загрузить встречи'}
      </div>
    );
  }

  const meetings = meetingsQuery.data ?? [];
  if (meetings.length === 0) {
    return <div className={styles.empty}>Встреч за время проекта не было.</div>;
  }

  const sorted = [...meetings].sort((a, b) => (a.meetingDate ?? '').localeCompare(b.meetingDate ?? ''));

  return (
    <ul className={styles.meetingList}>
      {sorted.map((m) => (
        <li key={m.id ?? `${m.title}-${m.meetingDate}`} className={styles.meetingRow}>
          <div className={styles.meetingMain}>
            <span className={styles.meetingTitle}>{m.title ?? 'Без названия'}</span>
            {m.description ? <span className={styles.meetingDesc}>{m.description}</span> : null}
          </div>
          <div className={styles.meetingMeta}>
            {m.meetingDate ? (
              <span className={styles.meetingDate}>
                {formatRuDate(m.meetingDate)}
                {m.startTime ? ` · ${m.startTime}` : ''}
              </span>
            ) : null}
            {m.conferenceLink ? (
              <a
                className={styles.meetingLink}
                href={m.conferenceLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ссылка
              </a>
            ) : null}
            {m.status ? <span className={styles.meetingStatus}>{m.status}</span> : null}
          </div>
        </li>
      ))}
    </ul>
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

function useTeamScores(teamId: number) {
  return useQuery<SprintScore[]>({
    queryKey: ['team', teamId, 'sprint-scores', 'archive'],
    queryFn: () => listSprintScores({ teamId }),
    enabled: Number.isFinite(teamId) && teamId > 0,
  });
}
