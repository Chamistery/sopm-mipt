/*
 * Таб «Отчёты по спринтам» страницы команды у ментора.
 *
 * Перенесено AS-IS из TeamReportReviewPage. Контекст команды (имя,
 * шапка, хлебные крошки) живёт на родительской странице, поэтому
 * убрали backLink + subtitle и оставили только список карточек отчётов
 * + ReportCard с инлайн-оценками за спринт.
 */

import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import {
  reportNeedsReview,
  reviewTeamReport,
  type TeamReport,
} from '@/api/teamReports';
import {
  createSprintScore,
  updateSprintScore,
  type SprintScore,
} from '@/api/sprintScores';
import { useRequireUser } from '@/auth/useCurrentUser';
import { SprintScoreInput, type SprintScoreDraft } from '../components/SprintScoreInput';
import { buildScoreDrafts } from '../lib/scoreDrafts';
import { useTeam } from '../hooks/useTeam';
import { useTeamReports } from '../hooks/useTeamReports';
import { useSprintScores } from '../hooks/useSprintScores';
import styles from './MentorTeamReportsTab.module.css';

interface Props {
  teamId: number;
}

export function MentorTeamReportsTab({ teamId }: Props): JSX.Element {
  const teamQuery = useTeam(teamId);
  const reportsQuery = useTeamReports(teamId);

  if (reportsQuery.isLoading) {
    return <div className={styles.placeholder}>Загружаем отчёты…</div>;
  }
  if (reportsQuery.error) {
    return (
      <div className={styles.error}>
        {reportsQuery.error instanceof ApiError
          ? `Ошибка ${reportsQuery.error.status}: ${reportsQuery.error.message}`
          : 'Не удалось загрузить отчёты'}
      </div>
    );
  }

  const reports = reportsQuery.data ?? [];
  if (reports.length === 0) {
    return <div className={styles.empty}>Команда ещё не отправляла отчётов.</div>;
  }

  return (
    <div className={styles.reportList}>
      {reports
        .slice()
        .sort((a, b) => a.sprintId - b.sprintId)
        .map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            teamId={teamId}
            memberSummaries={(teamQuery.data?.members ?? []).map((m) => ({
              userId: m.userId,
              name: `${m.user.lastName} ${m.user.firstName}`.trim(),
            }))}
          />
        ))}
    </div>
  );
}

interface ReportCardProps {
  report: TeamReport;
  teamId: number;
  memberSummaries: Array<{ userId: number; name: string }>;
}

