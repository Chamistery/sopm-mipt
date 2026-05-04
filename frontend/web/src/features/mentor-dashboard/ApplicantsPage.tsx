import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import {
  inviteApplicant,
  recommendApplicant,
  unrecommendApplicant,
  type ProjectApplicantsResponse,
} from '@/api/applications';
import { ApplicantsBoard } from './components/ApplicantsBoard';
import { useProjectApplicants } from './hooks/useProjectApplicants';
import { useProjectDetail } from './hooks/useProjectDetail';
import styles from './ApplicantsPage.module.css';

/**
 * Mentor distribution screen. Shows applicants by priority on the left
 * and the project's teams on the right; the mentor recommends students
 * into teams (PUT /recommend), can undo (PUT /unrecommend), and finally
 * sends the invite (PUT /invite) which locks the slot.
 */
export function ApplicantsPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const projectId = Number.parseInt(params.id ?? '', 10);
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const projectQuery = useProjectDetail(projectId);
  const applicantsQuery = useProjectApplicants(projectId);

  const refresh = (): Promise<unknown> =>
    queryClient.invalidateQueries({ queryKey: ['project', projectId, 'applicants'] });

  const handleError = (error: unknown): void => {
    setActionError(
      error instanceof ApiError
        ? `Ошибка ${error.status}: ${error.message}`
        : error instanceof Error
          ? error.message
          : 'Не удалось обновить заявку',
    );
  };

  const recommendMutation = useMutation({
    mutationFn: ({ id, teamId }: { id: number; teamId: number }) => recommendApplicant(id, teamId),
    onMutate: ({ id }) => {
      setPendingId(id);
      setActionError(null);
    },
    onSuccess: () => refresh(),
    onError: handleError,
    onSettled: () => setPendingId(null),
  });

  const unrecommendMutation = useMutation({
    mutationFn: (id: number) => unrecommendApplicant(id),
    onMutate: (id) => {
      setPendingId(id);
      setActionError(null);
    },
    onSuccess: () => refresh(),
    onError: handleError,
    onSettled: () => setPendingId(null),
  });

  const inviteMutation = useMutation({
    mutationFn: (id: number) => inviteApplicant(id),
    onMutate: (id) => {
      setPendingId(id);
      setActionError(null);
    },
    onSuccess: () => refresh(),
    onError: handleError,
    onSettled: () => setPendingId(null),
  });

  if (!Number.isFinite(projectId) || projectId <= 0) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>Некорректный идентификатор проекта</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link to="/mentor" className={styles.back}>
        ← К дашборду
      </Link>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Распределение студентов</h1>
          {projectQuery.data ? (
            <div className={styles.subtitle}>{projectQuery.data.project.title}</div>
          ) : null}
        </div>
        {applicantsQuery.data ? (
          <RequirementsBadge data={applicantsQuery.data} />
        ) : null}
      </header>

      {actionError ? <div className={styles.error}>{actionError}</div> : null}

      {applicantsQuery.isLoading ? (
        <div className={styles.placeholder}>Загружаем заявки…</div>
      ) : applicantsQuery.error ? (
        <div className={styles.error}>
          {applicantsQuery.error instanceof ApiError
            ? `Ошибка ${applicantsQuery.error.status}: ${applicantsQuery.error.message}`
            : 'Не удалось загрузить заявки'}
        </div>
      ) : applicantsQuery.data ? (
        <ApplicantsBoard
          qualified={applicantsQuery.data.qualified}
          unqualified={applicantsQuery.data.unqualified}
          teams={applicantsQuery.data.teams}
          pendingApplicationId={pendingId}
          onRecommend={(applicationId, teamId) =>
            recommendMutation.mutate({ id: applicationId, teamId })
          }
          onUnrecommend={(applicationId) => unrecommendMutation.mutate(applicationId)}
          onInvite={(applicationId) => inviteMutation.mutate(applicationId)}
        />
      ) : null}
    </div>
  );
}

function RequirementsBadge({ data }: { data: ProjectApplicantsResponse }): JSX.Element {
  return (
    <div className={styles.req}>
      <div className={styles.reqLabel}>Требования</div>
      <div className={styles.reqValue}>
        Курс ≥ {data.requirements.minCourse}
        {data.requirements.minGpa > 0 ? ` · GPA ≥ ${data.requirements.minGpa.toFixed(2)}` : ''}
      </div>
    </div>
  );
}
