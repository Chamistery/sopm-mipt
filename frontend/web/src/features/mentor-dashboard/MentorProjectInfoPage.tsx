import type { JSX } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getProject,
  getProjectProposal,
  submitProjectChangeRequest,
  type Project,
} from '@/api/projects';
import { useRequireUser } from '@/auth/useCurrentUser';
import { useToast } from '@/_shared/Toast';
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
 * Save в режиме edit — change request: изменения отправляются на утверждение
 * координатору через POST /projects/:id/change-request (а не применяются сразу
 * к проекту, потому что проект публичный, студенты могут уже подавать заявки).
 * Если на проекте уже есть pending submission — рисуем оранжевый banner вместо
 * синего и блокируем дальнейший submit, пока координатор не утвердит / отклонит.
 */
export function MentorProjectInfoPage(): JSX.Element {
  useRequireUser();
  const params = useParams<{ projectId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
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

  const mutation = useMutation({
    mutationFn: (value: NewProjectFormSubmit) =>
      submitProjectChangeRequest(projectId, { proposalData: value.proposal }),
    onSuccess: async () => {
      toast.showSuccess('Изменения отправлены координатору');
      await queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['project', projectId, 'proposal'] });
      navigate(backTo);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Не удалось отправить изменения';
      toast.showError(message);
    },
  });

  const isLoading = projectQuery.isLoading || proposalQuery.isLoading;
  const project = projectQuery.data;
  const proposal = proposalQuery.data ?? null;
  const pendingSubmittedAt = project?.pendingSubmittedAt ?? null;
  const hasPending = mode === 'edit' && pendingSubmittedAt != null;

  // Если proposalData отсутствует (старый проект до введения jsonb-формы),
  // показываем форму со скелетом emptyProposalData(), но с реальным title /
  // company / description из Project. Это лучше, чем «нет данных».
  // В edit-режиме при наличии pendingProposalData показываем именно её —
  // ментор видит «что я отправил координатору», а не старую версию.
  const initial: ProposalData | undefined = isLoading
    ? undefined
    : (hasPending && project?.pendingProposalData) ||
      proposal ||
      proposalFromProject(project);

  // Откуда пришёл пользователь — берём из location.state.from. Используется
  // и кнопкой «К дашборду»/«Закрыть», и редиректом после Save. Если
  // state.from отсутствует (открыли по прямой ссылке) — fallback на
  // /mentor или /mentor/archive в зависимости от роута.
  const fromState = (location.state as { from?: string } | null)?.from;
  const backTo = fromState ?? (isArchive ? '/mentor/archive' : '/mentor');
  const backLabel = pickBackLabel(backTo, isArchive);
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
            ) : hasPending ? (
              <PendingBanner submittedAt={pendingSubmittedAt as string} />
            ) : (
              <EditBanner projectTitle={project?.title} />
            )
          }
          submitLabel={hasPending ? 'Обновить запрос' : 'Отправить на согласование'}
          footerExtras={
            <Link to={backTo} className={styles.closeLink} data-testid="info-close">
              {mode === 'readonly' ? 'Закрыть' : backLabel}
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

function EditBanner({ projectTitle }: { projectTitle?: string }): JSX.Element {
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
        <b>Редактирование проекта{projectTitle ? ` «${projectTitle}»` : ''}.</b> После
        отправки изменения требуют утверждения координатором. Секция «Настройка
        спринтов» недоступна для изменений.
      </span>
    </div>
  );
}

function PendingBanner({ submittedAt }: { submittedAt: string }): JSX.Element {
  const formatted = formatPendingDate(submittedAt);
  return (
    <div className={styles.pendingBanner} role="note" data-testid="pending-banner">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 4v4l2.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <span>
        <b>Изменения отправлены координатору {formatted}.</b> Ожидается утверждение.
        Вы можете отредактировать заявку и отправить новую версию — предыдущая
        будет перезаписана.
      </span>
    </div>
  );
}

/**
 * Подпись для кнопки/ссылки возврата. Если from совпадает с известным
 * страничным контекстом — берём осмысленное название; иначе «Назад».
 */
function pickBackLabel(backTo: string, isArchive: boolean): string {
  if (backTo === '/mentor' || backTo === '/admin') return 'К дашборду';
  if (backTo === '/mentor/archive' || backTo === '/admin/archive') return 'Архив';
  if (backTo === '/admin/applications') return 'К заявкам';
  if (backTo === '/admin/distribution' || backTo === '/mentor/distribution')
    return 'К распределению';
  return isArchive ? 'Архив' : 'Назад';
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
 * Форматирует ISO timestamp в «DD.MM.YYYY HH:MM» для отображения в banner'е.
 * Локально-ориентированный формат — pixel-port из mentor.html, где принято
 * именно русское представление даты.
 */
function formatPendingDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
