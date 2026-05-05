/*
 * Карточка одной встречи — pixel-port из mentor.html (tab-meetings,
 * 1090–1167). Используется в обеих секциях («Предстоящие» / «Прошедшие»);
 * различия — оформление левой колонки (приглушённая для прошедших) и
 * условный блок «Резюме встречи».
 *
 * Confirm/decline — inline под телом, видны только для встреч в статусе
 * «Ожидает подтверждения» когда смотрит ментор. Decline-форма прячется
 * под кнопкой пока её не раскроют, чтобы не загромождать карточку.
 */

import type { JSX } from 'react';
import { useState } from 'react';

import type { Meeting, MeetingStatus } from '@/api/types';

import { formatRussianDate, formatTimeRange } from '../lib/meetingHelpers';
import styles from './MeetingCard.module.css';

interface Props {
  meeting: Meeting;
  /** True when the rendering user is the team mentor (controls confirm/decline visibility). */
  canMentorAct: boolean;
  /** True when the meeting is in the past (controls dimmed left column + summary block). */
  isPast: boolean;
  /** Имя автора + роль для подписи «Назначил: …». */
  createdByLabel?: string;
  onConfirm?: (meeting: Meeting) => void;
  onDecline?: (meeting: Meeting, reason: string) => void;
  isConfirming?: boolean;
  isDeclining?: boolean;
  actionError?: string | null;
}

export function MeetingCard({
  meeting,
  canMentorAct,
  isPast,
  createdByLabel,
  onConfirm,
  onDecline,
  isConfirming = false,
  isDeclining = false,
  actionError = null,
}: Props): JSX.Element {
  const { day, month } = formatRussianDate(meeting.meetingDate);
  const time = formatTimeRange(meeting.startTime, meeting.durationMinutes);
  const [declineMode, setDeclineMode] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const isPending = meeting.status === 'Ожидает подтверждения';
  const showActions = canMentorAct && isPending && !isPast;

  return (
    <article
      className={styles.card}
      aria-label={`Встреча: ${meeting.title ?? ''}`}
      data-testid="meeting-card"
    >
      <div className={`${styles.dateCol} ${isPast ? styles.dateColPast : ''}`}>
        <div className={styles.day}>{day}</div>
        <div className={styles.month}>{month}</div>
      </div>

      <div className={styles.body}>
        <div className={styles.title}>{meeting.title ?? '—'}</div>
        {time ? <div className={styles.time}>{time}</div> : null}
        {meeting.description ? <div className={styles.description}>{meeting.description}</div> : null}

        {/* Для предстоящих: Zoom-ссылка + «Назначил» в одну строку (см. mentor.html:1099-1105).
            Для прошедших: createdBy показываем после summary-блока. */}
        {!isPast && (meeting.conferenceLink || createdByLabel) ? (
          <div className={styles.metaRow}>
            {meeting.conferenceLink ? (
              <a
                href={meeting.conferenceLink}
                target="_blank"
                rel="noreferrer noopener"
                className={styles.zoomLink}
              >
                <ZoomIcon />
                Zoom-ссылка
              </a>
            ) : null}
            {createdByLabel ? <span className={styles.createdBy}>Назначил: {createdByLabel}</span> : null}
          </div>
        ) : null}

        {isPast && meeting.summary ? (
          <div className={styles.summaryBlock}>
            <div className={styles.summaryTitle}>Резюме встречи</div>
            <div className={styles.summaryBody}>{meeting.summary}</div>
          </div>
        ) : null}

        {isPast && createdByLabel ? (
          <div className={styles.createdByPast}>Назначил: {createdByLabel}</div>
        ) : null}

        {meeting.status === 'Отклонена' && meeting.mentorDeclineReason ? (
          <div className={styles.declineBlock}>
            <div className={styles.declineTitle}>Причина отказа</div>
            <div className={styles.declineBody}>{meeting.mentorDeclineReason}</div>
          </div>
        ) : null}

        {showActions ? (
          declineMode ? (
            <div className={styles.declineForm} role="group" aria-label="Отклонение встречи">
              <textarea
                className={styles.declineInput}
                placeholder="Опишите причину отказа — её увидит тимлид"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={2}
                aria-label="Причина отказа"
              />
              <div className={styles.declineActions}>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => {
                    setDeclineMode(false);
                    setDeclineReason('');
                  }}
                  disabled={isDeclining}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className={styles.btnDanger}
                  onClick={() => onDecline?.(meeting, declineReason.trim())}
                  disabled={!declineReason.trim() || isDeclining}
                >
                  {isDeclining ? 'Отклоняем…' : 'Отклонить встречу'}
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btnSuccess}
                onClick={() => onConfirm?.(meeting)}
                disabled={isConfirming}
              >
                <CheckIcon />
                {isConfirming ? 'Подтверждаем…' : 'Подтвердить'}
              </button>
              <button
                type="button"
                className={styles.btnDangerOutline}
                onClick={() => setDeclineMode(true)}
                disabled={isConfirming}
              >
                <CrossIcon />
                Отклонить
              </button>
            </div>
          )
        ) : null}

        {actionError ? <div className={styles.error}>{actionError}</div> : null}
      </div>

      <span className={`${styles.badge} ${badgeClass(meeting.status, isPast, styles)}`}>
        {badgeLabel(meeting.status)}
      </span>
    </article>
  );
}

function badgeLabel(status: MeetingStatus | undefined): string {
  switch (status) {
    case 'Состоялась':
      return 'состоялась';
    default:
      return status ?? '—';
  }
}

function badgeClass(
  status: MeetingStatus | undefined,
  isPast: boolean,
  s: Record<string, string>,
): string {
  if (status === 'Ожидает подтверждения') return s.badgeWarning ?? '';
  if (status === 'Состоялась') return s.badgeSuccess ?? '';
  if (status === 'Отклонена') return s.badgeDanger ?? '';
  if (status === 'Отменена') return s.badgeMuted ?? '';
  // «Подтверждена» — для будущих встреч приглушённый, для прошедших не показывается отдельно.
  if (isPast) return s.badgeMuted ?? '';
  return s.badgeNeutral ?? '';
}

function ZoomIcon(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossIcon(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
