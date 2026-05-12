/*
 * DefenseForm — форма создания/редактирования защиты. Простой однопо-
 * страничный layout с полями: название / дата (datetime-local) /
 * место / описание / семестр / projectIds (textarea с id через запятую) /
 * expertUserIds (textarea с id через запятую).
 *
 * UX-упрощение: вместо мультиселекта проектов и экспертов — текстовое
 * поле с ID. Достаточно для MVP; полноценный picker — KNOWN TODO.
 */

import { useState, type FormEvent, type JSX } from 'react';

import type { Defense, DefenseInput } from '@/api/defenses';
import styles from './DefenseForm.module.css';

interface Props {
  initial: Defense | null;
  onSubmit: (input: DefenseInput) => void;
  onCancel: () => void;
  submitting: boolean;
  title: string;
}

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
  const [projectIds, setProjectIds] = useState(
    (initial?.projectIds ?? []).join(', '),
  );
  const [expertIds, setExpertIds] = useState(
    (initial?.experts ?? []).map((e) => e.userId).join(', '),
  );

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
      projectIds: parseIds(projectIds),
      expertUserIds: parseIds(expertIds),
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

      <label className={styles.field}>
        <span className={styles.label}>ID проектов (через запятую)</span>
        <input
          type="text"
          className={styles.input}
          value={projectIds}
          onChange={(e) => setProjectIds(e.target.value)}
          placeholder="1, 2, 3"
        />
        <span className={styles.hint}>
          Полноценный селектор проектов будет добавлен позже.
        </span>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>ID экспертов (через запятую)</span>
        <input
          type="text"
          className={styles.input}
          value={expertIds}
          onChange={(e) => setExpertIds(e.target.value)}
          placeholder="42, 43"
        />
      </label>

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

function toLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseIds(raw: string): number[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}
