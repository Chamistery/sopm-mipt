import { describe, expect, it } from 'vitest';

import type { Sprint } from '@/api/teams';
import type { TeamReport } from '@/api/teamReports';

import {
  averageScore,
  formatDateRange,
  reportBadge,
  reportTitle,
  sortReports,
} from './sprintReportHelpers';

describe('averageScore', () => {
  it('возвращает null, если оценок нет', () => {
    expect(averageScore([])).toBeNull();
  });

  it('усредняет и округляет до одного знака', () => {
    expect(averageScore([{ score: 8 }, { score: 7 }])).toBe(7.5);
    expect(averageScore([{ score: 9 }, { score: 8 }, { score: 7 }, { score: 8 }])).toBe(8);
  });

  it('округляет 7.666 до 7.7', () => {
    expect(averageScore([{ score: 8 }, { score: 8 }, { score: 7 }])).toBe(7.7);
  });
});

describe('reportBadge', () => {
  it('Отправлен → «Ждёт проверки», warning', () => {
    expect(reportBadge('Отправлен', null)).toEqual({ text: 'Ждёт проверки', tone: 'warning' });
  });

  it('Проверен с целой оценкой — «Проверен · 8/10»', () => {
    expect(reportBadge('Проверен', 8)).toEqual({ text: 'Проверен · 8/10', tone: 'success' });
  });

  it('Проверен с дробной — «Проверен · 7.7/10»', () => {
    expect(reportBadge('Проверен', 7.7)).toEqual({ text: 'Проверен · 7.7/10', tone: 'success' });
  });

  it('Проверен без оценок — «Проверен» без числа', () => {
    expect(reportBadge('Проверен', null)).toEqual({ text: 'Проверен', tone: 'success' });
  });

  it('Черновик — muted', () => {
    expect(reportBadge('Черновик', null)).toEqual({ text: 'Черновик', tone: 'muted' });
  });
});

describe('sortReports', () => {
  const r = (id: number, sprintId: number): TeamReport => ({
    id,
    sprintId,
    teamId: 1,
    status: 'Отправлен',
  });
  const sprints = new Map<number, Sprint>([
    [10, { id: 10, projectId: 1, number: 1, startDate: '', endDate: '', status: 'Завершён' }],
    [11, { id: 11, projectId: 1, number: 2, startDate: '', endDate: '', status: 'Активный' }],
    [12, { id: 12, projectId: 1, number: 3, startDate: '', endDate: '', status: 'Запланирован' }],
  ]);

  it('сортирует по номеру спринта DESC (новый сверху)', () => {
    const sorted = sortReports([r(1, 10), r(2, 12), r(3, 11)], sprints);
    expect(sorted.map((x) => x.sprintId)).toEqual([12, 11, 10]);
  });

  it('фолбэк на sprintId DESC, если данных по спринту нет', () => {
    const sorted = sortReports([r(1, 10), r(2, 30), r(3, 20)], new Map());
    expect(sorted.map((x) => x.sprintId)).toEqual([30, 20, 10]);
  });
});

describe('formatDateRange', () => {
  it('форматирует валидный диапазон', () => {
    expect(formatDateRange('2026-03-17', '2026-04-06')).toBe('17 мар — 6 апр');
  });

  it('пустая строка на битых датах', () => {
    expect(formatDateRange('', '2026-04-06')).toBe('');
    expect(formatDateRange('not-a-date', '2026-04-06')).toBe('');
  });
});

describe('reportTitle', () => {
  it('форматирует «Спринт 2 (17 мар — 6 апр)»', () => {
    const sprint: Sprint = {
      id: 11,
      projectId: 1,
      number: 2,
      startDate: '2026-03-17',
      endDate: '2026-04-06',
      status: 'Активный',
    };
    expect(reportTitle({ id: 1, sprintId: 11, teamId: 1, status: 'Отправлен' }, sprint)).toBe(
      'Спринт 2 (17 мар — 6 апр)',
    );
  });

  it('фолбэк на «Отчёт спринта #N», если спринт не найден', () => {
    expect(reportTitle({ id: 1, sprintId: 99, teamId: 1, status: 'Отправлен' }, null)).toBe(
      'Отчёт спринта #99',
    );
  });

  it('без диапазона дат — «Спринт N»', () => {
    const sprint: Sprint = {
      id: 11,
      projectId: 1,
      number: 2,
      startDate: '',
      endDate: '',
      status: 'Активный',
    };
    expect(reportTitle({ id: 1, sprintId: 11, teamId: 1, status: 'Отправлен' }, sprint)).toBe(
      'Спринт 2',
    );
  });
});
