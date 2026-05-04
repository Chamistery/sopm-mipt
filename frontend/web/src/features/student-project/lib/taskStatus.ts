/*
 * Утилиты для интерпретации статусов задачи на UI.
 *
 * Бэк хранит «жёсткий» набор статусов (см. ADR 0001). Фронт умеет вычислять
 * «эффективный» статус с учётом того, что задача в работе уже стала
 * просроченной (жёлтое обведение бара), и подбирать цвет/класс бара.
 */

import type { TaskDto, TaskStatus } from '@/api/teams';

import { parseISODate } from './dates';

export type EffectiveTaskStatus = TaskStatus | 'Просрочена';

const TERMINAL = new Set<TaskStatus>(['На ревью', 'Готово', 'Отклонена', 'Возвращена']);

/** Возвращает статус с учётом просрочки (для задач «В работе» / «Назначена»). */
export function calcEffectiveStatus(task: TaskDto, todayIso: string): EffectiveTaskStatus {
  if (TERMINAL.has(task.status) || task.status === 'Ожидает аппрува') return task.status;
  const today = parseISODate(todayIso).getTime();
  const end = parseISODate(task.endDate).getTime();
  if (today > end && task.status !== 'Готово') return 'Просрочена';
  return task.status;
}

/** Был ли таск когда-либо просрочен (исторический флаг с бэка + текущий расчёт). */
export function wasOverdue(task: TaskDto, todayIso: string): boolean {
  if (task.wasOverdue) return true;
  return calcEffectiveStatus(task, todayIso) === 'Просрочена';
}

export interface StatusVisual {
  /** Hex или CSS-переменная, основной цвет бара. */
  bg: string;
  /** Цвет рамки/обводки (для returned/просрочки). */
  border?: string;
  /** Цвет текста для статус-чипа. */
  text: string;
  /** Фон для статус-чипа. */
  chipBg: string;
}

const VISUALS: Record<EffectiveTaskStatus, StatusVisual> = {
  'Ожидает аппрува': {
    bg: '#b8c0d4',
    text: 'var(--color-text-muted)',
    chipBg: 'var(--color-surface-alt)',
  },
  Назначена: {
    bg: '#a5b4fc',
    text: 'var(--color-text-muted)',
    chipBg: 'var(--color-surface-alt)',
  },
  'В работе': { bg: '#60a5fa', text: 'var(--color-accent)', chipBg: '#dbeafe' },
  'На ревью': {
    bg: '#6d5dd3',
    text: 'var(--color-purple)',
    chipBg: 'var(--color-purple-bg)',
  },
  Возвращена: {
    bg: 'var(--color-warning-bg)',
    border: 'var(--color-warning)',
    text: 'var(--color-warning)',
    chipBg: 'var(--color-warning-bg)',
  },
  Готово: { bg: '#34d399', text: 'var(--color-success)', chipBg: 'var(--color-success-bg)' },
  Отклонена: {
    bg: '#f1d1d1',
    border: 'var(--color-danger)',
    text: 'var(--color-danger)',
    chipBg: 'var(--color-danger-bg)',
  },
  Просрочена: {
    bg: '#60a5fa',
    border: 'var(--color-danger)',
    text: 'var(--color-danger)',
    chipBg: 'var(--color-danger-bg)',
  },
};

export function statusVisual(status: EffectiveTaskStatus): StatusVisual {
  return VISUALS[status];
}

export function isLockedForStudent(status: EffectiveTaskStatus): boolean {
  // Студент не редактирует задачу, пока она у ментора (review) или закрыта.
  return status === 'На ревью' || status === 'Готово' || status === 'Отклонена';
}

export function canSubmitForReview(status: EffectiveTaskStatus): boolean {
  return status === 'В работе' || status === 'Возвращена' || status === 'Просрочена';
}

export function canCancel(status: EffectiveTaskStatus): boolean {
  return status === 'Ожидает аппрува';
}
