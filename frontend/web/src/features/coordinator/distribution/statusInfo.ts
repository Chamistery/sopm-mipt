/*
 * Маппинг ApplicationStatus → UI-presentation (label / класс / описание).
 * Pixel-port из admin.html:2654-2664.
 *
 * GdistStatusKey соответствует одному из трёх «слотов» прототипа: accepted /
 * invited / recommend. Реальный ApplicationStatus с бэкенда уже имеет больше
 * значений (Не рекомендован, Не подходит, и т. д.) — для координатора в UI
 * они мапятся в ближайший «слот».
 */

import type { ApplicationStatus } from '@/api/applications';

export type GdistStatusKey = 'accepted' | 'invited' | 'recommend';

export interface GdistStatusInfo {
  key: GdistStatusKey;
  label: string;
  shortLabel: string;
  className: 'accepted' | 'invited' | 'recommend';
  /** ApplicationStatus, в который надо перевести application при выборе. */
  apiStatus: ApplicationStatus;
  /** Tooltip-описание; pixel-port admin.html:2655-2659. */
  description: string;
}

export const GDIST_STATUSES: GdistStatusInfo[] = [
  {
    key: 'accepted',
    label: 'Принят',
    shortLabel: 'Принят',
    className: 'accepted',
    apiStatus: 'Принят',
    description: 'Студент зафиксирован в команде',
  },
  {
    key: 'invited',
    label: 'Заявка отправлена',
    shortLabel: 'Отправлена',
    className: 'invited',
    apiStatus: 'Принято ментором',
    description: 'Приглашение отправлено, студент ещё не ответил',
  },
  {
    key: 'recommend',
    label: 'Заявка не отправлена',
    shortLabel: 'Не отправлена',
    className: 'recommend',
    apiStatus: 'Рекомендован',
    description: 'Студент в списке команды, приглашение ещё не отправлено',
  },
];

export function gdistStatusOf(status: ApplicationStatus): GdistStatusInfo {
  switch (status) {
    case 'Принят':
      return GDIST_STATUSES[0];
    case 'Принято ментором':
      return GDIST_STATUSES[1];
    case 'Рекомендован':
    case 'Не рекомендован':
    case 'Не подходит':
    case 'Ожидает':
    default:
      return GDIST_STATUSES[2];
  }
}
