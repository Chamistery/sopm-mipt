import { describe, expect, it } from 'vitest';

import {
  avgScore,
  projectFinalGrade,
  finishedAt,
  formatRuFinishedAt,
  semesterLabel,
} from './archiveAggregations';

describe('archiveAggregations', () => {
  describe('avgScore', () => {
    it('возвращает null на пустом списке', () => {
      expect(avgScore([])).toBeNull();
    });

    it('считает среднее с округлением до 0.1', () => {
      expect(avgScore([{ score: 5 }, { score: 4 }, { score: 5 }])).toBe(4.7);
      expect(avgScore([{ score: 8 }, { score: 9 }])).toBe(8.5);
      expect(avgScore([{ score: 7 }])).toBe(7);
    });
  });

  describe('projectFinalGrade', () => {
    it('возвращает «—» если команд нет', () => {
      expect(projectFinalGrade([])).toBe('—');
    });

    it('«Зачтено с замечаниями» если хотя бы у одной команды нет оценок', () => {
      expect(projectFinalGrade([8.0, null])).toBe('Зачтено с замечаниями');
    });

    it('«Зачтено» если средняя по проекту >= 7', () => {
      expect(projectFinalGrade([8.0, 7.5])).toBe('Зачтено');
      expect(projectFinalGrade([7.0])).toBe('Зачтено');
    });

    it('«Зачтено с замечаниями» если средняя ниже 7', () => {
      expect(projectFinalGrade([6.0, 6.5])).toBe('Зачтено с замечаниями');
    });
  });

  describe('finishedAt', () => {
    it('возвращает null если спринтов нет', () => {
      expect(finishedAt([])).toBeNull();
    });

    it('возвращает максимальную дату завершения', () => {
      expect(
        finishedAt([
          { endDate: '2025-09-30' },
          { endDate: '2025-12-15' },
          { endDate: '2025-10-30' },
        ]),
      ).toBe('2025-12-15');
    });
  });

  describe('formatRuFinishedAt', () => {
    it('возвращает «—» для null', () => {
      expect(formatRuFinishedAt(null)).toBe('—');
    });

    it('форматирует ISO в RU-формат', () => {
      expect(formatRuFinishedAt('2025-12-15')).toBe('15 декабря 2025');
      expect(formatRuFinishedAt('2026-01-05')).toBe('5 января 2026');
    });

    it('возвращает исходную строку при невалидном формате', () => {
      expect(formatRuFinishedAt('foo')).toBe('foo');
    });
  });

  describe('semesterLabel', () => {
    it('возвращает пустую строку для null', () => {
      expect(semesterLabel(null)).toBe('');
    });

    it('декабрь и январь → осенний семестр учебного года', () => {
      expect(semesterLabel('2025-12-15')).toBe('Осенний семестр 2025/26');
      expect(semesterLabel('2026-01-30')).toBe('Осенний семестр 2025/26');
    });

    it('июнь → весенний семестр учебного года', () => {
      expect(semesterLabel('2025-06-15')).toBe('Весенний семестр 2024/25');
    });

    it('сентябрь → осенний семестр', () => {
      expect(semesterLabel('2024-09-30')).toBe('Осенний семестр 2024/25');
    });
  });
});
