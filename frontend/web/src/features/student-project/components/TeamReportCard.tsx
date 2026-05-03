import { useEffect, useState } from 'react';

import type { TeamReportDto, TeamReportStatus } from '@/api/teams';
import { ApiError } from '@/api/client';
import { formatRuRange } from '../lib/dates';
import styles from './TeamReportCard.module.css';

/*
 * Карточка командного отчёта (видна только тимлиду).
 *
 * Сетевые мутации поднимаем наружу — компонент общается через onSave.
 * Это упрощает Storybook и тесты: фейкаем колбэк, а не QueryClient.
 */

export interface SaveTeamReportArgs {
  whatDone: string;
  problems: string;
  nextPlan: string;
  status?: TeamReportStatus;
}

interface Props {
  /** null если отчёта в БД ещё нет (POST при первом сохранении). */
  report: TeamReportDto | null;
  sprintNumber: number;
  sprintStartDate: string;
  sprintEndDate: string;
  busy?: boolean;
  onSave: (args: SaveTeamReportArgs) => Promise<void>;
}

export function TeamReportCard({
  report,
  sprintNumber,
  sprintStartDate,
  sprintEndDate,
  busy = false,
  onSave,
}: Props): JSX.Element {
  const [whatDone, setWhatDone] = useState(report?.whatDone ?? '');
  const [problems, setProblems] = useState(report?.problems ?? '');
  const [nextPlan, setNextPlan] = useState(report?.nextPlan ?? '');
  const [error, setError] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState(false);

  // Когда отчёт пришёл/обновился с сервера — синкаем поля.
  useEffect(() => {
    setWhatDone(report?.whatDone ?? '');
    setProblems(report?.problems ?? '');
    setNextPlan(report?.nextPlan ?? '');
  }, [report]);

  const status: TeamReportStatus = report?.status ?? 'Черновик';
  const locked = status === 'Отправлен' || status === 'Проверен';

  const flashSavedToast = (): void => {
    setSavedToast(true);
    window.setTimeout(() => setSavedToast(false), 1500);
  };

  const handleSave = async (newStatus?: TeamReportStatus): Promise<void> => {
    setError(null);
    if (!whatDone.trim()) {
      setError('Заполните «Что сделано»');
      return;
    }
    try {
      await onSave({
        whatDone: whatDone.trim(),
        problems: problems.trim(),
        nextPlan: nextPlan.trim(),
        status: newStatus,
      });
      flashSavedToast();
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? `Ошибка ${e.status}: ${e.message}`
          : e instanceof Error
            ? e.message
            : 'Не удалось сохранить отчёт';
      setError(msg);
    }
  };

  return (
    <section className={styles.card} aria-label={`Командный отчёт — Спринт ${sprintNumber}`}>
      <div className={styles.head}>
        <div className={styles.titleGroup}>
          <span className={`${styles.statusChip} ${statusToClass(status)}`}>{status}</span>
          <h3 className={styles.title}>Командный отчёт — Спринт {sprintNumber}</h3>
        </div>
        <span className={styles.dateRange}>
          {formatRuRange(sprintStartDate, sprintEndDate)}
        </span>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Что сделано *</label>
        <textarea
          className={`${styles.textarea} ${styles.textareaMain}`}
          value={whatDone}
          readOnly={locked}
          onChange={(e) => setWhatDone(e.target.value)}
          placeholder="Ключевые результаты команды за спринт…"
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Проблемы и риски</label>
        <textarea
          className={styles.textarea}
          value={problems}
          readOnly={locked}
          onChange={(e) => setProblems(e.target.value)}
          placeholder="Какие проблемы возникли…"
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>План на следующий спринт</label>
        <textarea
          className={styles.textarea}
          value={nextPlan}
          readOnly={locked}
          onChange={(e) => setNextPlan(e.target.value)}
          placeholder="Что планируется сделать…"
        />
      </div>

      {report?.mentorComment ? (
        <div className={styles.mentorBlock}>
          <div className={styles.mentorTitle}>Комментарий ментора</div>
          <div className={styles.mentorText}>{report.mentorComment}</div>
          {report.score ? (
            <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: 'var(--color-success)' }}>
              Оценка: {report.score}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={styles.actions}>
        {error ? <span className={styles.errorInline}>{error}</span> : null}
        {savedToast && !error ? <span className={styles.toast}>Сохранено</span> : null}
        {!locked ? (
          <>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => void handleSave('Черновик')}
              disabled={busy}
            >
              Сохранить черновик
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => void handleSave('Отправлен')}
              disabled={busy}
            >
              Отправить на проверку
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}

function statusToClass(s: TeamReportStatus): string {
  if (s === 'Отправлен') return styles.statusSubmitted;
  if (s === 'Проверен') return styles.statusReviewed;
  return styles.statusDraft;
}
