import { describe, expect, it } from 'vitest';

import {
  chainUrl,
  parseChain,
  popToChain,
  pushToChain,
  serializeChain,
} from './archiveChain';

describe('archiveChain', () => {
  describe('parseChain', () => {
    it('пустой/null → пустой массив', () => {
      expect(parseChain(null)).toEqual([]);
      expect(parseChain('')).toEqual([]);
      expect(parseChain(undefined)).toEqual([]);
    });

    it('парсит CSV из чисел', () => {
      expect(parseChain('100,101,102')).toEqual([100, 101, 102]);
    });

    it('отбрасывает нечисловые/нулевые токены', () => {
      expect(parseChain('100,foo,,0,-3,42')).toEqual([100, 42]);
    });

    it('тримит пробелы', () => {
      expect(parseChain(' 1 , 2 , 3 ')).toEqual([1, 2, 3]);
    });
  });

  describe('serializeChain', () => {
    it('склеивает массив через запятую', () => {
      expect(serializeChain([100, 101])).toBe('100,101');
      expect(serializeChain([])).toBe('');
    });
  });

  describe('pushToChain', () => {
    it('добавляет projectId в конец', () => {
      expect(pushToChain([100], 101)).toEqual([100, 101]);
    });

    it('не дублирует последний элемент', () => {
      expect(pushToChain([100, 101], 101)).toEqual([100, 101]);
    });

    it('игнорирует нулевые/невалидные id', () => {
      expect(pushToChain([100], 0)).toEqual([100]);
      expect(pushToChain([100], NaN)).toEqual([100]);
    });
  });

  describe('popToChain', () => {
    it('возвращает префикс ДО target (исключительно)', () => {
      expect(popToChain([100, 101, 102], 101)).toEqual([100]);
    });

    it('пустой массив если target отсутствует', () => {
      expect(popToChain([100, 101], 999)).toEqual([]);
    });

    it('пустой массив если target — первый элемент', () => {
      expect(popToChain([100, 101], 100)).toEqual([]);
    });
  });

  describe('chainUrl', () => {
    it('добавляет ?chain=… к pathname', () => {
      expect(chainUrl('/mentor/archive/teams/310', [100, 101])).toBe(
        '/mentor/archive/teams/310?chain=100,101',
      );
    });

    it('опускает chain если массив пустой', () => {
      expect(chainUrl('/mentor/archive/projects/100', [])).toBe(
        '/mentor/archive/projects/100',
      );
    });

    it('сохраняет existing query params', () => {
      const sp = new URLSearchParams('tab=meetings');
      expect(chainUrl('/mentor/archive/teams/310', [100], sp)).toContain('tab=meetings');
      expect(chainUrl('/mentor/archive/teams/310', [100], sp)).toContain('chain=100');
    });
  });
});
