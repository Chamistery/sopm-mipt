/*
 * CoordTeamPage — страница команды у координатора.
 *
 * URL: `/admin/teams/:teamId?tab=gantt|reports|meetings` (default — gantt).
 *
 * Структурно — копия mentor'ской MentorTeamPage; шапка / members-card /
 * табы / контент те же. Содержимое табов реюзается из mentor-dashboard
 * (MentorTeamGanttTab / MentorTeamReportsTab / MentorTeamMeetingsTab) —
 * они зависят только от teamId, бэкенд GET-эндпоинты доступны и
 * координатору.
 *
 * Почему отдельный файл, а не редирект на mentor-страницу:
 *   - breadcrumb «К дашборду» должен вести в /admin, не в /mentor.
 *   - В будущем у координатора появится свой функционал (например,
 *     ручная переразметка задач между командами, утверждение защит).
 *     Лучше менять одну файло-границу, чем добавлять scope-props на
 *     mentor-страницу и риск-ломая мент-флоу.
 *   - Шапка проекта линкуется на /admin/projects/:id, а не /mentor.
 */

import type { JSX } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { ApiError } from '@/api/client';
import { type Team, type TeamMember } from '@/api/teams';
import { useProject } from '@/features/mentor-dashboard/hooks/useProject';
import { useTeam } from '@/features/mentor-dashboard/hooks/useTeam';
import { avatarColorByIndex, initials } from '@/features/student-project/lib/people';
import { MentorTeamGanttTab } from '@/features/mentor-dashboard/tabs/MentorTeamGanttTab';
import { MentorTeamReportsTab } from '@/features/mentor-dashboard/tabs/MentorTeamReportsTab';
import { MentorTeamMeetingsTab } from '@/features/mentor-dashboard/tabs/MentorTeamMeetingsTab';
import styles from './CoordTeamPage.module.css';

type TabKey = 'gantt' | 'reports' | 'meetings';
const TAB_KEYS: TabKey[] = ['gantt', 'reports', 'meetings'];

export function CoordTeamPage(): JSX.Element {
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
        <Link to="/admin" className={styles.back}>
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
        <Link to="/admin" className={styles.back}>
          ← К дашборду
        </Link>
        <div className={styles.error}>{msg}</div>
      </div>
    );
  }

  const team = teamQuery.data;
  const projectTitle = projectQuery.data?.title ?? '';
  const projectHref = projectId != null ? `/admin/projects/${projectId}` : '/admin';

  return (
    <div className={styles.page}>
      <nav className={styles.crumbs} aria-label="Хлебные крошки">
        <Link to="/admin" className={styles.crumbLink}>
          Дашборд
        </Link>
        <CrumbSep />
        {projectTitle ? (
          <Link to={projectHref} className={styles.crumbLink}>
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
        {projectId != null ? (
          <Link to={projectHref} className={styles.openProjectBtn}>
            <FolderIcon />
            Открыть карточку проекта
          </Link>
        ) : null}
      </header>

      <MembersCard team={team} />

      <nav className={styles.tabs} role="tablist" aria-label="Разделы команды">
        <Tab active={tab === 'gantt'} label="Диаграмма Ганта" onClick={() => setTab('gantt')} />
        <Tab active={tab === 'reports'} label="Отчёты по спринтам" onClick={() => setTab('reports')} />
        <Tab active={tab === 'meetings'} label="Встречи" onClick={() => setTab('meetings')} />
      </nav>

      <div className={styles.tabContent}>
        {tab === 'gantt' ? (
          <MentorTeamGanttTab teamId={teamId} mode="coordinator" />
        ) : null}
        {tab === 'reports' ? (
          <MentorTeamReportsTab teamId={teamId} mode="coordinator" />
        ) : null}
        {tab === 'meetings' ? (
          <MentorTeamMeetingsTab teamId={teamId} mode="coordinator" />
        ) : null}
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
  const members = team.members ?? [];

  return (
    <section className={styles.membersCard} aria-label="Состав команды">
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
}

function MemberChip({ member, avatarBg, isLeader }: MemberChipProps): JSX.Element {
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
    </div>
  );
}

function FolderIcon(): JSX.Element {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 7h12M5 3v10" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
