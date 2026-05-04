import { describe, expect, it } from 'vitest';

import type { TaskDto } from '@/api/teams';
import {
  calcEffectiveStatus,
  canCancel,
  canSubmitForReview,
  isLockedForStudent,
  statusVisual,
  wasOverdue,
} from './taskStatus';

function makeTask(overrides: Partial<TaskDto>): TaskDto {
  return {
    id: 1,
    teamId: 1,
    sprintId: 1,
    assigneeId: 10,
    name: 'Sample',
    description: null,
    status: 'В работе',
    hours: 8,
    startDate: '2026-04-01',
    endDate: '2026-04-05',
    mr: null,
    workDescription: null,
    ...overrides,
  };
}

describe('calcEffectiveStatus', () => {
  it('returns Просрочена when «В работе» is past its end date', () => {
    const task = makeTask({ status: 'В работе', endDate: '2026-04-01' });
    expect(calcEffectiveStatus(task, '2026-04-08')).toBe('Просрочена');
  });

  it('does not change a terminal status even when overdue', () => {
    const task = makeTask({ status: 'Готово', endDate: '2026-04-01' });
    expect(calcEffectiveStatus(task, '2026-04-08')).toBe('Готово');
  });

  it('keeps «На ревью» as is on past tasks', () => {
    const task = makeTask({ status: 'На ревью', endDate: '2026-04-01' });
    expect(calcEffectiveStatus(task, '2026-04-08')).toBe('На ревью');
  });

  it('treats «В работе» before deadline as is', () => {
    const task = makeTask({ status: 'В работе', endDate: '2026-04-10' });
    expect(calcEffectiveStatus(task, '2026-04-05')).toBe('В работе');
  });
});

describe('wasOverdue', () => {
  it('returns true when the historical flag is set', () => {
    const task = makeTask({ status: 'Готово', wasOverdue: true });
    expect(wasOverdue(task, '2026-04-08')).toBe(true);
  });

  it('falls back to the effective-status check', () => {
    const task = makeTask({ status: 'В работе', endDate: '2026-04-01' });
    expect(wasOverdue(task, '2026-04-08')).toBe(true);
  });
});

describe('isLockedForStudent / canSubmitForReview / canCancel', () => {
  it('locks the form for review/done/rejected', () => {
    expect(isLockedForStudent('На ревью')).toBe(true);
    expect(isLockedForStudent('Готово')).toBe(true);
    expect(isLockedForStudent('Отклонена')).toBe(true);
    expect(isLockedForStudent('В работе')).toBe(false);
  });

  it('allows submitting in-progress / returned / overdue', () => {
    expect(canSubmitForReview('В работе')).toBe(true);
    expect(canSubmitForReview('Возвращена')).toBe(true);
    expect(canSubmitForReview('Просрочена')).toBe(true);
    expect(canSubmitForReview('Готово')).toBe(false);
  });

  it('only allows cancelling pending-approval tasks', () => {
    expect(canCancel('Ожидает аппрува')).toBe(true);
    expect(canCancel('В работе')).toBe(false);
  });
});

describe('statusVisual', () => {
  it('returns visuals for every effective status', () => {
    const v = statusVisual('Возвращена');
    expect(v.bg).toBeDefined();
    expect(v.chipBg).toBeDefined();
    expect(v.text).toBeDefined();
  });
});
