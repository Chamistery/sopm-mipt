/*
 * ProjectCard — карточка проекта на дашборде ментора.
 *
 * Pixel-port из mentor.html (view-dashboard, lines 653-763). Поддерживает
 * пять состояний:
 *
 *   1. Обычный активный проект           (sprints + teams + footer)
 *   2. Проект-продолжение                (badge «Продолжение» + ссылка на
 *                                         предшественника в footer)
 *   3. Команда «Ожидает запуска»         (launched=false → пунктирная плашка)
 *   4. Черновик без команд               (empty-team-msg + «Дозаполнить»)
 *   5. Архивный проект                   (использует override-prop `to`,
 *                                         см. ArchivePage)
 *
 * Все клики ведут на относительные роуты ментора (`/mentor/teams/:id` —
 * объединённая страница команды с табами; default — Гант),
 * `/mentor/distribution`, `/mentor/projects/new` для черновика).
 */

import type { JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import type { MentorDashboardProject, DashboardIterState, DashboardTeam } from '@/api/projects';
import { StatusBadge } from './StatusBadge';
import {
  formatLongMonthYear,
  formatSprintRange,
  sprintDurationWeeks,
} from '../lib/formatDashboardDate';
import styles from './ProjectCard.module.css';

interface Props {
  project: MentorDashboardProject;
}

export function ProjectCard({ project }: Props): JSX.Element {
  const navigate = useNavigate();
  const isDraft = project.status === 'Черновик';
  const sprints = project.sprints ?? [];
  const teams = project.teams ?? [];
  const hasTeams = teams.length > 0;
  const activeSprint = sprints.find((s) => s.status === 'Активный') ?? sprints[0];

  // Header: заголовок + опциональный бейдж «Продолжение» + StatusBadge
  return (
    <div className={styles.card} data-project-id={project.id}>
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <h3
            className={styles.title}
            title={project.title}
          >
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

      <div className={styles.meta}>
        Инициатор: {project.company || '—'} · Срок: {formatDuration(project)}
      </div>

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
            <TeamRow
              key={team.id}
              team={team}
              projectId={project.id}
              onNavigate={navigate}
            />
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
        {isDraft && !hasTeams ? (
          <Link
            to={`/mentor/projects/new?continueProjectId=${project.id}`}
            className={styles.nextAction}
          >
            Дозаполнить заявку <ArrowIcon />
          </Link>
        ) : (
          <Link
            to={`/mentor/projects/${project.id}/info`}
            className={styles.infoLink}
            data-testid="project-card-info-link"
          >
            Полная информация <ArrowIcon />
          </Link>
        )}
        {project.predecessorId ? (
          <Link
            to={`/mentor/archive?highlight=${project.predecessorId}`}
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
  projectId: number;
  onNavigate: (to: string) => void;
}

function TeamRow({ team, projectId, onNavigate }: TeamRowProps): JSX.Element {
  if (!team.launched) {
    return (
      <div
        className={`${styles.teamRow} ${styles.teamRowDashed}`}
        role="link"
        tabIndex={0}
        aria-label={`Команда ${team.name} ожидает запуска`}
        onClick={() => onNavigate(`/mentor/applicants/${projectId}`)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onNavigate(`/mentor/applicants/${projectId}`);
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
    <Link
      to={`/mentor/teams/${team.id}`}
      className={styles.teamRow}
    >
      <span className={styles.teamName}>{team.name}</span>
      <div className={styles.teamInfo}>
        <span className={styles.teamInfoItem}>
          <PersonIcon />
          {team.memberCount} {personWord(team.memberCount)}
        </span>
        <span className={styles.teamInfoLeader}>
          Лидер: {formatLeaderShort(team)}
        </span>
      </div>
      <div className={styles.iterTrack}>
        {(team.sprintStatuses ?? []).map((s, idx) => (
          <IterSquare key={idx} state={s} />
        ))}
      </div>
    </Link>
  );
}

export function IterSquare({
  state,
  size,
}: {
  state: DashboardIterState;
  /** Override size for legend (16) vs in-card (default 22). */
  size?: number;
}): JSX.Element {
  const className = `${styles.iterSq} ${styles[`iter_${state.replace('-', '_')}`]}`;
  const inlineSize = size
    ? { width: `${size}px`, height: `${size}px` }
    : undefined;
  return (
    <span className={className} aria-label={iterLabel(state)} style={inlineSize}>
      {state === 'reviewed' ? (
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M3 6l2 2 4-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      ) : null}
      {state === 'pending-review' ? (
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <circle cx="6" cy="6" r="2.5" fill="currentColor" />
        </svg>
      ) : null}
      {state === 'missed' ? (
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M3 3l6 6M9 3l-6 6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : null}
    </span>
  );
}

function iterLabel(state: DashboardIterState): string {
  switch (state) {
    case 'reviewed':
      return 'Проверен';
    case 'pending-review':
      return 'Ждёт проверки';
    case 'missed':
      return 'Не сдан';
    case 'current':
      return 'Текущий';
    case 'future':
      return 'Будущий';
  }
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

function ArrowIcon(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
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

function formatDuration(project: MentorDashboardProject): string {
  const dur = project.durationSemesters || 1;
  if (dur === 1) return '1 семестр';
  return `${dur} семестра (${project.currentSemester || 1}-й из ${dur})`;
}

function formatLeaderShort(team: DashboardTeam): string {
  if (!team.lead) return '—';
  const last = team.lead.lastName ?? '';
  const firstInitial = team.lead.firstName ? `${team.lead.firstName.charAt(0)}.` : '';
  return [last, firstInitial].filter(Boolean).join(' ');
}

function weekWord(weeks: number): string {
  // Russian plural agreement for «неделя».
  const mod10 = weeks % 10;
  const mod100 = weeks % 100;
  if (mod10 === 1 && mod100 !== 11) return 'неделя';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'недели';
  return 'недель';
}

function personWord(_n: number): string {
  // Russian abbreviated form is invariant — `чел.` works for 1, 2, 5+.
  return 'чел.';
}
