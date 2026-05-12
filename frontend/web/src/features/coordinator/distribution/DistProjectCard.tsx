/*
 * DistProjectCard — карточка проекта в gdist-main. Pixel-port из admin.html
 * (gdist-project-card + gdist-team + chip rendering).
 *
 * Каждая team-block — drop-target: при drop'е сюда payload
 * (DistDragPayload) передаётся на onDropToTeam(payload, teamId, projectId).
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
import { gdistStatusOf } from './statusInfo';
import styles from './DistProjectCard.module.css';

interface Props {
  project: CoordinatorDistributionProject;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onDropToTeam: (payload: DistDragPayload, teamId: number, projectId: number) => void;
}

export function DistProjectCard({
  project,
  collapsed,
  onToggleCollapse,
  onDropToTeam,
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
}

function TeamBlock({ project, team, onDrop }: TeamBlockProps): JSX.Element {
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
          <TeamMemberChip key={m.applicationId} member={m} teamId={team.id} />
        ))}
      </div>
    </div>
  );
}

interface ChipProps {
  member: MentorDistributionTeamMember;
  teamId: number;
}

function TeamMemberChip({ member, teamId }: ChipProps): JSX.Element {
  const initials = initialsFor(member.firstName, member.lastName);
  const color = colorFor(member.studentId);
  const status = gdistStatusOf(member.status);

  const handleDragStart = (e: DragEvent<HTMLDivElement>): void => {
    writeDragPayload(e.nativeEvent, {
      kind: 'team-member',
      applicationId: member.applicationId,
      studentId: member.studentId,
      sourceTeamId: teamId,
    });
    e.currentTarget.classList.add(styles.dragging);
  };

  const handleDragEnd = (e: DragEvent<HTMLDivElement>): void => {
    e.currentTarget.classList.remove(styles.dragging);
  };

  return (
    <div
      className={styles.chip}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.avatar} style={{ background: color }}>
        {initials}
      </div>
      <div className={styles.chipBody}>
        <div className={styles.chipName}>
          {member.lastName} {member.firstName.charAt(0)}.
        </div>
        <div className={styles.chipSub}>
          {member.course} курс · {member.gpa.toFixed(1)} · {member.group || '—'}
        </div>
      </div>
      <span
        className={`${styles.statusBadge} ${styles[`status_${status.className}`]}`}
        title={status.label}
      >
        {status.shortLabel}
      </span>
    </div>
  );
}
