/*
 * Локальная разметка слотов команды на view-distribution: какой
 * applicationId лежит в каком слоте по индексу. Бэк не хранит позиции
 * (api возвращает members массивом без slot_index), поэтому прототипное
 * поведение «студент встаёт ровно в ту ячейку, куда его дропнул ментор»
 * мы держим клиентски в localStorage. На drop в slot N сохраняем
 * applicationId под индексом N. На render используем эти позиции, для
 * остальных members раскладываем по первым свободным.
 */

const STORAGE_KEY = 'mentor_distribution_slot_layout_v1';

export type SlotLayout = Record<string, Record<string, number>>;

function read(): SlotLayout {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as SlotLayout;
  } catch {
    /* ignore */
  }
  return {};
}

function write(layout: SlotLayout): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* localStorage может быть отключён — игнорируем */
  }
}

/** Возвращает разметку для конкретной команды. */
export function loadTeamLayout(teamId: number): Record<string, number> {
  return read()[String(teamId)] ?? {};
}

/** Назначает applicationId слоту. Если этот же applicationId был на
 *  другом слоте — старая позиция очищается. */
export function setSlot(teamId: number, slotIndex: number, applicationId: number): void {
  const all = read();
  const team = { ...(all[String(teamId)] ?? {}) };
  for (const [k, v] of Object.entries(team)) {
    if (v === applicationId) delete team[k];
  }
  team[String(slotIndex)] = applicationId;
  all[String(teamId)] = team;
  write(all);
}

/** Удаляет applicationId из layout-а команды. */
export function clearApplicantFromTeam(teamId: number, applicationId: number): void {
  const all = read();
  const team = all[String(teamId)];
  if (!team) return;
  let changed = false;
  for (const [k, v] of Object.entries(team)) {
    if (v === applicationId) {
      delete team[k];
      changed = true;
    }
  }
  if (changed) {
    all[String(teamId)] = team;
    write(all);
  }
}

/** Раскладывает members по слотам с учётом сохранённой разметки.
 *  Возвращает массив длины maxSize: на каждой позиции — member или null. */
export function arrangeSlots<T extends { applicationId: number }>(
  teamId: number,
  maxSize: number,
  members: T[],
): Array<T | null> {
  const layout = loadTeamLayout(teamId);
  const slots: Array<T | null> = Array.from({ length: maxSize }, () => null);
  const placed = new Set<number>();

  // Сначала ставим тех, у кого есть сохранённая позиция и она валидна.
  for (const [k, applicationId] of Object.entries(layout)) {
    const i = Number.parseInt(k, 10);
    if (!Number.isFinite(i) || i < 0 || i >= maxSize) continue;
    const m = members.find((x) => x.applicationId === applicationId);
    if (!m || slots[i] != null) continue;
    slots[i] = m;
    placed.add(applicationId);
  }

  // Остальные раскладываем подряд по первым свободным.
  for (const m of members) {
    if (placed.has(m.applicationId)) continue;
    const i = slots.findIndex((s) => s == null);
    if (i === -1) break;
    slots[i] = m;
  }

  return slots;
}
