/*
 * Личная страница распределённого студента-участника. Намеренно
 * отделена от StudentProjectPage (тимлид) — у участника нет действий
 * вроде «выдать задачу», «принять отчёт», «сменить лидера». Здесь
 * только read-only сводка: проект, состав команды, Гант текущего
 * спринта.
 *
 * Точка входа: /student/team. Редирект сюда делается из
 * StudentCatalogPage при обнаружении команды у пользователя (через
 * useTeamContext → 200). Если у пользователя нет команды, открыв этот
 * URL напрямую он увидит «вы не распределены».
 */

import type { JSX } from 'react';
import { Navigate } from 'react-router-dom';

import { ApiError } from '@/api/client';
import { useRequireUser } from '@/auth/useCurrentUser';
import { GanttChart } from '@/features/student-project/components/GanttChart';
import { useGantt } from '@/features/student-project/hooks/useGantt';
import { useTeamContext } from '@/features/student-project/hooks/useTeamContext';
import { avatarColor, fullNameWithMiddle, initials } from '@/features/student-project/lib/people';

import styles from './StudentTeamPage.module.css';

export function StudentTeamPage(): JSX.Element {
  const me = useRequireUser();
  const teamQuery = useTeamContext(me.userId);

  if (teamQuery.isLoading) {
    return <div className={styles.placeholder}>Загружаем команду…</div>;
  }

  if (teamQuery.error) {
    const err = teamQuery.error as unknown;
    if (err instanceof ApiError && err.status === 404) {
      // Нет команды — отправляем в каталог проектов.
      return <Navigate to="/student" replace />;
    }
    const msg =
      err instanceof ApiError ? `Ошибка ${err.status}: ${err.message}` : 'Не удалось загрузить данные команды.';
    return <div className={styles.error}>{msg}</div>;
  }

  const team = teamQuery.data;
  if (!team) return <div className={styles.placeholder}>Загружаем команду…</div>;

  return <Loaded team={team} currentUserId={me.userId} />;
}

interface LoadedProps {
  team: NonNullable<ReturnType<typeof useTeamContext>['data']>;
  currentUserId: number;
}

function Loaded({ team, currentUserId }: LoadedProps): JSX.Element {
  const ganttQuery = useGantt(team.teamId, team.currentSprint.id);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{team.projectTitle}</h1>
          <span className={styles.subtitle}>
            {team.initiator ?? '—'} ·{' '}
            {team.mentor
              ? `Ментор: ${team.mentor.lastName} ${team.mentor.firstName.charAt(0)}.`
              : 'Ментор: —'}{' '}
            · Спринт {team.currentSprint.number}/{team.sprintsTotal}
          </span>
        </div>
        <span className={styles.teamBadge}>{team.teamName}</span>
      </header>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Состав команды</h2>
        <div className={styles.memberList}>
          {team.members.map((m) => {
            const isMe = m.userId === currentUserId;
            const isLeader = m.isLeader;
            const cls = [
              styles.member,
              isLeader ? styles.leader : '',
              isMe ? styles.me : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <div key={m.userId} className={cls}>
                <div
                  className={styles.avatar}
                  style={{ background: avatarColor(m.userId) }}
                  aria-hidden="true"
                >
                  {initials(m)}
                </div>
                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>
                    {fullNameWithMiddle(m)}
                    {isMe ? ' (вы)' : ''}
                  </span>
                  <span className={styles.memberRole}>{m.projectRole ?? '—'}</span>
                </div>
                {isLeader ? <span className={styles.leaderTag}>тимлид</span> : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className={`${styles.card} ${styles.ganttCard}`}>
        {ganttQuery.isLoading ? (
          <div className={styles.placeholder}>Загружаем диаграмму Ганта…</div>
        ) : ganttQuery.error || !ganttQuery.data ? (
          <div className={styles.error}>Не удалось загрузить диаграмму Ганта.</div>
        ) : (
          // mode='mentor' = read-only без кнопки добавления и редактирования;
          // студенту-участнику кликом по задаче ничего не показываем (no-op).
          <GanttChart
            data={ganttQuery.data}
            todayIso={new Date().toISOString().slice(0, 10)}
            currentUserId={currentUserId}
            canEditAll={false}
            canAddTask={false}
            mode="mentor"
            onTaskClick={() => {}}
            onAddTask={() => {}}
            sprintNumber={team.currentSprint.number}
            sprintsTotal={team.sprintsTotal}
          />
        )}
      </section>
    </div>
  );
}
