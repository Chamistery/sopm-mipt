/*
 * Таб «Отчёты по спринтам» страницы команды у ментора.
 *
 * Pixel-port из mentor.html (tab-reports, lines 970–1075). Сворачиваемые
 * карточки отчётов (текущий — открыт, прошедшие — свёрнуты по дефолту),
 * заголовок «Спринт N (DD ммм — DD ммм)», статус-бейдж с агрегатной
 * оценкой, подсекция «Личный вклад участников» (fallback из SprintScore.
 * comment, см. отчёт по задаче), общая кнопка «Сохранить оценки» и
 * кнопка «Принять отчёт». В шапке — outline-кнопка «Выгрузить отчёт»,
 * открывающая ExportReportModal (фактическая генерация документа —
 * отдельный backend-таск, пока что просто show banner).
 */

import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import {
  createSprintScore,
  updateSprintScore,
  type SprintScore,
} from '@/api/sprintScores';
import {
  exportTeamReportDocx,
  triggerDownload,
} from '@/api/teamReportExport';
import {
  reviewTeamReport,
  type TeamReport,
} from '@/api/teamReports';
import { useRequireUser } from '@/auth/useCurrentUser';
import { useToast } from '@/_shared/Toast';
import { initials, shortName } from '@/features/student-project/lib/people';

import {
  ExportReportModal,
  type ExportReportPeriodOption,
  type ExportReportSelection,
} from '../components/ExportReportModal';
import {
  SprintReportCard,
  type ScoreDraft,
  type SprintReportCardMember,
} from '../components/SprintReportCard';
import { useSprintScores } from '../hooks/useSprintScores';
import { useProjectSprints, useTeam } from '../hooks/useTeam';
import { useTeamReports } from '../hooks/useTeamReports';
import { reportTitle, sortReports } from '../lib/sprintReportHelpers';
import styles from './MentorTeamReportsTab.module.css';

interface Props {
  teamId: number;
  /**
   * mode='coordinator' — режим только-чтения для координатора:
   *   кнопки «Сохранить оценки» и «Принять отчёт» спрятаны, инпуты
   *   баллов и комментариев заблокированы. Кнопка «Выгрузить отчёт»
   *   остаётся — выгрузка не редактирует данные.
   */
  mode?: 'mentor' | 'coordinator';
}

