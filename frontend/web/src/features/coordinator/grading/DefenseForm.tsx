/*
 * DefenseForm — форма создания/редактирования защиты.
 *
 * Проекты и эксперты выбираются мультиселектом через чекбоксы из реальных
 * данных:
 *   - проекты — listProjects({ limit: 200 }), показываем те, что могут
 *     дойти до защиты (Активный / Опубликован / Утверждён / Завершён);
 *   - эксперты — listUsers().filter(role === 'mentor') (роли «эксперт» в
 *     системе нет, см. project_roles_and_business_logic.md — на защите
 *     выступают менторы как эксперты).
 */

import { useState, type FormEvent, type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { Defense, DefenseInput } from '@/api/defenses';
import { listProjects, type ProjectListItem } from '@/api/projects';
import { listUsers, type UserSummary } from '@/api/users';
import styles from './DefenseForm.module.css';

interface Props {
  initial: Defense | null;
  onSubmit: (input: DefenseInput) => void;
  onCancel: () => void;
  submitting: boolean;
  title: string;
}

const DEFENSE_PROJECT_STATUSES = new Set<ProjectListItem['status']>([
  'Активный',
  'Опубликован',
  'Утверждён',
  'Завершён',
]);

export function DefenseForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
  title,
}: Props): JSX.Element {
  const [defenseTitle, setTitle] = useState(initial?.title ?? '');
  const [startsAt, setStartsAt] = useState(toLocalInput(initial?.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalInput(initial?.endsAt ?? null));
  const [location, setLocation] = useState(initial?.location ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [semesterLabel, setSemesterLabel] = useState(initial?.semesterLabel ?? '');
  const [completed, setCompleted] = useState(initial?.completed ?? false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<number>>(
    () => new Set(initial?.projectIds ?? []),
  );
  const [selectedExpertIds, setSelectedExpertIds] = useState<Set<number>>(
    () => new Set((initial?.experts ?? []).map((e) => e.userId)),
  );

  const projectsQuery = useQuery({
    queryKey: ['defense-form', 'projects'],
    queryFn: () => listProjects({ limit: 200 }),
  });
  const usersQuery = useQuery({
    queryKey: ['defense-form', 'experts'],
    queryFn: listUsers,
  });

  const availableProjects = (projectsQuery.data?.projects ?? []).filter((p) =>
    DEFENSE_PROJECT_STATUSES.has(p.status),
  );
  const availableExperts = (usersQuery.data ?? []).filter((u) => u.role === 'mentor');

  const toggleProject = (id: number): void => {
    setSelectedProjectIds((prev) => toggle(prev, id));
  };
  const toggleExpert = (id: number): void => {
    setSelectedExpertIds((prev) => toggle(prev, id));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!defenseTitle.trim() || !startsAt) {
      window.alert('Заполните заголовок и дату начала.');
      return;
    }
    onSubmit({
      title: defenseTitle.trim(),
      startsAt: new Date(startsAt).toISOString(),
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      location: location.trim() || undefined,
      description: description.trim() || undefined,
      semesterLabel: semesterLabel.trim() || undefined,
      completed,
      projectIds: [...selectedProjectIds].sort((a, b) => a - b),
      expertUserIds: [...selectedExpertIds].sort((a, b) => a - b),
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.title}>{title}</h2>

      <label className={styles.field}>
        <span className={styles.label}>Название *</span>
        <input
          type="text"
          className={styles.input}
          value={defenseTitle}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </label>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Начало *</span>
          <input
            type="datetime-local"
            className={styles.input}
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Окончание</span>
          <input
            type="datetime-local"
            className={styles.input}
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Место</span>
        <input
          type="text"
          className={styles.input}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Аудитория, корпус"
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Семестр</span>
        <input
          type="text"
          className={styles.input}
          value={semesterLabel}
          onChange={(e) => setSemesterLabel(e.target.value)}
          placeholder="Весенний семестр 2025/2026"
        />
      </label>

      <fieldset className={styles.fieldset}>
        <legend className={styles.label}>
          Проекты ({selectedProjectIds.size})
        </legend>
        <div className={styles.list}>
          {projectsQuery.isLoading ? (
            <div className={styles.listPlaceholder}>Загружаем проекты…</div>
          ) : projectsQuery.error ? (
            <div className={styles.listError}>Не удалось загрузить проекты</div>
          ) : availableProjects.length === 0 ? (
            <div className={styles.listPlaceholder}>
              Нет проектов в статусах Активный / Опубликован / Утверждён / Завершён.
            </div>
          ) : (
            availableProjects.map((p) => (
              <label key={p.id} className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={selectedProjectIds.has(p.id)}
                  onChange={() => toggleProject(p.id)}
                />
                <span className={styles.checkLabel}>{p.title}</span>
                <span className={styles.checkMeta}>{p.status}</span>
              </label>
            ))
          )}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.label}>
          Эксперты ({selectedExpertIds.size})
        </legend>
        <div className={styles.list}>
          {usersQuery.isLoading ? (
            <div className={styles.listPlaceholder}>Загружаем экспертов…</div>
          ) : usersQuery.error ? (
            <div className={styles.listError}>Не удалось загрузить пользователей</div>
          ) : availableExperts.length === 0 ? (
            <div className={styles.listPlaceholder}>
              В системе нет менторов, которых можно назначить экспертами.
            </div>
          ) : (
            availableExperts.map((u) => (
              <label key={u.id} className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={selectedExpertIds.has(u.id)}
                  onChange={() => toggleExpert(u.id)}
                />
                <span className={styles.checkLabel}>{expertLabel(u)}</span>
                <span className={styles.checkMeta}>{u.company ?? '—'}</span>
              </label>
            ))
          )}
        </div>
      </fieldset>

      <label className={styles.field}>
        <span className={styles.label}>Описание</span>
        <textarea
          className={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </label>

      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={completed}
          onChange={(e) => setCompleted(e.target.checked)}
        />
        Защита завершена
      </label>

      <div className={styles.actions}>
        <button type="button" className={styles.btnSecondary} onClick={onCancel}>
          Отмена
        </button>
        <button type="submit" className={styles.btnPrimary} disabled={submitting}>
          {submitting ? 'Сохраняем…' : initial ? 'Сохранить' : 'Назначить'}
        </button>
      </div>
    </form>
  );
}

function toggle(set: Set<number>, id: number): Set<number> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function expertLabel(u: UserSummary): string {
  const first = u.firstName ? `${u.firstName.charAt(0)}.` : '';
  const middle = u.middleName ? `${u.middleName.charAt(0)}.` : '';
  return `${u.lastName} ${first}${middle}`.trim();
}

function toLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
