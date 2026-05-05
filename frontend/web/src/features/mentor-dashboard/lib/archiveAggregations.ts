/*
 * Aggregations для архивной карточки проекта.
 *
 * Бэк не хранит «средний балл команды» и «итог проекта» отдельными полями —
 * эти производные считаем здесь. Когда/если backend добавит соответствующие
 * колонки (см. обсуждение в задаче об архиве), хелперы нужно будет заменить
 * на чтение из API.
 *
 *   avgScore     — среднее по всем sprintScores команды (0..10).
 *                  Возврат `null` если оценок нет — UI показывает «—».
 *
 *   finalGrade   — текстовая итоговая метка проекта:
 *                    «Зачтено»                — все команды имеют оценки и
 *                                               средняя по проекту >= 7.0
 *                    «Зачтено с замечаниями»  — иначе (но команды есть)
 *                    «—»                      — команд / оценок нет
 *
 *   finishedAt   — последняя `endDate` среди спринтов проекта; формат
 *                  локализуется в UI (RU). Если спринтов нет — null.
 *
 *   semesterLabel — производное «Осенний семестр YYYY/YY» / «Весенний семестр
 *                   YYYY/YY» по `finishedAt`: декабрь-февраль → осенний,
 *                   июнь-август → весенний, иначе по месяцу.
 */

import type { SprintScore } from '@/api/sprintScores';
import type { Sprint } from '@/api/teams';

const RU_MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

/**
 * Среднее по списку оценок. Возвращает `null` для пустого списка
 * (UI показывает «—»). Округление до 0.1.
 */
export function avgScore(
  scores: ReadonlyArray<Pick<SprintScore, 'score'>>,
): number | null {
  if (scores.length === 0) return null;
  const sum = scores.reduce((acc, s) => acc + s.score, 0);
  return Math.round((sum / scores.length) * 10) / 10;
}

/**
 * Итоговая текстовая метка проекта. Считается по всем командам:
 *   - если у каждой команды есть оценки и средняя по проекту >= 7.0 — «Зачтено»
 *   - если хотя бы одна команда без оценок ИЛИ средняя ниже — «Зачтено с замечаниями»
 *   - если команд нет вовсе — «—»
 */
export function projectFinalGrade(
  teamAverages: ReadonlyArray<number | null>,
): string {
  if (teamAverages.length === 0) return '—';
  const allHaveScores = teamAverages.every((a) => a !== null);
  if (!allHaveScores) return 'Зачтено с замечаниями';
  const total = teamAverages.reduce<number>((acc, a) => acc + (a ?? 0), 0);
  const projectAvg = total / teamAverages.length;
  return projectAvg >= 7.0 ? 'Зачтено' : 'Зачтено с замечаниями';
}

/**
 * Дата завершения проекта = max(endDate) по всем его спринтам. ISO-дата
 * (YYYY-MM-DD) либо null. UI форматирует через `formatRuFinishedAt`.
 */
export function finishedAt(sprints: ReadonlyArray<Pick<Sprint, 'endDate'>>): string | null {
  if (sprints.length === 0) return null;
  let max = sprints[0]!.endDate;
  for (const s of sprints) {
    if (s.endDate > max) max = s.endDate;
  }
  return max || null;
}

/** Форматирует ISO-дату в «12 декабря 2025». */
export function formatRuFinishedAt(iso: string | null): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (Number.isNaN(day) || month < 0 || month > 11) return iso;
  return `${day} ${RU_MONTHS[month]} ${year}`;
}

/**
 * Семестровая метка по дате завершения. Декабрь-Январь-Февраль → осенний
 * соответствующего учебного года; Июнь-Июль-Август → весенний; остальные
 * месяцы попадают в ближайший с приоритетом «весенний» (Март-Май) и
 * «осенний» (Сентябрь-Ноябрь).
 */
export function semesterLabel(iso: string | null): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-/.exec(iso);
  if (!m) return '';
  const year = Number(m[1]);
  const month = Number(m[2]);
  // Осенний семестр: сентябрь-январь следующего года (учебный год year/year+1).
  if (month >= 9 && month <= 12) {
    return `Осенний семестр ${year}/${(year + 1) % 100}`;
  }
  if (month === 1 || month === 2) {
    return `Осенний семестр ${year - 1}/${year % 100}`;
  }
  // Весенний: март-август текущего учебного года (year-1/year).
  return `Весенний семестр ${year - 1}/${year % 100}`;
}
