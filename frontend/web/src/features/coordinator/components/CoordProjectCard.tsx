/*
 * CoordProjectCard — карточка проекта на дашборде координатора. Pixel-port
 * из admin.html (view-dashboard, lines 870-977).
 *
 * Отличия от менторской ProjectCard:
 *   - meta содержит «Ментор: …» (для координатора важно видеть, чей проект)
 *   - дашборд показывает ВСЕ проекты, поэтому ссылки идут на админ-роуты
 *     (/admin/teams/:id, /admin/distribution, /admin/projects/:id)
 *   - для черновика нет действия «Дозаполнить» — проект-черновик создаёт
 *     ментор, координатор только видит факт
 */

import type { JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import type {
  DashboardIterState,
  DashboardTeam,
  MentorDashboardProject,
} from '@/api/projects';
import {
  formatLongMonthYear,
  formatSprintRange,
  sprintDurationWeeks,
} from '@/features/mentor-dashboard/lib/formatDashboardDate';
import { StatusBadge } from '@/features/mentor-dashboard/components/StatusBadge';
import { IterSquare } from '@/features/mentor-dashboard/components/ProjectCard';
import styles from './CoordProjectCard.module.css';

interface Props {
  project: MentorDashboardProject;
}

export function CoordProjectCard({ project }: Props): JSX.Element {
  const navigate = useNavigate();
  const isDraft = project.status === 'Черновик';
  const sprints = project.sprints ?? [];
  const teams = project.teams ?? [];
  const hasTeams = teams.length > 0;
  const activeSprint = sprints.find((s) => s.status === 'Активный') ?? sprints[0];

  return (
    <div className={styles.card} data-project-id={project.id}>
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <h3 className={styles.title} title={project.title}>
            {project.title}
          </h3>
          {project.predecessorId ? (
            <span
              className={styles.continuationPill}
              title="Продолжение проекта из прошлого семестра"
            >
              <ContinuationIcon />
              Продолжение
            </span>
          ) : null}
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className={styles.meta}>{formatMeta(project)}</div>

      {!isDraft && sprints.length > 0 && activeSprint ? (
        <div className={styles.sprintBar}>
          <span className={styles.sprintCurrent}>
            Спринт {activeSprint.number} из {sprints.length}
          </span>
          <span className={styles.sprintDetail}>
            · по {sprintDurationWeeks(activeSprint.startDate, activeSprint.endDate)}{' '}
            {weekWord(sprintDurationWeeks(activeSprint.startDate, activeSprint.endDate))} ·{' '}
            {formatSprintRange(activeSprint.startDate, activeSprint.endDate)}
          </span>
        </div>
      ) : null}

      {hasTeams ? (
        <div className={styles.teamList}>
          {teams.map((team) => (
            <TeamRow key={team.id} team={team} onNavigate={navigate} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyTeam}>
          Заявка ещё не отправлена — команды не сформированы
        </div>
      )}

      <div className={styles.footer}>
        <span>
          {isDraft && project.startedAt
            ? `Создан: ${formatLongMonthYear(project.startedAt)}`
            : project.startedAt
              ? `Начат: ${formatLongMonthYear(project.startedAt)}`
              : ''}
        </span>
        {!isDraft && project.predecessorId ? (
          <Link
            to={`/admin/archive?highlight=${project.predecessorId}`}
            className={styles.predecessorLink}
          >
            <ContinuationIcon />
            Открыть предшественника
          </Link>
        ) : null}
      </div>
    </div>
  );
}

interface TeamRowProps {
  team: DashboardTeam;
  onNavigate: (to: string) => void;
}

function TeamRow({ team, onNavigate }: TeamRowProps): JSX.Element {
  if (!team.launched) {
    return (
      <div
        className={`${styles.teamRow} ${styles.teamRowDashed}`}
        role="link"
        tabIndex={0}
        aria-label={`Команда ${team.name} ожидает запуска`}
        onClick={() => onNavigate(`/admin/distribution`)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onNavigate(`/admin/distribution`);
          }
        }}
      >
        <span className={styles.teamNameMuted}>{team.name}</span>
        <div className={styles.teamInfo}>
          <span className={styles.teamInfoMuted}>
            <PersonIcon />
            {team.memberCount} {personWord(team.memberCount)}
          </span>
          <span className={styles.teamInfoWaiting}>Ожидает запуска</span>
        </div>
      </div>
    );
  }

  return (
    <Link to={`/admin/teams/${team.id}`} className={styles.teamRow}>
      <span className={styles.teamName}>{team.name}</span>
      <div className={styles.teamInfo}>
        <span className={styles.teamInfoItem}>
          <PersonIcon />
          {team.memberCount} {personWord(team.memberCount)}
        </span>
        <span className={styles.teamInfoLeader}>Лидер: {formatLeaderShort(team)}</span>
      </div>
      <div className={styles.iterTrack}>
        {(team.sprintStatuses ?? []).map((s: DashboardIterState, idx: number) => (
          <IterSquare key={idx} state={s} />
        ))}
      </div>
    </Link>
  );
}

function formatMeta(project: MentorDashboardProject): string {
  const parts: string[] = [];
  parts.push(`Инициатор: ${project.company || '—'}`);
  if (project.mentor) {
    parts.push(`Ментор: ${formatMentorShort(project.mentor)}`);
  } else {
    parts.push('Ментор: —');
  }
  parts.push(`Срок: ${formatDuration(project)}`);
  return parts.join(' · ');
}

function formatMentorShort(mentor: NonNullable<MentorDashboardProject['mentor']>): string {
  const last = mentor.lastName ?? '';
  const initial = mentor.firstName ? `${mentor.firstName.charAt(0)}.` : '';
  return [last, initial].filter(Boolean).join(' ') || '—';
}

function formatDuration(project: MentorDashboardProject): string {
  const dur = project.durationSemesters || 1;
  if (dur === 1) return '1 семестр';
  return `${dur} семестра (${project.currentSemester || 1}-й из ${dur})`;
}

function formatLeaderShort(team: DashboardTeam): string {
  if (!team.lead) return '—';
  const last = team.lead.lastName ?? '';
  const initial = team.lead.firstName ? `${team.lead.firstName.charAt(0)}.` : '';
  return [last, initial].filter(Boolean).join(' ');
}

function weekWord(weeks: number): string {
  const mod10 = weeks % 10;
  const mod100 = weeks % 100;
  if (mod10 === 1 && mod100 !== 11) return 'неделя';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'недели';
  return 'недель';
}

function personWord(_n: number): string {
  return 'чел.';
}

function ContinuationIcon(): JSX.Element {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PersonIcon(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M1.5 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}
