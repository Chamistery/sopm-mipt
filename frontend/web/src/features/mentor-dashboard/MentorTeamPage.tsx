/*
 * MentorTeamPage — единая страница команды для ментора. Объединяет
 * три старых маршрута (`.../gantt`, `.../reports`, ProjectDetailPage)
 * в один с табами «Диаграмма Ганта / Отчёты по спринтам / Встречи».
 *
 * URL: `/mentor/teams/:teamId?tab=gantt|reports|meetings` (default — gantt).
 *
 * Pixel-port из mentor.html (view-team, lines 885-1170): хлебные крошки,
 * шапка, members-card с кнопкой «Сделать тимлидом» (one-shot — назначить
 * можно только если leaderId не установлен), линейка табов и контент.
 *
 * Контент табов вынесен в отдельные файлы (`tabs/MentorTeamGanttTab`,
 * `tabs/MentorTeamReportsTab`, `tabs/MentorTeamMeetingsTab`) — каждый
 * самодостаточен, чтобы переключение через ?tab было дешёвым и чтобы
 * shape страниц совпадал с прототипом (one-page-with-tabs, не SPA-suite).
 */

import type { JSX } from 'react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { type Team, type TeamMember, assignTeamLeader } from '@/api/teams';
import { useToast } from '@/_shared/Toast';
import { useProject } from './hooks/useProject';
import { useTeam } from './hooks/useTeam';
import { avatarColorByIndex, initials } from '@/features/student-project/lib/people';
import { MentorTeamGanttTab } from './tabs/MentorTeamGanttTab';
import { MentorTeamReportsTab } from './tabs/MentorTeamReportsTab';
import { MentorTeamMeetingsTab } from './tabs/MentorTeamMeetingsTab';
import styles from './MentorTeamPage.module.css';

type TabKey = 'gantt' | 'reports' | 'meetings';
const TAB_KEYS: TabKey[] = ['gantt', 'reports', 'meetings'];

export function MentorTeamPage(): JSX.Element {
  const params = useParams<{ teamId: string }>();
  const teamId = Number.parseInt(params.teamId ?? '', 10);
  const [searchParams, setSearchParams] = useSearchParams();

  const teamQuery = useTeam(teamId);
  const projectId = teamQuery.data?.projectId ?? null;
  const projectQuery = useProject(projectId);

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

  if (teamQuery.isLoading) {
    return (
      <div className={styles.page}>
        <Link to="/mentor" className={styles.back}>
          ← К дашборду
        </Link>
        <div className={styles.placeholder}>Загружаем команду…</div>
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
        <Link to="/mentor" className={styles.back}>
          ← К дашборду
        </Link>
        <div className={styles.error}>{msg}</div>
      </div>
    );
  }

  const team = teamQuery.data;
  const projectTitle = projectQuery.data?.title ?? '';

  return (
    <div className={styles.page}>
      <nav className={styles.crumbs} aria-label="Хлебные крошки">
        <Link to="/mentor" className={styles.crumbLink}>
          Дашборд
        </Link>
        <CrumbSep />
        {projectTitle ? (
          <Link to="/mentor" className={styles.crumbLink}>
            {projectTitle}
          </Link>
        ) : (
          <span className={styles.crumbLink}>Проект</span>
        )}
        <CrumbSep />
        <span className={styles.crumbCurrent}>{team.name}</span>
      </nav>

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{team.name}</h1>
          {projectTitle ? <div className={styles.subtitle}>{projectTitle}</div> : null}
        </div>
      </header>

      <MembersCard team={team} />

      <nav className={styles.tabs} role="tablist" aria-label="Разделы команды">
        <Tab active={tab === 'gantt'} label="Диаграмма Ганта" onClick={() => setTab('gantt')} />
        <Tab active={tab === 'reports'} label="Отчёты по спринтам" onClick={() => setTab('reports')} />
        <Tab active={tab === 'meetings'} label="Встречи" onClick={() => setTab('meetings')} />
      </nav>

      <div className={styles.tabContent}>
        {tab === 'gantt' ? <MentorTeamGanttTab teamId={teamId} /> : null}
        {tab === 'reports' ? <MentorTeamReportsTab teamId={teamId} /> : null}
        {tab === 'meetings' ? <MentorTeamMeetingsTab teamId={teamId} /> : null}
      </div>
    </div>
  );
}

