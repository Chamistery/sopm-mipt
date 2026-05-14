/*
 * Преобразует list /api/projects + GetByID для каждого проекта в плоский
 * список «заявок» в формате admin.html applicationsData (lines 3800-3842).
 *
 * Тип заявки:
 *   - create: проект со статусом 'На утверждении'. Список «изменений» —
 *     все ключевые поля заявки (что мы предлагаем создать).
 *   - edit:   проект с pendingProposalData != null. Список изменений —
 *     diff между текущим proposalData и pendingProposalData.
 *
 * Сейчас MVP: статусы approved/rejected не показываем (нет audit-log).
 * Все возвращаемые заявки имеют status='pending'. Когда добавим
 * audit-таблицу — расширим.
 */

import type { Project } from '@/api/projects';
import type { ProposalData } from '@/features/mentor-dashboard/lib/projectFormState';

export type AppKind = 'create' | 'edit';

export interface ApplicationDiffItem {
  field: string;
  old?: string;
  new: string;
}

export interface CoordApplication {
  projectId: number;
  type: AppKind;
  mentor: string;
  projectTitle: string;
  submittedAt: string;
  changes: ApplicationDiffItem[];
}

export function buildApplicationsFromProjects(projects: Project[]): CoordApplication[] {
  const result: CoordApplication[] = [];
  for (const p of projects) {
    if (p.status === 'На утверждении') {
      result.push({
        projectId: p.id,
        type: 'create',
        mentor: formatMentor(p),
        projectTitle: p.title,
        submittedAt: formatDate(p.submittedAt ?? null),
        changes: buildCreateFields(p),
      });
      continue;
    }
    if (p.pendingProposalData) {
      result.push({
        projectId: p.id,
        type: 'edit',
        mentor: formatMentor(p),
        projectTitle: p.title,
        submittedAt: formatDate(p.pendingSubmittedAt ?? null),
        changes: buildEditDiff(p),
      });
    }
  }
  return result;
}

function formatMentor(p: Project): string {
  const m = p.mentor;
  if (!m) return '—';
  const first = m.firstName ? `${m.firstName.charAt(0)}.` : '';
  return [m.lastName, first].filter(Boolean).join(' ') || '—';
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function buildCreateFields(p: Project): ApplicationDiffItem[] {
  const items: ApplicationDiffItem[] = [
    { field: 'Полное название', new: p.title || '—' },
    { field: 'Инициатор', new: p.company || '—' },
  ];
  if (p.goal) items.push({ field: 'Цель проекта', new: p.goal });
  if (p.technologies && p.technologies.length) {
    items.push({ field: 'Технологии', new: p.technologies.join(', ') });
  }
  if (p.teamSizeMin && p.teamSizeMax) {
    items.push({ field: 'Размер команды', new: `${p.teamSizeMin}–${p.teamSizeMax}` });
  }
  if (p.numTeams) items.push({ field: 'Количество команд', new: String(p.numTeams) });
  if (p.durationSemesters) {
    items.push({ field: 'Срок (семестров)', new: String(p.durationSemesters) });
  }
  return items;
}

function buildEditDiff(p: Project): ApplicationDiffItem[] {
  const pending = p.pendingProposalData;
  if (!pending) return [];
  const current = p.proposalData ?? null;
  const items: ApplicationDiffItem[] = [];

  push(items, 'Полное название', current?.title, pending.title);
  push(items, 'Инициатор', current?.company, pending.company);
  push(items, 'Цель проекта', current?.goal, pending.goal);
  push(items, 'Результат (продукт)', current?.expectedResult, pending.expectedResult);
  push(items, 'Технологии', current?.technologies, pending.technologies);
  push(items, 'Компетенции', current?.competencies, pending.competencies);
  push(items, 'Описание проекта', current?.description, pending.description);
  push(items, 'Критерии приёмки', current?.acceptanceCriteria, pending.acceptanceCriteria);
  push(items, 'Образовательный результат', current?.eduResult, pending.eduResult);
  push(items, 'Ресурсы', current?.resources, pending.resources);
  pushNum(items, 'Срок (семестров)', current?.durationSemesters, pending.durationSemesters);
  pushNum(items, 'Количество команд', current?.numTeams, pending.numTeams);
  pushNum(items, 'Минимальный размер команды', current?.teamSizeMin, pending.teamSizeMin);
  pushNum(items, 'Максимальный размер команды', current?.teamSizeMax, pending.teamSizeMax);

  return items;
}

function push(
  items: ApplicationDiffItem[],
  field: string,
  oldValue: unknown,
  newValue: unknown,
): void {
  // ProposalData декларирует technologies как string, но в БД (и в payload'е
  // change-request) тех же самых полях может приехать массив строк — например
  // если ментор послал proposalData.technologies = ["Go", "React", ...].
  // Поэтому tolerantно приводим к строке.
  const oldStr = toDisplayString(oldValue).trim();
  const newStr = toDisplayString(newValue).trim();
  if (newStr === oldStr) return;
  if (!newStr && !oldStr) return;
  items.push({ field, old: oldStr || '—', new: newStr || '—' });
}

function toDisplayString(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map((v) => String(v ?? '')).join(', ');
  if (typeof value === 'string') return value;
  return String(value);
}

function pushNum(
  items: ApplicationDiffItem[],
  field: string,
  oldValue: number | undefined | null,
  newValue: number | undefined | null,
): void {
  if (oldValue == null && newValue == null) return;
  if (oldValue === newValue) return;
  items.push({
    field,
    old: oldValue == null ? '—' : String(oldValue),
    new: newValue == null ? '—' : String(newValue),
  });
}

// Используется в типах — экспортирует ProposalData чтобы re-export'ы работали.
export type { ProposalData };
