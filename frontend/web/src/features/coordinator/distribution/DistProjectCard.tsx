/*
 * DistProjectCard — карточка проекта в gdist-main. Pixel-port из admin.html
 * (gdist-project-card + gdist-team + chip rendering).
 *
 * Каждая team-block — drop-target: при drop'е сюда payload
 * (DistDragPayload) передаётся на onDropToTeam(payload, teamId, projectId).
 *
 * Чип-bypass:
 *   - клик по телу чипа → onOpenDrawer (открывает полный профиль)
 *   - клик по бейджу статуса → toggle popover (status-menu)
 */

import { useState, type DragEvent, type JSX } from 'react';

import type {
  CoordinatorDistributionProject,
} from '@/api/coordinatorDistribution';
import type { MentorDistributionTeam, MentorDistributionTeamMember } from '@/api/mentorDistribution';
import {
  hasDragPayload,
  readDragPayload,
  writeDragPayload,
  type DistDragPayload,
} from './dragData';
import { colorFor, initialsFor } from './initials';
import { gdistStatusOf, type GdistStatusKey } from './statusInfo';
import { DistStatusMenu } from './DistStatusMenu';
import type { DrawerStudent } from './DistStudentDrawer';
import styles from './DistProjectCard.module.css';

interface Props {
  project: CoordinatorDistributionProject;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onDropToTeam: (payload: DistDragPayload, teamId: number, projectId: number) => void;
  onOpenDrawer: (student: DrawerStudent) => void;
  onSetStatus: (applicationId: number, teamId: number, key: GdistStatusKey) => void;
}

