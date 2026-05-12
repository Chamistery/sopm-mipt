import { useState, type DragEvent } from 'react';

import type { MentorDistributionTeamMember } from '@/api/mentorDistribution';
import {
  hasApplicantDragData,
  readApplicantDragData,
  setApplicantDragData,
  type ApplicantDragPayload,
} from '../lib/dragData';
import { shortName } from '../lib/chipDisplay';
import styles from './DistTeamSlot.module.css';

export interface DistTeamSlotProps {
  /** ID проекта — для запрета drop из другого проекта. */
  projectId: number;
  teamId: number;
  /** Член команды на этом слоте, если есть. */
  member: MentorDistributionTeamMember | null;
  /** Drop из пула / другой команды этого проекта. `displacedApplicationId`
   *  — если slot был занят, чтобы родитель мог сначала вытеснить старого
   *  студента, а затем поставить нового (без потери members при maxSize). */
  onDropApplicant: (
    payload: ApplicantDragPayload,
    slotTeamId: number,
    displacedApplicationId: number | null,
  ) => void;
  /** Кнопка-крестик «убрать в пул» (доступна для recommended/unqualified). */
  onRemove: (applicationId: number) => void;
  /** Кнопка-галочка «Пригласить» (доступна для recommended). */
  onInvite: (applicationId: number) => void;
  /** Колбеки для подсветки целевой priority-группы в пуле. На dragstart
   *  чип сообщает свой priority+qualified — Page подсветит соответствующую
   *  группу в пуле, куда чип «вернётся» если его сюда дропнуть. */
  onChipDragStart?: (priority: number, qualified: boolean) => void;
  onChipDragEnd?: () => void;
  /** Disable actions (mutation pending). */
  disabled?: boolean;
}

/**
 * Один слот команды. Может быть:
 *   - empty       — drop-target, рисуется пунктирной рамкой
 *   - recommended — чёрная рамка, drag-source, кнопки «✕ убрать», «✓ пригласить»
 *   - unqualified — то же + бейдж «⚠ Не подходит»
 *   - accepted    — зелёная рамка, бейдж «✓ Принят», без drag/remove
 */
export function DistTeamSlot({
  projectId,
  teamId,
  member,
  onDropApplicant,
  onRemove,
  onInvite,
  onChipDragStart,
  onChipDragEnd,
  disabled,
}: DistTeamSlotProps): JSX.Element {
  const [dragOver, setDragOver] = useState(false);
  const [dragging, setDragging] = useState(false);

  // По прототипу (mentor.html:3013-3025 inviteStudent): после отправки
  // приглашения чип фиксируется — draggable=false, ✕ и ✓ скрыты,
  // показывается бейдж «Ожидает подтверждения». «Принят» (студент
  // подтвердил) — то же самое + зелёная рамка, бейдж «✓ Принят».
  // То есть оба статуса блокируют drag и actions.
  const isAccepted = member?.status === 'Принят';
  const isInvited = member?.status === 'Принято ментором';
  const isLocked = isAccepted || isInvited;

  const onDragOver = (e: DragEvent<HTMLDivElement>): void => {
    if (!hasApplicantDragData(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragOver) setDragOver(true);
  };

  const onDragLeave = (): void => setDragOver(false);

  const onDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragOver(false);
    const payload = readApplicantDragData(e.dataTransfer);
    if (!payload) return;
    if (payload.projectId !== projectId) return; // из другого проекта — игнор
    if (isLocked) return; // не заменять зафиксированного (приглашённого/принятого)
    if (member && member.applicationId === payload.applicationId) return; // no-op
    onDropApplicant(payload, teamId, member?.applicationId ?? null);
  };

  const startChipDrag = (e: DragEvent<HTMLDivElement>): void => {
    if (!member || isLocked) {
      e.preventDefault();
      return;
    }
    setApplicantDragData(e.dataTransfer, {
      applicationId: member.applicationId,
      projectId,
      priority: member.priority,
      sourceTeamId: teamId,
      qualified: member.qualified,
    });
    setDragging(true);
    onChipDragStart?.(member.priority, member.qualified);
  };

  const endChipDrag = (): void => {
    setDragging(false);
    onChipDragEnd?.();
  };

  if (!member) {
    return (
      <div
        className={`${styles.slot} ${styles.empty} ${dragOver ? styles.dragOverEmpty : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        data-team-id={teamId}
        data-empty
      >
        <span>Свободное место</span>
      </div>
    );
  }

  const draggable = !isLocked && !disabled;

  return (
    <div
      className={`${styles.slot} ${dragOver ? styles.dragOver : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      data-team-id={teamId}
    >
      <div
        className={`${styles.chip} ${isAccepted ? styles.chipAccepted : isInvited ? styles.chipInvited : styles.chipDraggable} ${dragging ? styles.chipDragging : ''}`}
        draggable={draggable}
        onDragStart={startChipDrag}
        onDragEnd={endChipDrag}
        data-application-id={member.applicationId}
      >
        <span className={styles.priorityBadge} title="Приоритет студента">
          П{member.priority}
        </span>
        <span className={styles.chipName}>{shortName(member.firstName, member.lastName)}</span>
        <span className={styles.chipMeta}>{member.course} курс</span>
        <span className={styles.chipGpa}>{member.gpa.toFixed(1)}</span>
        {!member.qualified && !isAccepted ? (
          <span className={styles.unqualBadge} title="Не подходит по требованиям">
            ⚠ Не подходит
          </span>
        ) : null}
        {isAccepted ? (
          <span className={styles.acceptedBadge}>✓ Принят</span>
        ) : isInvited ? (
          // Приглашение отправлено: только бейдж, без действий — ментор
          // больше ничего не может сделать со студентом, ждём ответ
          // (см. mentor.html:3013-3025).
          <span className={styles.invitedBadge}>Ожидает подтверждения</span>
        ) : (
          <>
            <button
              type="button"
              className={styles.removeBtn}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(member.applicationId);
              }}
              title="Убрать из команды (вернуть в пул)"
              aria-label="Убрать из команды"
              disabled={disabled}
            >
              ✕
            </button>
            <button
              type="button"
              className={styles.inviteBtn}
              onClick={(e) => {
                e.stopPropagation();
                onInvite(member.applicationId);
              }}
              title="Пригласить в команду"
              aria-label="Пригласить в команду"
              disabled={disabled}
            >
              ✓
            </button>
          </>
        )}
      </div>
    </div>
  );
}
