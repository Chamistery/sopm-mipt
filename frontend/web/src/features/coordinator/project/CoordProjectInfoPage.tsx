/*
 * CoordProjectInfoPage — «Полная информация о проекте» у координатора.
 *
 * URL: /admin/projects/:projectId
 *
 * Структурно — копия mentor'ской MentorProjectInfoPage:
 *   - заголовок + breadcrumb
 *   - <NewProjectForm mode='edit'> с initial = proposalData проекта
 *   - banner «Редактирование проекта — изменения применяются сразу»
 *
 * Поведенческое отличие: координатор НЕ отправляет change-request на
 * утверждение себе же. Submit вызывает updateProject (PUT /api/projects/:id) —
 * изменения применяются к колонкам проекта и записываются в proposal_data
 * сразу, без pending_proposal_data.
 */

import type { JSX } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getProject,
  getProjectProposal,
  updateProject,
  type Project,
} from '@/api/projects';
import { useToast } from '@/_shared/Toast';
import {
  NewProjectForm,
  buildCreateProjectRequest,
  type NewProjectFormSubmit,
} from '@/features/mentor-dashboard/components/NewProjectForm';
import {
  emptyProposalData,
  type ProposalData,
} from '@/features/mentor-dashboard/lib/projectFormState';
import styles from './CoordProjectInfoPage.module.css';

export function CoordProjectInfoPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const toast = useToast();
  const projectId = Number(params.id);

  // Откуда пришёл координатор — берём из location.state.from. Используется
  // и кнопкой Cancel/«К дашборду», и редиректом после Save. Источники:
  //   /admin/applications — карточка заявки «Посмотреть проект»;
  //   /admin              — дашборд (fallback).
  const backTo = ((location.state as { from?: string } | null)?.from) ?? '/admin';
  const backLabel = backTo === '/admin/applications' ? 'К заявкам' : 'К дашборду';

  const projectQuery = useQuery<Project>({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    enabled: Number.isFinite(projectId) && projectId > 0,
  });

  const proposalQuery = useQuery<ProposalData | null>({
    queryKey: ['project', projectId, 'proposal'],
    queryFn: () => getProjectProposal(projectId),
    enabled: Number.isFinite(projectId) && projectId > 0,
    staleTime: 5 * 60_000,
  });

  const mutation = useMutation({
    mutationFn: (value: NewProjectFormSubmit) => {
      const current = projectQuery.data;
      if (!current) throw new Error('Проект ещё не загружен');
      // Backend.Update делает full UPDATE: все колонки (включая status)
      // перезаписываются значениями из payload. Если шлём только
      // ProposalData-поля, status/courses/submittedAt затрутся zero-value
      // (пустая строка для status — и проект пропадает с дашборда, потому
      // что фильтр по статусу его не находит).
      // Решение: payload = current ⨁ proposalData. Status/mentorId/id
      // явно сохраняем поверх, чтобы overlay их не перебил.
      const proposalPayload = buildCreateProjectRequest(value.proposal, {
        mentorId: current.mentorId,
      });
      const payload: Partial<Project> = {
        ...current,
        ...(proposalPayload as unknown as Partial<Project>),
        status: current.status,
        mentorId: current.mentorId,
        id: current.id,
      };
      return updateProject(projectId, payload);
    },
    onSuccess: async () => {
      toast.showSuccess('Изменения применены к проекту');
      await queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['project', projectId, 'proposal'] });
      await queryClient.invalidateQueries({ queryKey: ['coordinator', 'dashboard'] });
      navigate(backTo);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Не удалось сохранить';
      toast.showError(message);
    },
  });

  const isLoading = projectQuery.isLoading || proposalQuery.isLoading;
  const project = projectQuery.data;
  const proposal = proposalQuery.data ?? null;

  // proposalData может отсутствовать у старых проектов до введения JSONB —
  // тогда собираем initial из плоских колонок.
  const initial: ProposalData | undefined = isLoading
    ? undefined
    : proposal || proposalFromProject(project);

  const title = project?.title ?? (isLoading ? 'Загрузка…' : 'Проект не найден');

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Полная информация о проекте</h1>
      <nav className={styles.breadcrumb} aria-label="Хлебные крошки">
        <Link to="/admin" className={styles.breadcrumbLink}>
          Дашборд
        </Link>
        <Chevron />
        <span className={styles.breadcrumbCurrent}>{title}</span>
        <Chevron />
        <span className={styles.breadcrumbCurrent}>Полная информация</span>
      </nav>

      {isLoading || !initial ? (
        <div className={styles.skeleton}>
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonRow} />
        </div>
      ) : (
        <NewProjectForm
          mode="edit"
          initial={initial}
          hideIntro
          headerBanner={<CoordEditBanner projectTitle={project?.title} />}
          submitLabel="Сохранить изменения"
          footerExtras={
            <Link to={backTo} className={styles.closeLink}>
              {backLabel}
            </Link>
          }
          onSubmit={(value) => mutation.mutate(value)}
          onCancel={() => navigate(backTo)}
          isSubmitting={mutation.isPending}
          serverError={mutation.error instanceof Error ? mutation.error.message : null}
        />
      )}
    </div>
  );
}

function CoordEditBanner({ projectTitle }: { projectTitle?: string }): JSX.Element {
  return (
    <div className={styles.coordBanner} role="note">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z"
          stroke="currentColor"
          strokeWidth="1.4"
        />
      </svg>
      <span>
        <b>Редактирование проекта{projectTitle ? ` «${projectTitle}»` : ''}.</b> Вы —
        координатор, изменения применяются к проекту сразу без отправки
        заявки на согласование. Секция «Настройка спринтов» недоступна для
        изменений.
      </span>
    </div>
  );
}

function Chevron(): JSX.Element {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function proposalFromProject(project: Project | undefined): ProposalData {
  const base = emptyProposalData();
  if (!project) return base;
  return {
    ...base,
    title: project.title ?? '',
    company: project.company ?? '',
    goal: project.goal ?? '',
    expectedResult: project.expectedResult ?? '',
    technologies: (project.technologies ?? []).join(', '),
    competencies: project.competencies ?? '',
    minGpa: project.minGpa ?? null,
    description: project.fullDescription ?? project.description ?? '',
    acceptanceCriteria: project.acceptanceCriteria ?? '',
    eduResult: project.eduResult ?? '',
    durationSemesters: (project.durationSemesters as 1 | 2 | 3 | undefined) ?? 1,
    numTeams: project.numTeams ?? 1,
    teamSizeMin: project.teamSizeMin ?? 3,
    teamSizeMax: project.teamSizeMax ?? 5,
    resources: project.resources ?? '',
    predecessorProjectId: project.predecessorProjectId ?? null,
    isContinuation: project.predecessorProjectId != null,
  };
}
