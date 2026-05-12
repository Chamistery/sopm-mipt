import type { MentorDistributionTeam } from '@/api/mentorDistribution';
import { DistTeamSlot } from './DistTeamSlot';
import type { ApplicantDragPayload } from '../lib/dragData';
import { arrangeSlots, setSlot, clearApplicantFromTeam } from '../lib/slotLayout';
import styles from './DistTeamCard.module.css';

export interface DistTeamCardProps {
  projectId: number;
  team: MentorDistributionTeam;
  /** Размер команды (max). UI рисует X / Y слотов. */
  maxSize: number;
  onDropApplicant: (
    payload: ApplicantDragPayload,
    slotTeamId: number,
    displacedApplicationId: number | null,
  ) => void;
  onRemoveMember: (applicationId: number) => void;
  onInviteMember: (applicationId: number) => void;
  onLaunch: (teamId: number) => void;
  /** Колбеки для подсветки целевой priority-группы в пуле. Page хранит
   *  `poolDragTarget` state и передаёт сюда сеттеры. */
  onChipDragStart?: (priority: number, qualified: boolean) => void;
  onChipDragEnd?: () => void;
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
  onChipDragStart,
  onChipDragEnd,
  disabled,
}: DistTeamCardProps): JSX.Element {
  const members = team.members ?? [];
  const acceptedCount = members.filter((m) => m.status === 'Принят').length;
  const totalCount = members.length;

  // Слоты — пользовательская разметка (localStorage): студент стоит ровно
  // в той ячейке, в которую был дропнут. Бэк не хранит slot_index, поэтому
  // расставляем клиентски. Раздаём members по сохранённым позициям, без-
  // позиционные раскладываются по первым свободным.
  const slots = arrangeSlots(team.id, maxSize, members);

  const handleSlotDrop = (
    payload: ApplicantDragPayload,
    slotTeamId: number,
    slotIndex: number,
    displacedApplicationId: number | null,
  ): void => {
    // Если перетащили из другой команды — очищаем layout исходной,
    // чтобы там не оставался stale slot reference.
    if (payload.sourceTeamId != null && payload.sourceTeamId !== slotTeamId) {
      clearApplicantFromTeam(payload.sourceTeamId, payload.applicationId);
    }
    setSlot(slotTeamId, slotIndex, payload.applicationId);
    onDropApplicant(payload, slotTeamId, displacedApplicationId);
  };

  const handleRemove = (applicationId: number): void => {
    clearApplicantFromTeam(team.id, applicationId);
    onRemoveMember(applicationId);
  };

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
            onDropApplicant={(payload, slotTeamId, displacedApplicationId) =>
              handleSlotDrop(payload, slotTeamId, idx, displacedApplicationId)
            }
            onRemove={handleRemove}
            onInvite={onInviteMember}
            onChipDragStart={onChipDragStart}
            onChipDragEnd={onChipDragEnd}
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
