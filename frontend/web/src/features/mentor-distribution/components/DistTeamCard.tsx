import type { MentorDistributionTeam } from '@/api/mentorDistribution';
import { DistTeamSlot } from './DistTeamSlot';
import type { ApplicantDragPayload } from '../lib/dragData';
import styles from './DistTeamCard.module.css';

export interface DistTeamCardProps {
  projectId: number;
  team: MentorDistributionTeam;
  /** Размер команды (max). UI рисует X / Y слотов. */
  maxSize: number;
  onDropApplicant: (payload: ApplicantDragPayload, slotTeamId: number) => void;
  onRemoveMember: (applicationId: number) => void;
  onInviteMember: (applicationId: number) => void;
  onLaunch: (teamId: number) => void;
  disabled?: boolean;
}

/**
 * Карточка одной команды на view-distribution. Слоты заполняются членами,
 * пустые слоты — drop-target. Кнопка «Запустить команду» включается только
 * когда хотя бы один член принят и нет ни одного «не-принятого» (рекомендован
 * или приглашён, но ещё не accepted).
 */
export function DistTeamCard({
  projectId,
  team,
  maxSize,
  onDropApplicant,
  onRemoveMember,
  onInviteMember,
  onLaunch,
  disabled,
}: DistTeamCardProps): JSX.Element {
  const acceptedCount = team.members.filter((m) => m.status === 'Принят').length;
  const totalCount = team.members.length;

  // Слоты — фиксируем максимально возможный размер, заполняем участниками,
  // оставшиеся = empty (drop-targets).
  const slots = Array.from({ length: maxSize }, (_, i) => team.members[i] ?? null);

  // «Готов к запуску» = есть участники, и все они приняты.
  const readyToLaunch = totalCount > 0 && acceptedCount === totalCount;

  return (
    <article className={styles.card} data-team-id={team.id}>
      <div className={styles.header}>
        <h3 className={styles.title}>{team.name}</h3>
        <span className={styles.count}>
          {acceptedCount} / {maxSize}
        </span>
      </div>
      <div className={styles.slots}>
        {slots.map((member, idx) => (
          <DistTeamSlot
            key={`${team.id}-slot-${idx}`}
            projectId={projectId}
            teamId={team.id}
            member={member}
            onDropApplicant={onDropApplicant}
            onRemove={onRemoveMember}
            onInvite={onInviteMember}
            disabled={disabled}
          />
        ))}
      </div>

      <button
        type="button"
        className={`${styles.launchBtn} ${readyToLaunch ? styles.launchEnabled : styles.launchDisabled}`}
        disabled={!readyToLaunch || disabled}
        onClick={() => onLaunch(team.id)}
        aria-label={readyToLaunch ? 'Запустить команду' : 'Не все участники приняты'}
      >
        {readyToLaunch ? 'Запустить команду' : 'Не все участники приняты'}
      </button>
    </article>
  );
}
