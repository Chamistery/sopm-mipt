/*
 * DefensesTab — список карточек защит + кнопка «Назначить защиту».
 * Pixel-port из admin.html view-grading tab-defenses (lines 1959-2010).
 *
 * Модалка редактирования/создания — компактная inline-форма. Удаление
 * (DELETE) — через confirm.
 */

import { useState, type JSX } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import {
  createDefense,
  deleteDefense,
  updateDefense,
  type Defense,
  type DefenseInput,
} from '@/api/defenses';
import { useToast } from '@/_shared/Toast';
import { DefenseForm } from './DefenseForm';
import styles from './DefensesTab.module.css';

interface Props {
  defenses: Defense[];
}

export function DefensesTab({ defenses }: Props): JSX.Element {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [editing, setEditing] = useState<Defense | null>(null);
  const [creating, setCreating] = useState(false);

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['defenses'] });
  };

  const createMut = useMutation({
    mutationFn: (input: DefenseInput) => createDefense(input),
    onSuccess: () => {
      invalidate();
      showSuccess('Защита назначена');
      setCreating(false);
    },
    onError: (e) => showError(formatError(e, 'Не удалось создать защиту')),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: number; input: DefenseInput }) =>
      updateDefense(id, input),
    onSuccess: () => {
      invalidate();
      showSuccess('Защита обновлена');
      setEditing(null);
    },
    onError: (e) => showError(formatError(e, 'Не удалось сохранить защиту')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteDefense(id),
    onSuccess: () => {
      invalidate();
      showSuccess('Защита удалена');
    },
    onError: (e) => showError(formatError(e, 'Не удалось удалить защиту')),
  });

  const handleDelete = (d: Defense): void => {
    if (!window.confirm(`Удалить защиту «${d.title}»?`)) return;
    deleteMut.mutate(d.id);
  };

  if (creating) {
    return (
      <DefenseForm
        initial={null}
        onSubmit={(input) => createMut.mutate(input)}
        onCancel={() => setCreating(false)}
        submitting={createMut.isPending}
        title="Новая защита"
      />
    );
  }

  if (editing) {
    return (
      <DefenseForm
        initial={editing}
        onSubmit={(input) => updateMut.mutate({ id: editing.id, input })}
        onCancel={() => setEditing(null)}
        submitting={updateMut.isPending}
        title="Редактирование защиты"
      />
    );
  }

  return (
    <div>
      {defenses.length === 0 ? (
        <div className={styles.empty}>Защит ещё не назначено.</div>
      ) : (
        defenses.map((d) => (
          <DefenseCard
            key={d.id}
            defense={d}
            onEdit={() => setEditing(d)}
            onDelete={() => handleDelete(d)}
          />
        ))
      )}

      <button
        type="button"
        className={styles.btnPrimary}
        onClick={() => setCreating(true)}
      >
        <PlusIcon />
        Назначить защиту
      </button>
    </div>
  );
}

interface CardProps {
  defense: Defense;
  onEdit: () => void;
  onDelete: () => void;
}

function DefenseCard({ defense, onEdit, onDelete }: CardProps): JSX.Element {
  const dateLabel = formatDateRange(defense.startsAt, defense.endsAt);
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>{defense.title}</div>
      <div className={styles.cardMeta}>
        <strong>Дата:</strong> {dateLabel}
        {defense.location ? (
          <>
            <br />
            <strong>Место:</strong> {defense.location}
          </>
        ) : null}
      </div>

      {defense.projects.length > 0 ? (
        <>
          <div className={styles.cardLabel}>Проекты</div>
          <ol className={styles.cardList}>
            {defense.projects.map((p, idx) => (
              <li key={p.projectId}>
                {idx + 1}. {p.title} — {p.teamsCount}{' '}
                {teamWord(p.teamsCount)}
              </li>
            ))}
          </ol>
        </>
      ) : null}

      {defense.experts.length > 0 ? (
        <>
          <div className={styles.cardLabel}>Эксперты</div>
          <div className={styles.cardMeta}>
            {defense.experts
              .map((e) => `${e.lastName} ${e.firstName.charAt(0)}.`)
              .join(', ')}
          </div>
        </>
      ) : null}

      {defense.description ? (
        <div className={styles.cardDescription}>{defense.description}</div>
      ) : null}

      <div className={styles.cardActions}>
        <button type="button" className={styles.btnSecondary} onClick={onEdit}>
          Редактировать
        </button>
        <button type="button" className={styles.btnDanger} onClick={onDelete}>
          Удалить
        </button>
      </div>
    </div>
  );
}

function formatDateRange(startIso: string, endIso?: string | null): string {
  const start = new Date(startIso);
  const startLabel = start.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  if (!endIso) return startLabel;
  const end = new Date(endIso);
  const endLabel = end.toLocaleString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${startLabel} — ${endLabel}`;
}

function teamWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'команда';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'команды';
  return 'команд';
}

function formatError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return `${fallback}: ${err.message}`;
  if (err instanceof Error) return `${fallback}: ${err.message}`;
  return fallback;
}

function PlusIcon(): JSX.Element {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
