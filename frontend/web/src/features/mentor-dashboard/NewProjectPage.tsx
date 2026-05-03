import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { createProject } from '@/api/projects';
import { listTemplates } from '@/api/templates';
import { useRequireUser } from '@/auth/useCurrentUser';
import {
  NewProjectForm,
  buildCreateProjectRequest,
  type NewProjectFormResult,
} from './components/NewProjectForm';
import styles from './NewProjectPage.module.css';

export function NewProjectPage(): JSX.Element {
  const me = useRequireUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const templatesQuery = useQuery({
    queryKey: ['templates'],
    queryFn: listTemplates,
    staleTime: 5 * 60_000,
  });

  const defaultTemplate = templatesQuery.data?.[0];

  const mutation = useMutation({
    mutationFn: async (value: NewProjectFormResult) => {
      if (!defaultTemplate) {
        throw new Error('Шаблон проекта не настроен');
      }
      return createProject(
        buildCreateProjectRequest(value, {
          mentorId: me.userId,
          templateId: defaultTemplate.id,
        }),
      );
    },
    onSuccess: async () => {
      setServerError(null);
      await queryClient.invalidateQueries({ queryKey: ['projects', 'mentor', me.userId] });
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
      <header className={styles.header}>
        <Link to="/mentor" className={styles.back}>
          ← К списку проектов
        </Link>
        <h1 className={styles.title}>Новый проект</h1>
      </header>

      {templatesQuery.isLoading ? (
        <div className={styles.placeholder}>Загружаем шаблон…</div>
      ) : (
        <NewProjectForm
          onSubmit={(value) => mutation.mutate(value)}
          onCancel={() => navigate('/mentor')}
          isSubmitting={mutation.isPending}
          serverError={serverError}
          templateMissing={!templatesQuery.isLoading && !defaultTemplate}
        />
      )}
    </div>
  );
}
