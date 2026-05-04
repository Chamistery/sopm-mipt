/*
 * Таб «Встречи» страницы команды у ментора. Заглушка до следующей итерации.
 *
 * Реальный функционал (расписание, подтверждение/отклонение встреч)
 * описан в прототипе mentor.html (view-team, tab-meetings) и будет
 * перенесён отдельным промтом. Архивный (read-only) вариант уже
 * реализован в ArchiveTeamPage.
 */

import type { JSX } from 'react';

import styles from './MentorTeamMeetingsTab.module.css';

export function MentorTeamMeetingsTab(): JSX.Element {
  return (
    <div className={styles.placeholder} role="status">
      <div className={styles.title}>Раздел в разработке</div>
      <div className={styles.body}>
        «Встречи» появятся в следующей итерации. Пока что встречи можно посмотреть в архиве
        завершённого проекта.
      </div>
    </div>
  );
}