export function MentorTeamReportsTab({ teamId, mode = 'mentor' }: Props): JSX.Element {
  const teamQuery = useTeam(teamId);
  const reportsQuery = useTeamReports(teamId);
  const projectId = teamQuery.data?.projectId ?? null;
  const sprintsQuery = useProjectSprints(projectId);

  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { showSuccess, showError } = useToast();

  const sprintsList = sprintsQuery.data;
  const sprintsById = useMemo(() => {
    const map = new Map<number, NonNullable<typeof sprintsList>[number]>();
    for (const s of sprintsList ?? []) map.set(s.id, s);
    return map;
  }, [sprintsList]);

  const sortedReports = useMemo(
    () => sortReports(reportsQuery.data ?? [], sprintsById),
    [reportsQuery.data, sprintsById],
  );

  const members = useMemo<SprintReportCardMember[]>(() => {
    return (teamQuery.data?.members ?? []).map((m) => {
      const person = {
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        middleName: m.user.middleName ?? null,
      };
      return {
        userId: m.userId,
        shortName: shortName(person),
        avatarInitials: initials(person),
      };
    });
  }, [teamQuery.data]);

  // Текущий спринт = либо `Активный`, либо первый report (top-of-list).
  // Используем чтобы понять, какую карточку открывать по дефолту.
  const sprintsData = sprintsQuery.data;
  const currentSprintId = useMemo(() => {
    const active = (sprintsData ?? []).find((s) => s.status === 'Активный');
    if (active) return active.id;
    return sortedReports[0]?.sprintId ?? null;
  }, [sprintsData, sortedReports]);

  const periodOptions = useMemo<ExportReportPeriodOption[]>(() => {
    const opts: ExportReportPeriodOption[] = [];
    if (currentSprintId != null) {
      opts.push({ value: 'current', label: 'Текущий спринт' });
    }
    opts.push({ value: 'all', label: 'Все спринты' });
    for (const r of sortedReports) {
      const sprint = sprintsById.get(r.sprintId) ?? null;
      opts.push({ value: `sprint:${r.sprintId}`, label: reportTitle(r, sprint) });
    }
    return opts;
  }, [currentSprintId, sortedReports, sprintsById]);

  async function handleExportSubmit(selection: ExportReportSelection): Promise<void> {
    // period: 'current' | 'all' | 'sprint:N' (см. ExportReportModal).
    // 'all' идёт одним запросом с sprintIds=... — бэк склеит все спринты
    // в один DOCX через page break (build_multi_docx).
    const sprintIds = resolveSprintIds(selection.period, currentSprintId, sortedReports);
    if (sprintIds.length === 0) {
      showError('Не удалось определить спринт для выгрузки');
      return;
    }
    setIsExporting(true);
    try {
      const { blob, filename } = await exportTeamReportDocx(
        sprintIds.length === 1
          ? { teamId, sprintId: sprintIds[0], kind: 'team' }
          : { teamId, sprintIds, kind: 'team' },
      );
      triggerDownload(blob, filename);
      setShowExportModal(false);
      showSuccess('Отчёт скачан');
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `Ошибка ${err.status}: ${err.message}`
          : err instanceof Error
            ? err.message
            : 'Не удалось скачать отчёт';
      showError(msg);
    } finally {
      setIsExporting(false);
    }
  }

  if (reportsQuery.isLoading || teamQuery.isLoading) {
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

  return (
    <div className={styles.tab}>
      <div className={styles.head}>
        <h2 className={styles.sectionTitle}>Отчёты по спринтам</h2>
        <button
          type="button"
          className={styles.btnOutline}
          onClick={() => setShowExportModal(true)}
        >
          <DownloadIcon />
          Выгрузить отчёт
        </button>
      </div>

      {sortedReports.length === 0 ? (
        <div className={styles.empty}>Команда ещё не отправляла отчётов.</div>
      ) : (
        <div className={styles.reportList}>
          {sortedReports.map((report) => (
            <ReportCardWrapper
              key={report.id}
              report={report}
              sprint={sprintsById.get(report.sprintId) ?? null}
              members={members}
              teamId={teamId}
              defaultExpanded={report.sprintId === currentSprintId}
              readOnly={mode === 'coordinator'}
            />
          ))}
        </div>
      )}

      {showExportModal ? (
        <ExportReportModal
          periodOptions={periodOptions}
          onClose={() => setShowExportModal(false)}
          onSubmit={handleExportSubmit}
          isSubmitting={isExporting}
        />
      ) : null}
    </div>
  );
}

interface ReportCardWrapperProps {
  report: TeamReport;
  sprint: NonNullable<ReturnType<typeof useProjectSprints>['data']>[number] | null;
  members: SprintReportCardMember[];
  teamId: number;
  defaultExpanded: boolean;
  readOnly?: boolean;
}

function ReportCardWrapper({
  report,
  sprint,
  members,
  teamId,
  defaultExpanded,
  readOnly = false,
}: ReportCardWrapperProps): JSX.Element {
  const me = useRequireUser();
  const queryClient = useQueryClient();
  const scoresQuery = useSprintScores({ sprintId: report.sprintId, teamId });

  const [expanded, setExpanded] = useState<boolean>(defaultExpanded);

  const acceptMutation = useMutation({
    mutationFn: (mentorComment: string) => reviewTeamReport(report.id, { mentorComment }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['team', teamId, 'reports'] });
    },
  });

  const saveScoresMutation = useMutation({
    mutationFn: async (drafts: ScoreDraft[]): Promise<SprintScore[]> => {
      const results = await Promise.all(
        drafts.map((d) => {
          if (d.score == null) {
            throw new Error(`Балл для ${d.studentName} не указан`);
          }
          if (d.existingId != null) {
            return updateSprintScore(d.existingId, {
              score: d.score,
              comment: d.comment.trim() || undefined,
            });
          }
          return createSprintScore({
            sprintId: report.sprintId,
            teamId,
            studentId: d.studentId,
            score: d.score,
            comment: d.comment.trim() || undefined,
            scoredById: me.userId,
          });
        }),
      );
      return results;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['sprint-scores', teamId, report.sprintId],
      });
    },
  });

  return (
    <SprintReportCard
      report={report}
      sprint={sprint}
      members={members}
      scores={scoresQuery.data ?? []}
      scoresLoading={scoresQuery.isLoading}
      expanded={expanded}
      readOnly={readOnly}
      onToggle={() => setExpanded((v) => !v)}
      onSaveScores={async (drafts) => {
        try {
          const saved = await saveScoresMutation.mutateAsync(drafts);
          return { ok: true, saved };
        } catch (err) {
          return { ok: false, error: errorMessage(err, 'Не удалось сохранить оценки') };
        }
      }}
      onAcceptReport={async (mentorComment) => {
        try {
          await acceptMutation.mutateAsync(mentorComment);
          return { ok: true };
        } catch (err) {
          return { ok: false, error: errorMessage(err, 'Не удалось принять отчёт') };
        }
      }}
    />
  );
}

/**
 * Маппит выбор period из ExportReportModal в список sprintId, по которым
 * нужно сгенерировать DOCX. 'current' → текущий спринт; 'all' → все спринты
 * с отчётами (по возрастанию); 'sprint:N' → один спринт N.
 */
function resolveSprintIds(
  period: string,
  currentSprintId: number | null,
  sortedReports: TeamReport[],
): number[] {
  if (period === 'current') {
    return currentSprintId != null ? [currentSprintId] : [];
  }
  if (period === 'all') {
    // sortedReports идёт по убыванию (текущий первым) — для скачивания
    // удобнее по возрастанию.
    return [...sortedReports].reverse().map((r) => r.sprintId);
  }
  if (period.startsWith('sprint:')) {
    const id = Number.parseInt(period.slice('sprint:'.length), 10);
    return Number.isFinite(id) && id > 0 ? [id] : [];
  }
  return [];
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return `Ошибка ${err.status}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return fallback;
}

function DownloadIcon(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2v9M4 7l4 4 4-4M2 14h12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
