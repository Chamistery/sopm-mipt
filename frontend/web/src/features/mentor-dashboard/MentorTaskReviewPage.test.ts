import { describe, expect, it } from 'vitest';

import { actionsFor } from './lib/taskActions';

describe('actionsFor', () => {
  it('offers approve + reject for "Ожидает аппрува"', () => {
    expect(actionsFor('Ожидает аппрува').map((a) => a.kind)).toEqual(['approve', 'reject']);
  });

  it('offers accept + return for "На ревью"', () => {
    expect(actionsFor('На ревью').map((a) => a.kind)).toEqual(['accept', 'return']);
  });

  it('returns nothing for terminal/student-only states', () => {
    expect(actionsFor('Готово')).toHaveLength(0);
    expect(actionsFor('Назначена')).toHaveLength(0);
    expect(actionsFor('В работе')).toHaveLength(0);
    expect(actionsFor('Отклонена')).toHaveLength(0);
  });
});
