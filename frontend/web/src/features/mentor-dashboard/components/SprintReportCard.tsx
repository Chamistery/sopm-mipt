/*
 * Карточка одного отчёта за спринт у ментора. Сворачиваемая (header
 * кликабельный, body — анимированный max-height + opacity), включает:
 *   - заголовок «Спринт N (DD ммм — DD ммм)» + статус-бейдж
 *   - блок «Общий результат команды» (что сделано / проблемы / план)
 *   - подсекция «Личный вклад участников» (комментарий ментора из
 *     SprintScore — known fallback, см. отчёт по задаче)
 *   - оценки за спринт (одна общая кнопка «Сохранить оценки»)
 *   - комментарий к командному отчёту + «Принять отчёт»
 *
 * Сама карточка — управляемая (через `expanded` + `onToggle`), чтобы
 * родитель решал, кто открыт по умолчанию (текущий — открыт, прошедшие
 * — свёрнуты). Все мутации (батч-сохранение оценок, accept) принимает
 * как props — cardless-логика тестируется отдельно.
 */

import type { JSX } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { MAX_SCORE, MIN_SCORE, validateScore } from '@/api/sprintScores';
import type { SprintScore } from '@/api/sprintScores';
import type { Sprint } from '@/api/teams';
import type { TeamReport, TeamReportStatus } from '@/api/teamReports';
import { useToast } from '@/_shared/Toast';
import { avatarColor } from '@/features/student-project/lib/people';

import {
  averageScore,
  reportBadge,
  reportTitle,
  type StatusBadgeInfo,
} from '../lib/sprintReportHelpers';
import styles from './SprintReportCard.module.css';

export interface SprintReportCardMember {
  userId: number;
  /** Краткое имя «Стародубов А.» — рендерится в score-row и в personal-блоке. */
  shortName: string;
  /** Двухбуквенные инициалы для аватарки. */
  avatarInitials: string;
}

export interface ScoreDraft {
  studentId: number;
  studentName: string;
  avatarInitials: string;
  /** id существующей записи (если ментор уже сохранял балл за этот спринт). */
  existingId: number | null;
  score: number | null;
  comment: string;
  /** Текст вкладывает ментор в комментарии к оценке — used as fallback for
   * "личный вклад участника". */
  contribution: string;
  dirty: boolean;
}

