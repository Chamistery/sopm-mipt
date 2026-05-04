/*
 * Таб «Встречи» страницы команды у ментора.
 *
 * Pixel-port из mentor.html (view-team, tab-meetings 1078–1170 + модалка
 * 1651–1693). Делит встречи на «Предстоящие» (по возрастанию) и
 * «Прошедшие» (по убыванию) по полю `meetingDate + startTime` в
 * местном времени браузера — статус используем только для бейджа.
 *
 * Для встреч в статусе «Ожидает подтверждения» ментор видит inline-кнопки
 * confirm/decline. Decline раскрывает inline-форму с обязательным reason.
 */

import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { ApiError } from '@/api/client';
import type { Meeting } from '@/api/types';

import { AddMeetingModal } from '../components/AddMeetingModal';
import { MeetingCard } from '../components/MeetingCard';
import { useMeetings, useCreateMeeting, useUpdateMeetingStatus } from '../hooks/useMeetings';
import { useTeam } from '../hooks/useTeam';
import { splitMeetings } from '../lib/meetingHelpers';
import styles from './MentorTeamMeetingsTab.module.css';

interface Props {
  teamId: number;
}

export function MentorTeamMeetingsTab({ teamId }: Props): JSX.Element {
  const meetingsQuery = useMeetings(teamId);
  const teamQuery = useTeam(teamId);

  const [showModal, setShowModal] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [actionState, setActionState] = useState<{
    meetingId: number;
    decision: 'confirm' | 'decline';
    error?: string | null;
  } | null>(null);

  const createMutation = useCreateMeeting(teamId);
  const updateStatusMutation = useUpdateMeetingStatus(teamId);

  // Авто-скрытие inline-баннера через 3 секунды.
  useEffect(() => {
    if (!banner) return;
    const id = window.setTimeout(() => setBanner(null), 3000);
    return () => window.clearTimeout(id);
  }, [banner]);

  // Карта createdById → подпись для футера карточки. Берём из team.members
  // + leader. Тимлида подписываем «(тимлид)», остальных — по роли в команде
  // или дефолтным «(участник)»; ментор — отдельный case (мы знаем его по
  // отсутствию в members, но рассмотрим current user у parent — в данный
  // момент карта строится только из team — ментор подписан как «ментор»
  // если совпадает с MentorId проекта, что нам недоступно тут; просто
  // пишем фамилию).
  const createdByLabels = useMemo(() => {
    const team = teamQuery.data;
    const labels = new Map<number, string>();
    if (!team) return labels;
    for (const m of team.members ?? []) {
      const first = m.user.firstName?.charAt(0) ?? '';
      const display = `${m.user.lastName} ${first}.`.trim();
      const isLeader = team.leaderId === m.userId;
      labels.set(m.userId, `${display} (${isLeader ? 'тимлид' : 'участник'})`);
    }
    return labels;
  }, [teamQuery.data]);

  const { upcoming, past } = useMemo(
    () => splitMeetings(meetingsQuery.data ?? []),
    [meetingsQuery.data],
  );

  if (meetingsQuery.isLoading) {
    return <div className={styles.placeholder}>Загружаем встречи…</div>;
  }
  if (meetingsQuery.error) {
    return (
      <div className={styles.error}>
        {meetingsQuery.error instanceof ApiError
          ? `Ошибка ${meetingsQuery.error.status}: ${meetingsQuery.error.message}`
          : 'Не удалось загрузить встречи'}
      </div>
    );
  }

  function handleConfirm(meeting: Meeting): void {
    if (meeting.id == null) return;
    setActionState({ meetingId: meeting.id, decision: 'confirm', error: null });
    updateStatusMutation.mutate(
      { meeting, decision: 'confirm' },
      {
        onSuccess: () => setActionState(null),
        onError: (err) => {
          setActionState({
            meetingId: meeting.id!,
            decision: 'confirm',
            error:
              err instanceof ApiError
                ? `Ошибка ${err.status}: ${err.message}`
                : err.message || 'Не удалось подтвердить встречу',
          });
        },
      },
    );
  }

  function handleDecline(meeting: Meeting, reason: string): void {
    if (meeting.id == null) return;
    setActionState({ meetingId: meeting.id, decision: 'decline', error: null });
    updateStatusMutation.mutate(
      { meeting, decision: 'decline', declineReason: reason },
      {
        onSuccess: () => setActionState(null),
        onError: (err) => {
          setActionState({
            meetingId: meeting.id!,
            decision: 'decline',
            error:
              err instanceof ApiError
                ? `Ошибка ${err.status}: ${err.message}`
                : err.message || 'Не удалось отклонить встречу',
          });
        },
      },
    );
  }

  return (
    <>
      <div className={styles.head}>
        <h2 className={styles.sectionTitle}>Встречи команды</h2>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => setShowModal(true)}
        >
          <PlusIcon /> Назначить встречу
        </button>
      </div>

      {banner ? (
        <div className={styles.banner} role="status">
          {banner}
        </div>
      ) : null}

      <Section title="Предстоящие">
        {upcoming.length === 0 ? (
          <div className={styles.empty}>Предстоящих встреч пока нет.</div>
        ) : (
          <div className={styles.list}>
            {upcoming.map((m) => (
              <MeetingCard
                key={m.id}
                meeting={m}
                canMentorAct
                isPast={false}
                createdByLabel={m.createdById ? createdByLabels.get(m.createdById) : undefined}
                onConfirm={handleConfirm}
                onDecline={handleDecline}
                isConfirming={
                  actionState != null &&
                  actionState.meetingId === m.id &&
                  actionState.decision === 'confirm' &&
                  updateStatusMutation.isPending
                }
                isDeclining={
                  actionState != null &&
                  actionState.meetingId === m.id &&
                  actionState.decision === 'decline' &&
                  updateStatusMutation.isPending
                }
                actionError={
                  actionState != null && actionState.meetingId === m.id
                    ? (actionState.error ?? null)
                    : null
                }
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="Прошедшие">
        {past.length === 0 ? (
          <div className={styles.empty}>Прошедших встреч ещё нет.</div>
        ) : (
          <div className={styles.list}>
            {past.map((m) => (
              <MeetingCard
                key={m.id}
                meeting={m}
                canMentorAct
                isPast
                createdByLabel={m.createdById ? createdByLabels.get(m.createdById) : undefined}
              />
            ))}
          </div>
        )}
      </Section>

      {showModal ? (
        <AddMeetingModal
          onClose={() => setShowModal(false)}
          onSubmit={(input) =>
            createMutation.mutate(input, {
              onSuccess: () => {
                setShowModal(false);
                setBanner('Встреча назначена');
                createMutation.reset();
              },
            })
          }
          isSubmitting={createMutation.isPending}
          serverError={
            createMutation.error
              ? createMutation.error instanceof ApiError
                ? `Ошибка ${createMutation.error.status}: ${createMutation.error.message}`
                : createMutation.error.message
              : null
          }
        />
      ) : null}
    </>
  );
}

interface SectionProps {
  title: string;
  children: JSX.Element;
}

function Section({ title, children }: SectionProps): JSX.Element {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>{title}</div>
      {children}
    </section>
  );
}

function PlusIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
