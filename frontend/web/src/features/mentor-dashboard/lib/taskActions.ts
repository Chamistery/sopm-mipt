import type { TaskStatus } from '@/api/tasks';
import type { TaskActionKind } from '../components/TaskActionPopup';

export interface MentorActionDescriptor {
  kind: TaskActionKind;
  label: string;
}

/**
 * Returns the available mentor actions for a given task status.
 * Pure function — exposed for unit tests and used by the task-review page.
 */
export function actionsFor(status: TaskStatus): MentorActionDescriptor[] {
  if (status === 'Ожидает аппрува') {
    return [
      { kind: 'approve', label: 'Аппрувить' },
      { kind: 'reject', label: 'Отклонить' },
    ];
  }
  if (status === 'На ревью') {
    return [
      { kind: 'accept', label: 'Принять' },
      { kind: 'return', label: 'Вернуть' },
    ];
  }
  return [];
}
