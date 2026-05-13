/*
 * EditScoreModal — координатор кликает по ячейке в GradesTable и здесь
 * редактирует оценки выбранной категории (mentor / tracker / defense /
 * peer) по каждому спринту команды.
 *
 * Поведение:
 *   - Загружаем sprints команды (через projectId её team) + текущие
 *     sprint_scores по студенту в этой команде, фильтруем по category.
 *   - Для каждого спринта показываем строку «Спринт N — input score
 *     (+ input КТУ если category=mentor)».
 *   - На save: для каждой строки делаем create или update, инвалидируем
 *     ['coordinator', 'grading'] чтобы агрегат обновился.
 */

import { useState, type JSX, useEffect, useMemo } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { useRequireUser } from '@/auth/useCurrentUser';
import { getTeam, listSprintsByProject } from '@/api/teams';
import {
  createSprintScore,
  listSprintScores,
  updateSprintScore,
  type SprintScore,
  type SprintScoreCategory,
} from '@/api/sprintScores';

import styles from './EditScoreModal.module.css';

interface Props {
  studentId: number;
  studentName: string;
  teamId: number;
  category: SprintScoreCategory;
  onClose: () => void;
}

interface Draft {
  sprintId: number;
  sprintNumber: number;
  existingId: number | null;
  score: string;
  ktu: string;
}

const CATEGORY_LABEL: Record<SprintScoreCategory, string> = {
  mentor: 'Ментор',
  tracker: 'Трекер',
  defense: 'Защита',
  peer: 'Peer review',
};

export function EditScoreModal({
  studentId,
  studentName,
  teamId,
  category,
  onClose,
}: Props): JSX.Element {
  const me = useRequireUser();
  const queryClient = useQueryClient();

  const teamQuery = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => getTeam(teamId),
  });

  const projectId = teamQuery.data?.projectId ?? null;
  const sprintsQuery = useQuery({
    queryKey: ['project', projectId, 'sprints'],
    queryFn: () => listSprintsByProject(projectId as number),
    enabled: projectId != null,
  });

  const scoresQueries = useQueries({
    queries: (sprintsQuery.data ?? []).map((s) => ({
      queryKey: ['sprint-scores', teamId, s.id],
      queryFn: () => listSprintScores({ sprintId: s.id, teamId }),
    })),
  });

  const allLoaded =
    !teamQuery.isLoading &&
    !sprintsQuery.isLoading &&
    scoresQueries.every((q) => !q.isLoading);

  const existingByCategory = useMemo(() => {
    const byId = new Map<number, SprintScore>();
    scoresQueries.forEach((q) => {
      (q.data ?? []).forEach((s) => {
        if (s.studentId === studentId && s.category === category) {
          byId.set(s.sprintId, s);
        }
      });
    });
    return byId;
  }, [scoresQueries, studentId, category]);

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allLoaded || !sprintsQuery.data) return;
    setDrafts(
      sprintsQuery.data
        .slice()
        .sort((a, b) => a.number - b.number)
        .map((s) => {
          const existing = existingByCategory.get(s.id);
          return {
            sprintId: s.id,
            sprintNumber: s.number,
            existingId: existing?.id ?? null,
            score: existing?.score != null ? String(existing.score) : '',
            ktu: existing?.ktu != null ? String(existing.ktu) : '',
          };
        }),
    );
  }, [allLoaded, sprintsQuery.data, existingByCategory]);

  const saveMutation = useMutation({
    mutationFn: async (rows: Draft[]) => {
      const ops = rows
        .filter((r) => r.score.trim() !== '' || r.existingId != null)
        .map(async (r) => {
          const trimmed = r.score.trim();
          if (trimmed === '') {
            // существующая оценка очищена — пока не удаляем (нет endpoint
            // DELETE), просто пропускаем.
            return;
          }
          const score = Number.parseInt(trimmed, 10);
          if (!Number.isFinite(score) || score < 0 || score > 10) {
            throw new Error(`Спринт ${r.sprintNumber}: оценка должна быть 0–10`);
          }
          const ktu =
            category === 'mentor' && r.ktu.trim() !== ''
              ? parseKtu(r.ktu.trim(), r.sprintNumber)
              : null;
          if (r.existingId != null) {
            await updateSprintScore(r.existingId, {
              score,
              category,
              ktu,
            });
          } else {
            await createSprintScore({
              sprintId: r.sprintId,
              teamId,
              studentId,
              score,
              category,
              ktu,
              scoredById: me.userId,
            });
          }
        });
      await Promise.all(ops);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['coordinator', 'grading'] }),
        queryClient.invalidateQueries({ queryKey: ['sprint-scores'] }),
      ]);
      onClose();
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) setError(`Ошибка ${err.status}: ${err.message}`);
      else if (err instanceof Error) setError(err.message);
      else setError('Не удалось сохранить оценки');
    },
  });

  const handleChange = (sprintId: number, field: 'score' | 'ktu', value: string): void => {
    setDrafts((prev) =>
      prev.map((d) => (d.sprintId === sprintId ? { ...d, [field]: value } : d)),
    );
  };

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-score-title"
      >
        <header className={styles.header}>
          <h2 id="edit-score-title" className={styles.title}>
            Оценки · {CATEGORY_LABEL[category]}
          </h2>
          <p className={styles.subtitle}>{studentName}</p>
        </header>

        {!allLoaded ? (
          <div className={styles.placeholder}>Загружаем спринты…</div>
        ) : drafts.length === 0 ? (
          <div className={styles.placeholder}>
            У команды нет спринтов, оценки выставить нельзя.
          </div>
        ) : (
          <div className={styles.table}>
            <div className={styles.row + ' ' + styles.headRow}>
              <span>Спринт</span>
              <span>Оценка (0–10)</span>
              {category === 'mentor' ? <span>КТУ (0.5–1.5)</span> : null}
            </div>
            {drafts.map((d) => (
              <div className={styles.row} key={d.sprintId}>
                <span className={styles.sprintCell}>Спринт {d.sprintNumber}</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={1}
                  className={styles.input}
                  value={d.score}
                  onChange={(e) => handleChange(d.sprintId, 'score', e.target.value)}
                />
                {category === 'mentor' ? (
                  <input
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    className={styles.input}
                    value={d.ktu}
                    onChange={(e) => handleChange(d.sprintId, 'ktu', e.target.value)}
                    placeholder="1.0"
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}

        {error ? <div className={styles.error}>{error}</div> : null}

        <footer className={styles.actions}>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={!allLoaded || saveMutation.isPending}
            onClick={() => {
              setError(null);
              saveMutation.mutate(drafts);
            }}
          >
            {saveMutation.isPending ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </footer>
      </div>
    </div>
  );
}

function parseKtu(raw: string, sprintNumber: number): number {
  const value = Number.parseFloat(raw.replace(',', '.'));
  if (!Number.isFinite(value) || value < 0 || value > 2) {
    throw new Error(`Спринт ${sprintNumber}: КТУ должен быть в диапазоне 0–2`);
  }
  return value;
}