interface Props {
  report: TeamReport;
  sprint: Sprint | null;
  members: SprintReportCardMember[];
  scores: SprintScore[];
  scoresLoading: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSaveScores: (
    drafts: ScoreDraft[],
  ) => Promise<{ ok: true; saved: SprintScore[] } | { ok: false; error: string }>;
  onAcceptReport: (mentorComment: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}

export function SprintReportCard({
  report,
  sprint,
  members,
  scores,
  scoresLoading,
  expanded,
  onToggle,
  onSaveScores,
  onAcceptReport,
}: Props): JSX.Element {
  const { showSuccess } = useToast();
  const [comment, setComment] = useState(report.mentorComment ?? '');
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [savingScores, setSavingScores] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    setComment(report.mentorComment ?? '');
  }, [report.mentorComment]);

  const initialDrafts = useMemo<ScoreDraft[]>(() => {
    const byStudent = new Map<number, SprintScore>();
    for (const s of scores) byStudent.set(s.studentId, s);
    return members.map((m) => {
      const existing = byStudent.get(m.userId);
      return {
        studentId: m.userId,
        studentName: m.shortName,
        avatarInitials: m.avatarInitials,
        existingId: existing?.id ?? null,
        score: existing?.score ?? null,
        comment: existing?.comment ?? '',
        contribution: existing?.comment ?? '',
        dirty: false,
      };
    });
  }, [members, scores]);

  const [drafts, setDrafts] = useState<ScoreDraft[]>(initialDrafts);
  const lastResetRef = useRef<string>('');

  // Reset на изменение members/scores. Используем serialised marker, чтобы
  // не дёргать setDrafts при ре-рендере с тем же содержимым.
  useEffect(() => {
    const marker = `${members.length}|${scores.length}|${scores
      .map((s) => `${s.id}:${s.score}:${s.comment ?? ''}`)
      .join(',')}|${members.map((m) => m.userId).join(',')}`;
    if (marker !== lastResetRef.current) {
      lastResetRef.current = marker;
      setDrafts(initialDrafts);
    }
  }, [initialDrafts, members, scores]);

  const badge = reportBadge(
    report.status as TeamReportStatus,
    averageScore(drafts.filter((d) => d.score != null).map((d) => ({ score: d.score! }))),
  );

  const title = reportTitle(report, sprint);
  const headerId = `report-header-${report.id}`;
  const bodyId = `report-body-${report.id}`;

  const dirtyDrafts = drafts.filter((d) => d.dirty);
  const hasInvalid = drafts.some(
    (d) => d.dirty && (d.score == null || validateScore(d.score) != null),
  );
  const canSaveScores = dirtyDrafts.length > 0 && !hasInvalid && !savingScores;

  const isReviewable = report.status === 'Отправлен';
  const isAccepted = report.status === 'Проверен';

  async function handleSaveScores(): Promise<void> {
    setScoreError(null);
    setSavingScores(true);
    try {
      const result = await onSaveScores(dirtyDrafts);
      if (result.ok) {
        // Обновляем дрэфты — каждый сохранённый получает existingId,
        // dirty снимается. Saved-масив маппим по studentId, чтобы
        // совпасть с локальным state без зависимости от порядка.
        const byStudent = new Map<number, SprintScore>();
        for (const s of result.saved) byStudent.set(s.studentId, s);
        setDrafts((prev) =>
          prev.map((d) => {
            const saved = byStudent.get(d.studentId);
            if (!saved) return d;
            return {
              ...d,
              dirty: false,
              existingId: saved.id,
              score: saved.score,
              comment: saved.comment ?? '',
              contribution: saved.comment ?? d.contribution,
            };
          }),
        );
        showSuccess('Оценки сохранены');
      } else {
        setScoreError(result.error);
      }
    } finally {
      setSavingScores(false);
    }
  }

  async function handleAccept(): Promise<void> {
    setAcceptError(null);
    setAccepting(true);
    try {
      const result = await onAcceptReport(comment.trim());
      if (result.ok) {
        showSuccess('Отчёт принят');
      } else {
        setAcceptError(result.error);
      }
    } finally {
      setAccepting(false);
    }
  }

  return (
    <article className={styles.card}>
      <button
        type="button"
        className={styles.header}
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={bodyId}
        id={headerId}
      >
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>{title}</h2>
        </div>
        <div className={styles.headerRight}>
          <Badge info={badge} />
          <span
            className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}
            aria-hidden="true"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </button>

      <div
        id={bodyId}
        role="region"
        aria-labelledby={headerId}
        className={`${styles.bodyWrap} ${expanded ? styles.bodyWrapOpen : ''}`}
      >
        <div className={styles.body}>
          <div className={styles.summary}>
            <div className={styles.subTitle}>Общий результат команды</div>
            {report.summary ? (
              <Section title="Что сделано" body={report.summary} />
            ) : null}
            {report.problems ? (
              <Section title="Проблемы и риски" body={report.problems} />
            ) : null}
            {report.nextPlan ? (
              <Section title="План на следующий спринт" body={report.nextPlan} />
            ) : null}
            {!report.summary && !report.problems && !report.nextPlan ? (
              <div className={styles.summaryEmpty}>Команда ещё не заполнила отчёт.</div>
            ) : null}
          </div>

          <div>
            <div className={styles.subTitle}>Личный вклад участников</div>
            {scoresLoading ? (
              <div className={styles.placeholder}>Загружаем личные вклады…</div>
            ) : drafts.length === 0 ? (
              <div className={styles.placeholder}>В команде нет участников.</div>
            ) : (
              <div className={styles.personalList} style={{ marginTop: 8 }}>
                {drafts.map((d) => (
                  <PersonalContribution key={d.studentId} draft={d} />
                ))}
              </div>
            )}
          </div>

          <div>
            <div className={styles.subTitle}>Оценки за спринт (индивидуально)</div>
            {scoresLoading ? (
              <div className={styles.placeholder}>Загружаем оценки…</div>
            ) : drafts.length === 0 ? (
              <div className={styles.placeholder}>В команде нет участников для оценки.</div>
            ) : (
              <>
                <div className={styles.scoreList} style={{ marginTop: 8 }}>
                  {drafts.map((d) => (
                    <ScoreRow
                      key={d.studentId}
                      draft={d}
                      onChange={(next) =>
                        setDrafts((prev) =>
                          prev.map((x) => (x.studentId === next.studentId ? next : x)),
                        )
                      }
                    />
                  ))}
                </div>
                {scoreError ? <div className={styles.error}>{scoreError}</div> : null}
                <div className={styles.actionsRow}>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={handleSaveScores}
                    disabled={!canSaveScores}
                  >
                    {savingScores ? 'Сохраняем…' : 'Сохранить оценки'}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className={styles.commentBox}>
            <div className={styles.commentBoxLabel}>Комментарий к командному отчёту</div>
            <textarea
              className={styles.commentBoxInput}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Что обсудить с командой..."
              readOnly={isAccepted && !isReviewable}
            />
            {acceptError ? <div className={styles.error}>{acceptError}</div> : null}
            {isReviewable ? (
              <div className={styles.actionsRow}>
                <button
                  type="button"
                  className={`${styles.btnPrimary} ${styles.btnSm}`}
                  onClick={handleAccept}
                  disabled={accepting}
                >
                  {accepting ? 'Принимаем…' : 'Принять отчёт'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

interface SectionProps {
  title: string;
  body: string;
}

function Section({ title, body }: SectionProps): JSX.Element {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      <p className={styles.sectionBody}>{body}</p>
    </div>
  );
}

function Badge({ info }: { info: StatusBadgeInfo }): JSX.Element {
  const cls =
    info.tone === 'success'
      ? styles.badgeSuccess
      : info.tone === 'warning'
        ? styles.badgeWarning
        : info.tone === 'danger'
          ? styles.badgeDanger
          : styles.badgeMuted;
  return <span className={`${styles.badge} ${cls}`}>{info.text}</span>;
}

function PersonalContribution({ draft }: { draft: ScoreDraft }): JSX.Element {
  return (
    <div className={styles.personalItem}>
      <div className={styles.avatar} style={{ background: avatarColor(draft.studentId) }}>
        {draft.avatarInitials}
      </div>
      <div className={styles.personalContent}>
        <div className={styles.personalName}>{draft.studentName}</div>
        {draft.contribution ? (
          <p className={styles.personalText}>{draft.contribution}</p>
        ) : (
          <span className={styles.personalEmpty}>
            Личный вклад будет добавлен в следующем релизе.
          </span>
        )}
      </div>
    </div>
  );
}

interface ScoreRowProps {
  draft: ScoreDraft;
  onChange: (next: ScoreDraft) => void;
}

function ScoreRow({ draft, onChange }: ScoreRowProps): JSX.Element {
  const error = draft.score == null ? null : validateScore(draft.score);

  return (
    <div className={styles.scoreRow}>
      <div className={styles.avatar} style={{ background: avatarColor(draft.studentId) }}>
        {draft.avatarInitials}
      </div>
      <div className={styles.scoreName}>{draft.studentName}</div>
      <input
        type="number"
        min={MIN_SCORE}
        max={MAX_SCORE}
        step={1}
        placeholder="—"
        className={`${styles.scoreInput} ${error ? styles.scoreInputError : ''}`}
        value={draft.score ?? ''}
        aria-label={`Балл, ${draft.studentName}`}
        onChange={(e) => {
          const raw = e.target.value;
          const parsed = raw === '' ? null : Number.parseInt(raw, 10);
          onChange({ ...draft, score: parsed, dirty: true });
        }}
      />
      <span className={styles.scoreSuffix}>/10</span>
      <input
        type="text"
        placeholder="Комментарий..."
        className={styles.commentInput}
        value={draft.comment}
        aria-label={`Комментарий, ${draft.studentName}`}
        onChange={(e) => onChange({ ...draft, comment: e.target.value, dirty: true })}
      />
    </div>
  );
}
