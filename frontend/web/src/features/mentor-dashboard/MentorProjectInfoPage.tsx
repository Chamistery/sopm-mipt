import type { JSX } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getProject,
  getProjectProposal,
  updateProject,
  type Project,
} from '@/api/projects';
import { useRequireUser } from '@/auth/useCurrentUser';
import {
  NewProjectForm,
  type NewProjectFormSubmit,
} from './components/NewProjectForm';
import {
  emptyProposalData,
  type ProposalData,
} from './lib/projectFormState';
import styles from './MentorProjectInfoPage.module.css';

/**
 * MentorProjectInfoPage — отдельная страница «Полная информация о проекте».
 *
 * Два роута используют тот же компонент:
 *   - /mentor/projects/:projectId/info             → mode='edit'      (активный)
 *   - /mentor/archive/projects/:projectId/info     → mode='readonly'  (архивный)
 *
 * Компонент читает pathname, определяет режим, грузит proposalData и
 * рендерит `NewProjectForm` в выбранном режиме.
 *
 * Save в режиме edit пока не подключён: бэк не имеет PUT
 * /api/projects/:id/proposal. Кнопка «Сохранить изменения» disabled с
 * tooltip — это known-todo, см. отчёт.
 */
export function MentorProjectInfoPage(): JSX.Element {
  useRequireUser();
  const params = useParams<{ projectId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projectId = Number(params.projectId);
  const isArchive = location.pathname.includes('/archive/');
  const mode: 'readonly' | 'edit' = isArchive ? 'readonly' : 'edit';

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

  // Save для edit пока заглушка — см. отчёт. Оставляем mutation как
  // готовую точку расширения: после появления PUT /api/projects/:id/proposal
  // достаточно убрать submitDisabled-флаг и вернуть кнопке активность.
  const mutation = useMutation({
    mutationFn: async (_value: NewProjectFormSubmit) => {
      // Заглушка. После реализации бэка — заменить на updateProjectProposal.
      // Сейчас mutation не вызывается из формы (кнопка disabled).
      return updateProject(projectId, {});
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['project', projectId, 'proposal'] });
      navigate(isArchive ? '/mentor/archive' : '/mentor');
    },
  });

  const isLoading = projectQuery.isLoading || proposalQuery.isLoading;
  const project = projectQuery.data;
  const proposal = proposalQuery.data ?? null;

  // Если proposalData отсутствует (старый проект до введения jsonb-формы),
  // показываем форму со скелетом emptyProposalData(), но с реальным title /
  // company / description из Project. Это лучше, чем «нет данных».
  const initial: ProposalData | undefined = isLoading
    ? undefined
    : proposal ?? proposalFromProject(project);

  const backTo = isArchive ? '/mentor/archive' : '/mentor';
  const backLabel = isArchive ? 'Архив' : 'Дашборд';
  const title = project?.title ?? (isLoading ? 'Загрузка…' : 'Проект не найден');

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Полная информация о проекте</h1>
      <nav className={styles.breadcrumb} aria-label="Хлебные крошки">
        <Link to={backTo} className={styles.breadcrumbLink}>
          {backLabel}
        </Link>
        <Chevron />
        <span className={styles.breadcrumbCurrent}>{title}</span>
        <Chevron />
        <span className={styles.breadcrumbCurrent}>Полная информация</span>
      </nav>

      {isLoading || !initial ? (
        <div className={styles.skeleton} data-testid="info-skeleton">
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonRow} />
        </div>
      ) : (
        <NewProjectForm
          mode={mode}
          initial={initial}
          hideIntro
          headerBanner={
            mode === 'readonly' ? (
              <ReadonlyBanner />
            ) : (
              <EditBanner />
            )
          }
          // Save отключён — бэка нет; mutation остаётся, но UI блокирует.
          submitDisabled
          submitDisabledHint="Сохранение появится в следующем релизе"
          footerExtras={
            <Link to={backTo} className={styles.closeLink} data-testid="info-close">
              {mode === 'readonly' ? 'Закрыть' : 'К дашборду'}
            </Link>
          }
          onSubmit={(value) => mutation.mutate(value)}
          onCancel={() => navigate(backTo)}
          isSubmitting={mutation.isPending}
        />
      )}
    </div>
  );
}

function ReadonlyBanner(): JSX.Element {
  return (
    <div className={styles.readonlyBanner} role="note">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M3 5h10M4 5v7a1 1 0 001 1h6a1 1 0 001-1V5M6 8h4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      <span>
        Карточка <b>завершённого</b> проекта. Просмотр только для чтения — поля
        соответствуют поданной заявке.
      </span>
    </div>
  );
}

function EditBanner(): JSX.Element {
  return (
    <div className={styles.editBanner} role="note">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z"
          stroke="currentColor"
          strokeWidth="1.4"
        />
      </svg>
      <span>
        <b>Редактирование проекта.</b> После сохранения изменения вступят в силу
        только после одобрения координатором. Секция «Настройка спринтов»
        недоступна для изменений.
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

/**
 * Fallback из полей `Project`, если proposal не пришёл с бэка (старые
 * проекты до введения jsonb-колонки). Заполняем минимум, остальное —
 * `emptyProposalData()`.
 */
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