export function DistProjectCard({
  project,
  collapsed,
  onToggleCollapse,
  onDropToTeam,
  onOpenDrawer,
  onSetStatus,
}: Props): JSX.Element {
  const teamSize = `${project.teamSizeMin}–${project.teamSizeMax} чел./ком.`;
  const mentorLabel = project.mentor
    ? `${project.mentor.lastName} ${project.mentor.firstName.charAt(0)}.`
    : '—';
  return (
    <div className={`${styles.card} ${collapsed ? styles.collapsed : ''}`}>
      <div
        className={styles.head}
        onClick={onToggleCollapse}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleCollapse();
          }
        }}
      >
        <div>
          <h3 className={styles.title}>{project.title}</h3>
          <div className={styles.meta}>
            {project.company || '—'} · Ментор: {mentorLabel} · {project.numTeams} ком. ·{' '}
            {teamSize}
          </div>
        </div>
        <span className={styles.arrow} aria-hidden="true">
          ▼
        </span>
      </div>

      {!collapsed ? (
        <div className={styles.teamsGrid}>
          {project.teams.map((team) => (
            <TeamBlock
              key={team.id}
              project={project}
              team={team}
              onDrop={(payload) => onDropToTeam(payload, team.id, project.id)}
              onOpenDrawer={onOpenDrawer}
              onSetStatus={(applicationId, key) => onSetStatus(applicationId, team.id, key)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface TeamBlockProps {
  project: CoordinatorDistributionProject;
  team: MentorDistributionTeam;
  onDrop: (payload: DistDragPayload) => void;
  onOpenDrawer: (student: DrawerStudent) => void;
  onSetStatus: (applicationId: number, key: GdistStatusKey) => void;
}

function TeamBlock({ project, team, onDrop, onOpenDrawer, onSetStatus }: TeamBlockProps): JSX.Element {
  const [over, setOver] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>): void => {
    if (!hasDragPayload(e.nativeEvent)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    setOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>): void => {
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as Node).contains(related)) return;
    setOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setOver(false);
    const payload = readDragPayload(e.nativeEvent);
    if (payload) onDrop(payload);
  };

  return (
    <div
      className={`${styles.team} ${over ? styles.teamDragOver : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={styles.teamHead}>
        <span className={styles.teamName}>{team.name}</span>
        <span
          className={`${styles.teamCount} ${
            team.members.length > project.teamSizeMax
              ? styles.overfull
              : team.members.length >= project.teamSizeMin
                ? styles.ready
                : ''
          }`}
        >
          {team.members.length} / {project.teamSizeMax}
        </span>
      </div>
      <div className={styles.chipList}>
        {team.members.map((m) => (
          <TeamMemberChip
            key={m.applicationId}
            member={m}
            teamId={team.id}
            teamName={team.name}
            projectId={project.id}
            onOpenDrawer={onOpenDrawer}
            onSetStatus={(key) => onSetStatus(m.applicationId, key)}
          />
        ))}
      </div>
    </div>
  );
}

interface ChipProps {
  member: MentorDistributionTeamMember;
  teamId: number;
  teamName: string;
  projectId: number;
  onOpenDrawer: (student: DrawerStudent) => void;
  onSetStatus: (key: GdistStatusKey) => void;
}

function TeamMemberChip({
  member,
  teamId,
  teamName,
  projectId,
  onOpenDrawer,
  onSetStatus,
}: ChipProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = initialsFor(member.firstName, member.lastName);
  const color = colorFor(member.studentId);
  const status = gdistStatusOf(member.status);

  const handleDragStart = (e: DragEvent<HTMLDivElement>): void => {
    writeDragPayload(e.nativeEvent, {
      kind: 'team-member',
      applicationId: member.applicationId,
      studentId: member.studentId,
      sourceTeamId: teamId,
      sourceStatus: member.status,
    });
    e.currentTarget.classList.add(styles.dragging);
  };

  const handleDragEnd = (e: DragEvent<HTMLDivElement>): void => {
    e.currentTarget.classList.remove(styles.dragging);
  };

  const handleBodyClick = (): void => {
    // allPriorities приходит с бэка для coordinator distribution (все 5 заявок
    // студента). Если по какой-то причине не пришло — fallback на одну запись
    // о собственной заявке этой команды.
    const priorities =
      (member.allPriorities && member.allPriorities.length > 0
        ? member.allPriorities.map((p) => ({
            applicationId: p.applicationId,
            projectId: p.projectId,
            projectTitle: p.projectTitle,
            priority: p.priority,
            status: p.status,
          }))
        : [
            {
              applicationId: member.applicationId,
              projectId,
              projectTitle: '',
              priority: member.priority,
              status: member.status,
            },
          ]);
    onOpenDrawer({
      studentId: member.studentId,
      firstName: member.firstName,
      lastName: member.lastName,
      course: member.course,
      group: member.group,
      gpa: member.gpa,
      priorities,
      currentTeamProjectId: projectId,
      currentTeamName: teamName,
    });
  };

  const toggleMenu = (e: { stopPropagation: () => void }): void => {
    e.stopPropagation();
    setMenuOpen((v) => !v);
  };

  return (
    <div
      className={`${styles.chip} ${menuOpen ? styles.chipMenuOpen : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className={styles.avatar}
        style={{ background: color }}
        onClick={handleBodyClick}
        role="button"
        tabIndex={0}
      >
        {initials}
      </div>
      <div
        className={styles.chipBody}
        onClick={handleBodyClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleBodyClick();
          }
        }}
      >
        <div className={styles.chipName}>
          {member.lastName} {member.firstName.charAt(0)}.
        </div>
        <div className={styles.chipSub}>
          {member.course} курс · {member.gpa.toFixed(1)} · {member.group || '—'}
        </div>
      </div>
      <span
        className={`${styles.statusBadge} ${styles[`status_${status.className}`]}`}
        title="Изменить статус"
        role="button"
        tabIndex={0}
        onClick={toggleMenu}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleMenu(e);
          }
        }}
      >
        {status.label}
        <ChevronDownIcon />
        {menuOpen ? (
          <DistStatusMenu
            currentKey={status.key}
            onSelect={(key) => {
              setMenuOpen(false);
              if (key !== status.key) onSetStatus(key);
            }}
            onClose={() => setMenuOpen(false)}
          />
        ) : null}
      </span>
      <ChevronRightIcon className={styles.expandIco} />
    </div>
  );
}

function ChevronDownIcon(): JSX.Element {
  return (
    <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path
        d="M2 4l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className: string }): JSX.Element {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M5 3l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