function ReportCard({ report, teamId, memberSummaries }: ReportCardProps): JSX.Element {
  const me = useRequireUser();
  const queryClient = useQueryClient();
  const needsReview = reportNeedsReview(report.status);
  const [comment, setComment] = useState(report.mentorComment ?? '');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [scoreErrors, setScoreErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    setComment(report.mentorComment ?? '');
  }, [report.mentorComment]);

  const reviewMutation = useMutation({
    mutationFn: () => reviewTeamReport(report.id, { mentorComment: comment.trim() }),
    onSuccess: async () => {
      setReviewError(null);
      await queryClient.invalidateQueries({ queryKey: ['team', teamId, 'reports'] });
    },
    onError: (err: unknown) => {
      setReviewError(
        err instanceof ApiError
          ? `Ошибка ${err.status}: ${err.message}`
          : err instanceof Error
            ? err.message
            : 'Не удалось сохранить ревью',
      );
    },
  });

  const scoresQuery = useSprintScores({ sprintId: report.sprintId, teamId });

  const initialDrafts = useMemo(
    () => buildScoreDrafts(memberSummaries, scoresQuery.data ?? []),
    [memberSummaries, scoresQuery.data],
  );

  const [drafts, setDrafts] = useState<SprintScoreDraft[]>(initialDrafts);
  useEffect(() => {
    setDrafts(initialDrafts);
  }, [initialDrafts]);

  const scoreMutation = useMutation({
    mutationFn: async (draft: SprintScoreDraft): Promise<SprintScore> => {
      if (draft.score == null) {
        throw new Error('Балл не указан');
      }
      if (draft.existingId != null) {
        return updateSprintScore(draft.existingId, {
          score: draft.score,
          comment: draft.comment.trim() || undefined,
        });
      }
      return createSprintScore({
        sprintId: report.sprintId,
        teamId,
        studentId: draft.studentId,
        score: draft.score,
        comment: draft.comment.trim() || undefined,
        scoredById: me.userId,
      });
    },
    onSuccess: async (saved, draft) => {
      setScoreErrors((prev) => {
        const next = { ...prev };
        delete next[draft.studentId];
        return next;
      });
      setDrafts((prev) =>
        prev.map((d) =>
          d.studentId === draft.studentId
            ? { ...d, dirty: false, existingId: saved.id, score: saved.score, comment: saved.comment ?? '' }
            : d,
        ),
      );
      await queryClient.invalidateQueries({
        queryKey: ['sprint-scores', teamId, report.sprintId],
      });
    },
    onError: (err: unknown, draft) => {
      const msg =
        err instanceof ApiError
          ? `Ошибка ${err.status}: ${err.message}`
          : err instanceof Error
            ? err.message
            : 'Не удалось сохранить балл';
      setScoreErrors((prev) => ({ ...prev, [draft.studentId]: msg }));
    },
  });

  return (
    <article className={styles.report}>
      <header className={styles.reportHead}>
        <div>
          <h2 className={styles.reportTitle}>Отчёт спринта #{report.sprintId}</h2>
          <div className={styles.reportSubtitle}>
            Статус: {report.status}
            {report.submittedAt ? ` · отправлен ${formatDate(report.submittedAt)}` : ''}
          </div>
        </div>
      </header>

      {report.summary ? (
        <section className={styles.block}>
          <h3 className={styles.blockTitle}>Что сделано</h3>
          <p className={styles.blockBody}>{report.summary}</p>
        </section>
      ) : null}

      {report.problems ? (
        <section className={styles.block}>
          <h3 className={styles.blockTitle}>Проблемы</h3>
          <p className={styles.blockBody}>{report.problems}</p>
        </section>
      ) : null}

      {report.nextPlan ? (
        <section className={styles.block}>
          <h3 className={styles.blockTitle}>План на следующий спринт</h3>
          <p className={styles.blockBody}>{report.nextPlan}</p>
        </section>
      ) : null}

      <section className={styles.block}>
        <h3 className={styles.blockTitle}>Комментарий ментора</h3>
        <textarea
          className={styles.textarea}
          rows={3}
          value={comment}
          placeholder="Что обсудить с командой"
          onChange={(e) => setComment(e.target.value)}
          readOnly={!needsReview && report.status === 'Проверен'}
        />
        {reviewError ? <div className={styles.error}>{reviewError}</div> : null}
        {needsReview ? (
          <div className={styles.actionsRow}>
            <button
              type="button"
              className={styles.primary}
              disabled={reviewMutation.isPending}
              onClick={() => reviewMutation.mutate()}
            >
              {reviewMutation.isPending ? 'Сохраняем…' : 'Проверить отчёт'}
            </button>
          </div>
        ) : null}
      </section>

      <section className={styles.block}>
        <h3 className={styles.blockTitle}>Оценки за спринт</h3>
        {scoresQuery.isLoading ? (
          <div className={styles.placeholder}>Загружаем оценки…</div>
        ) : memberSummaries.length === 0 ? (
          <div className={styles.placeholder}>В команде нет участников для оценки.</div>
        ) : (
          <div className={styles.scoreList}>
            {drafts.map((draft) => (
              <SprintScoreInput
                key={draft.studentId}
                draft={draft}
                isSaving={scoreMutation.isPending && scoreMutation.variables?.studentId === draft.studentId}
                serverError={scoreErrors[draft.studentId] ?? null}
                onChange={(next) =>
                  setDrafts((prev) => prev.map((d) => (d.studentId === next.studentId ? next : d)))
                }
                onSave={(d) => scoreMutation.mutate(d)}
              />
            ))}
          </div>
        )}
      </section>
    </article>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ru-RU');
}