function CrumbSep(): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={styles.crumbSep}
    >
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
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

function MembersCard({ team }: { team: Team }): JSX.Element {
  const queryClient = useQueryClient();
  const { showSuccess } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

  const assignMutation = useMutation({
    mutationFn: ({ userId }: { userId: number; displayName: string }) =>
      assignTeamLeader(team.id, userId),
    onSuccess: async (_data, vars) => {
      setServerError(null);
      showSuccess(`${vars.displayName} назначен тимлидом`);
      await queryClient.invalidateQueries({ queryKey: ['team', team.id] });
    },
    onError: (err: unknown) => {
      setServerError(
        err instanceof ApiError
          ? `Ошибка ${err.status}: ${err.message}`
          : err instanceof Error
            ? err.message
            : 'Не удалось назначить тимлида',
      );
    },
  });

  const members = team.members ?? [];
  // Тимлида определяем по leaderId — bool-флаг isLeader на старте может
  // расходиться с PUT-результатом (бэк правит leaderId, но не пере-
  // присваивает members[].isLeader пока инвалидация не дойдёт).
  const hasLeader = team.leaderId != null && team.leaderId > 0;

  return (
    <section className={styles.membersCard} aria-label="Состав команды">
      {!hasLeader ? (
        <div className={styles.leaderHint} role="note">
          <HintIcon />
          <span>
            Тимлид ещё не назначен. Выберите студента из состава — назначить можно только один раз.
          </span>
        </div>
      ) : null}

      {serverError ? <div className={styles.error}>{serverError}</div> : null}

      {members.length === 0 ? (
        <div className={styles.empty}>В команде пока нет участников.</div>
      ) : (
        <div className={styles.membersGrid}>
          {members.map((m, idx) => (
            <MemberChip
              key={m.userId}
              member={m}
              avatarBg={avatarColorByIndex(idx)}
              isLeader={team.leaderId === m.userId}
              showAssign={!hasLeader}
              isAssigning={
                assignMutation.isPending && assignMutation.variables?.userId === m.userId
              }
              onAssign={() =>
                assignMutation.mutate({
                  userId: m.userId,
                  displayName: `${m.user.lastName} ${m.user.firstName.charAt(0)}.`.trim(),
                })
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface MemberChipProps {
  member: TeamMember;
  avatarBg: string;
  isLeader: boolean;
  showAssign: boolean;
  isAssigning: boolean;
  onAssign: () => void;
}

function MemberChip({
  member,
  avatarBg,
  isLeader,
  showAssign,
  isAssigning,
  onAssign,
}: MemberChipProps): JSX.Element {
  const person = {
    firstName: member.user.firstName,
    lastName: member.user.lastName,
    middleName: member.user.middleName ?? null,
  };

  return (
    <div className={styles.memberChip}>
      <div className={styles.memberAvatar} style={{ background: avatarBg }}>
        {initials(person)}
      </div>
      <div className={styles.memberInfo}>
        <div className={styles.memberName}>
          {member.user.lastName} {member.user.firstName.charAt(0)}.
          {isLeader ? <span className={styles.memberLeaderBadge}>Лидер</span> : null}
        </div>
      </div>
      {!isLeader && showAssign ? (
        <button
          type="button"
          className={styles.assignBtn}
          onClick={onAssign}
          disabled={isAssigning}
          title="Назначить тимлидом команды"
        >
          <CrownIcon />
          {isAssigning ? 'Назначаем…' : 'Сделать тимлидом'}
        </button>
      ) : null}
    </div>
  );
}

function HintIcon(): JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={styles.hintIcon}
    >
      <path
        d="M8 1.5v5M8 10v4.5M1.5 8h5M9.5 8h5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function CrownIcon(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 5l3 3 3-5 3 5 3-3-1 7H3L2 5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
