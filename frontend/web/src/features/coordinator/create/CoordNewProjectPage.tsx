/*
 * Page «Создание проекта» для координатора (admin.html view-create,
 * lines 2066-2186).
 *
 * Отличия от менторской NewProjectPage:
 *   - сверху формы — селектор «Создать от имени ментора», обязательное поле
 *     (admin.html:2095 «Координатор может создавать проекты от имени
 *     любого ментора»);
 *   - mentorId в payload берётся из селектора, а не из текущего пользователя.
 *
 * Реюз: тот же NewProjectForm + useProposalTemplate, что у ментора, плюс
 * useArchivedProjectsForTemplate, но с пустым mentorId (показываем ВСЕ
 * архивные проекты, не только текущего ментора).
 */

import { useMemo, useState, type JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { createProject, listProjects } from '@/api/projects';
import { listUsers, type UserSummary } from '@/api/users';
import {
  NewProjectForm,
  buildCreateProjectRequest,
  type NewProjectFormSubmit,
} from '@/features/mentor-dashboard/components/NewProjectForm';
import { useProposalTemplate } from '@/features/mentor-dashboard/hooks/useProposalTemplate';
import styles from './CoordNewProjectPage.module.css';

export function CoordNewProjectPage(): JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedMentorId, setSelectedMentorId] = useState<number | null>(null);

  // Все менторы из системы.
  const mentorsQuery = useQuery({
    queryKey: ['users', 'mentors'],
    queryFn: async (): Promise<UserSummary[]> => {
      const users = await listUsers();
      return users.filter((u) => u.role === 'mentor');
    },
  });

  // Архивные проекты — для шаблона «продолжение». Координатор видит всё,
  // не фильтруем по mentorId.
  const archivedQuery = useQuery({
    queryKey: ['projects', 'archive', 'all'],
    queryFn: async () => {
      const resp = await listProjects({ limit: 200, status: 'Завершён' });
      return resp.projects;
    },
  });

  const archived = useMemo(() => archivedQuery.data ?? [], [archivedQuery.data]);
  const { fetchProposal } = useProposalTemplate();

  const mutation = useMutation({
    mutationFn: async (value: NewProjectFormSubmit) => {
      if (selectedMentorId == null) {
        throw new Error('Выберите ментора перед созданием проекта');
      }
      return createProject(
        buildCreateProjectRequest(value.proposal, { mentorId: selectedMentorId }),
      );
    },
    onSuccess: async () => {
      setServerError(null);
      await queryClient.invalidateQueries({ queryKey: ['coordinator', 'dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['coordinator', 'applications'] });
      navigate('/admin');
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

  const mentors = mentorsQuery.data ?? [];

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Создание проекта</h1>
      <nav className={styles.breadcrumb} aria-label="Хлебные крошки">
        <Link to="/admin" className={styles.breadcrumbLink}>
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

      <div className={styles.mentorPicker}>
        <label className={styles.label} htmlFor="coord-mentor-select">
          От имени ментора <span className={styles.required}>*</span>
        </label>
        <select
          id="coord-mentor-select"
          className={styles.select}
          value={selectedMentorId ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            setSelectedMentorId(v === '' ? null : Number.parseInt(v, 10));
          }}
        >
          <option value="">— выберите ментора —</option>
          {mentors.map((m) => (
            <option key={m.id} value={m.id}>
              {m.lastName} {m.firstName} {m.middleName ?? ''}
            </option>
          ))}
        </select>
        <div className={styles.hint}>
          Проект будет привязан к выбранному ментору. После создания он
          появится в его дашборде и в заявках на утверждение.
        </div>
      </div>

      {selectedMentorId == null ? (
        <div className={styles.locked}>
          Выберите ментора, чтобы заполнить заявку.
        </div>
      ) : (
        <NewProjectForm
          predecessors={archived.map((p) => ({ id: p.id, title: p.title }))}
          onFetchPredecessor={fetchProposal}
          onSubmit={(value) => mutation.mutate(value)}
          onCancel={() => navigate('/admin')}
          isSubmitting={mutation.isPending}
          serverError={serverError}
        />
      )}
    </div>
  );
}
