import { describe, expect, it } from 'vitest';

import { taskNeedsMentorAction, type TaskStatus } from './tasks';

describe('taskNeedsMentorAction', () => {
  it.each<[TaskStatus, boolean]>([
    ['Ожидает аппрува', true],
    ['На ревью', true],
    ['Назначена', false],
    ['В работе', false],
    ['Возвращена', false],
    ['Готово', false],
    ['Отклонена', false],
  ])('%s → %s', (status, expected) => {
    expect(taskNeedsMentorAction(status)).toBe(expected);
  });
});
