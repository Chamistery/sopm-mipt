import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { createProject } from '@/api/projects';
import { useRequireUser } from '@/auth/useCurrentUser';
import { useArchivedProjectsForTemplate } from './hooks/useArchivedProjectsForTemplate';
import { useProposalTemplate } from './hooks/useProposalTemplate';
import {
  NewProjectForm,
  buildCreateProjectRequest,
  type NewProjectFormSubmit,
} from './components/NewProjectForm';
import styles from './NewProjectPage.module.css';

export function NewProjectPage(): JSX.Element {
  const me = useRequireUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const { archived } = useArchivedProjectsForTemplate(me.userId);
  const { fetchProposal } = useProposalTemplate();

  const mutation = useMutation({
    mutationFn: async (value: NewProjectFormSubmit) =>
      createProject(buildCreateProjectRequest(value.proposal, { mentorId: me.userId })),
    onSuccess: async () => {
      setServerError(null);
      await queryClient.invalidateQueries({ queryKey: ['projects', 'mentor', me.userId] });
      await queryClient.invalidateQueries({ queryKey: ['mentor-dashboard'] });
      navigate('/mentor');
    },
    onError: (error: unknown) => {
      const msg =
        error instanceof ApiError
          ? `Ошибка ${error.status}: ${error.message}`
          : error instanceof Error
            ? error.message
            : 'Не удалось создать проект';
      setServerError(msg);
    },
  });

  return (
    <div className={styles.page}>
      <h1 className={styles.title} id="create-page-title">
        Создание проекта
      </h1>
      <nav className={styles.breadcrumb} aria-label="Хлебные крошки">
        <Link to="/mentor" className={styles.breadcrumbLink}>
          Дашборд
        </Link>
        <svg width="16" height="16" fill="none" viewBox="0 0 16 16" aria-hidden>
          <path
            d="M6 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className={styles.breadcrumbCurrent}>Создание проекта</span>
      </nav>

      <NewProjectForm
        predecessors={archived.map((p) => ({ id: p.id, title: p.title }))}
        onFetchPredecessor={fetchProposal}
        onSubmit={(value) => mutation.mutate(value)}
        onCancel={() => navigate('/mentor')}
        isSubmitting={mutation.isPending}
        serverError={serverError}
      />
    </div>
  );
}
