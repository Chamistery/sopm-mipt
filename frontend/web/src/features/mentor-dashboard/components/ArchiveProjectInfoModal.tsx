/*
 * ArchiveProjectInfoModal — модалка «Полная информация» о завершённом
 * проекте. Pixel-port из mentor.html (archive-info-modal:1576-1580 +
 * renderArchiveFullInfoHtml:2150-2240).
 *
 * Данные читаются с GET /api/projects/:id/proposal — это JSONB с полями
 * заявки (Положение о ПП). На бэке колонка существует, в архивных
 * фикстурах MSW заполнена. Для проектов без proposal_data показываем
 * fallback-блок с тем, что есть в `Project` (description, technologies,
 * goal и т.п.) — чтобы модалка не была пустой.
 *
 * Esc закрывает; клик по overlay тоже. Аннимации (fadeIn / slideUp) —
 * 200ms, как в AddMeetingModal.
 */

import type { JSX } from 'react';
import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { getProject, getProjectProposal, type Project } from '@/api/projects';
import type { ProposalData } from '../lib/projectFormState';
import styles from './ArchiveProjectInfoModal.module.css';

interface Props {
  projectId: number;
  onClose: () => void;
}

export function ArchiveProjectInfoModal({ projectId, onClose }: Props): JSX.Element {
  // Esc для закрытия. Body lock реализуем здесь же.
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const proposalQuery = useQuery<ProposalData | null>({
    queryKey: ['project', projectId, 'proposal'],
    queryFn: () => getProjectProposal(projectId),
    enabled: Number.isFinite(projectId) && projectId > 0,
    staleTime: 5 * 60_000,
  });

  // Параллельно тянем сам Project (для fallback-полей и заголовка).
  const projectQuery = useQuery<Project>({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    enabled: Number.isFinite(projectId) && projectId > 0,
  });

  const isLoading = proposalQuery.isLoading || projectQuery.isLoading;
  const project = projectQuery.data;
  const proposal = proposalQuery.data;

  const fields = useMemo<DisplayField[]>(() => buildFields(proposal, project), [
    proposal,
    project,
  ]);

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-info-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            {project?.company ? <div className={styles.company}>{project.company}</div> : null}
            <h2 id="archive-info-title" className={styles.title}>
              {project?.title ?? 'Архивный проект'}
            </h2>
          </div>
          <div className={styles.headerRight}>
            <span className={styles.statusPill}>Завершён</span>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Закрыть модалку"
            >
              ✕
            </button>
          </div>
        </header>

        {isLoading ? (
          <div className={styles.body}>
            <div className={styles.skeletonRow} />
            <div className={styles.skeletonRow} />
            <div className={styles.skeletonRow} />
            <div className={styles.skeletonRow} />
          </div>
        ) : proposalQuery.error && !(proposalQuery.error instanceof ApiError) ? (
          <div className={styles.body}>
            <div className={styles.error}>Не удалось загрузить заявку проекта.</div>
          </div>
        ) : (
          <div className={styles.body} data-testid="archive-info-body">
            {fields.map((f) => (
              <Section key={f.label} label={f.label} value={f.value} multiline={f.multiline} />
            ))}
          </div>
        )}

        <footer className={styles.footer}>
          <button type="button" className={styles.primaryBtn} onClick={onClose}>
            Закрыть
          </button>
        </footer>
      </div>
    </div>
  );
}

interface DisplayField {
  label: string;
  value: string;
  multiline?: boolean;
}

interface SectionProps {
  label: string;
  value: string;
  multiline?: boolean;
}

function Section({ label, value, multiline }: SectionProps): JSX.Element {
  return (
    <div className={styles.section}>
      <div className={styles.sectionLabel}>{label}</div>
      <div className={`${styles.sectionValue} ${multiline ? styles.sectionMultiline : ''}`}>
        {value || '—'}
      </div>
    </div>
  );
}

function buildFields(
  proposal: ProposalData | null | undefined,
  project: Project | undefined,
): DisplayField[] {
  if (proposal) {
    const courses =
      proposal.allowedCourses.length > 0
        ? proposal.allowedCourses.map((c) => `${c} курс`).join(', ')
        : 'Любой курс';
    return [
      { label: 'Цель проекта', value: proposal.goal, multiline: true },
      { label: 'Ожидаемый результат', value: proposal.expectedResult, multiline: true },
      { label: 'Описание', value: proposal.description, multiline: true },
      { label: 'Технологии', value: proposal.technologies, multiline: true },
      { label: 'Компетенции', value: proposal.competencies, multiline: true },
      { label: 'Образовательный результат', value: proposal.eduResult, multiline: true },
      { label: 'Критерии приёмки', value: proposal.acceptanceCriteria, multiline: true },
      { label: 'Ресурсы Инициатора', value: proposal.resources, multiline: true },
      {
        label: 'Длительность',
        value: `${proposal.durationSemesters} ${plural(
          proposal.durationSemesters,
          'семестр',
          'семестра',
          'семестров',
        )}`,
      },
      {
        label: 'Команды',
        value: `${proposal.numTeams} × ${proposal.teamSizeMin}–${proposal.teamSizeMax} чел.`,
      },
      { label: 'Допустимые курсы', value: courses },
      {
        label: 'Минимальный GPA',
        value: proposal.minGpa != null ? proposal.minGpa.toFixed(1) : '—',
      },
      { label: 'Контактное лицо', value: proposal.mentor.fullName },
      { label: 'Email ментора', value: proposal.mentor.email },
    ];
  }

  // Fallback — берём всё, что есть в Project.
  if (!project) return [];
  return [
    { label: 'Цель проекта', value: project.goal ?? '', multiline: true },
    {
      label: 'Ожидаемый результат',
      value: project.expectedResult ?? '',
      multiline: true,
    },
    { label: 'Описание', value: project.description ?? '', multiline: true },
    {
      label: 'Подробное описание',
      value: project.fullDescription ?? '',
      multiline: true,
    },
    {
      label: 'Технологии',
      value: (project.technologies ?? []).join(', '),
    },
    {
      label: 'Компетенции',
      value: project.competencies ?? '',
      multiline: true,
    },
    {
      label: 'Образовательный результат',
      value: project.eduResult ?? '',
      multiline: true,
    },
    {
      label: 'Критерии приёмки',
      value: project.acceptanceCriteria ?? '',
      multiline: true,
    },
    {
      label: 'Ресурсы Инициатора',
      value: project.resources ?? '',
      multiline: true,
    },
    {
      label: 'Команды',
      value: `${project.numTeams} × ${project.teamSizeMin}–${project.teamSizeMax} чел.`,
    },
  ];
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
