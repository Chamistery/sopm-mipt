import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ApiError } from '@/api/client';
import {
  PROJECT_STATUS_PENDING,
  type ProjectStatus,
  type ProjectTeam,
  type ProjectTeamMember,
} from '@/api/projects';
import { useProjectFullQuery } from './hooks/useProjects';
import {
  useExcludeApplication,
  useUpdateProjectStatus,
} from './hooks/useProjectActions';
import styles from './ProjectDetailPage.module.css';

const ACTIVE_STATUSES: ReadonlySet<ProjectStatus> = new Set([
  'Активный',
  'Опубликован',
  'Утверждён',
]);

export function ProjectDetailPage(): JSX.Element {
  const { id: rawId } = useParams<{ id: string }>();
  const id = Number(rawId);

  if (!Number.isFinite(id) || id <= 0) {
    return <div className={styles.error}>Некорректный идентификатор проекта.</div>;
  }

  return <ProjectDetail id={id} />;
}

interface ProjectDetailProps {
  id: number;
}

function ProjectDetail({ id }: ProjectDetailProps): JSX.Element {
  const projectQuery = useProjectFullQuery(id);
  const updateStatus = useUpdateProjectStatus(id);
  const exclude = useExcludeApplication(id);

  const [returnComment, setReturnComment] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmingExclude, setConfirmingExclude] = useState<number | null>(null);

  if (projectQuery.isLoading) {
    return <div className={styles.loading}>Загружаем проект…</div>;
  }
  if (projectQuery.error) {
    return (
      <div className={styles.error}>
        {formatError(projectQuery.error, 'Не удалось загрузить проект')}
      </div>
    );
  }
  if (!projectQuery.data) {
    return <div className={styles.empty}>Проект не найден.</div>;
  }

  const { project, teams: rawTeams } = projectQuery.data;
  // Adapt the unified Team shape (members may include extra fields and
  // be optional) to the trimmed ProjectTeam shape this page renders.
  const teams: ProjectTeam[] = rawTeams.map((t) => ({
    id: t.id,
    name: t.name,
    members: (t.members ?? []).map((m) => ({
      id: m.id,
      userId: m.userId,
      fullName: `${m.user.firstName} ${m.user.lastName}`.trim(),
      role: m.roleInTeam ?? null,
    })),
  }));
  const isPending = project.status === PROJECT_STATUS_PENDING;
  const isActive = ACTIVE_STATUSES.has(project.status);

  const handleApprove = (): void => {
    setActionError(null);
    updateStatus.mutate(
      { id, title: project.title, status: 'Утверждён' },
      { onError: (e) => setActionError(formatError(e, 'Не удалось утвердить проект')) },
    );
  };

  const handleReturn = (): void => {
    setActionError(null);
    updateStatus.mutate(
      { id, title: project.title, status: 'Черновик' },
      {
        onError: (e) => setActionError(formatError(e, 'Не удалось вернуть проект')),
        onSuccess: () => setReturnComment(''),
      },
    );
  };

  const handleExclude = (applicationId: number): void => {
    setActionError(null);
    exclude.mutate(applicationId, {
      onSettled: () => setConfirmingExclude(null),
      onError: (e) => setActionError(formatError(e, 'Не удалось исключить участника')),
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.crumbs}>
        <Link to="/admin/projects" className={styles.crumbLink}>
          Проекты
        </Link>{' '}
        / {project.title}
      </div>

      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>{project.title}</h1>
          <div className={styles.meta}>
            {project.company ? <span>{project.company}</span> : null}
            {project.course ? <span>Курс: {project.course}</span> : null}
            <span>Мест: {project.maxSlots}</span>
            <span>ID: {project.id}</span>
          </div>
          <span className={`${styles.statusBadge} ${statusToneClass(project.status)}`}>
            {project.status}
          </span>
        </div>

        <div className={styles.actions}>
          {isPending ? (
            <>
              <div className={styles.btnRow}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={handleApprove}
                  disabled={updateStatus.isPending}
                >
                  {updateStatus.isPending ? 'Сохраняем…' : 'Утвердить проект'}
                </button>
              </div>
              <div className={styles.commentBox}>
                <label className={styles.label} htmlFor="return-comment">
                  Комментарий для возврата
                </label>
                <textarea
                  id="return-comment"
                  className={styles.textarea}
                  rows={3}
                  value={returnComment}
                  placeholder="Что нужно поправить менторам…"
                  onChange={(e) => setReturnComment(e.target.value)}
                />
                <div className={styles.btnRow}>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={handleReturn}
                    disabled={updateStatus.isPending}
                  >
                    Вернуть на доработку
                  </button>
                </div>
              </div>
            </>
          ) : isActive ? (
            <span className={styles.teamMeta}>Проект утверждён, действия недоступны.</span>
          ) : null}
        </div>
      </header>

      {actionError ? <div className={styles.error}>{actionError}</div> : null}

      <section className={styles.section} aria-labelledby="teams-title">
        <h2 id="teams-title" className={styles.sectionTitle}>
          Команды ({teams.length})
        </h2>
        {teams.length === 0 ? (
          <div className={styles.empty}>Команды ещё не сформированы.</div>
        ) : (
          teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              isExcluding={exclude.isPending}
              confirmingId={confirmingExclude}
              onAskExclude={(memberId) => setConfirmingExclude(memberId)}
              onCancelExclude={() => setConfirmingExclude(null)}
              onConfirmExclude={(applicationId) => handleExclude(applicationId)}
            />
          ))
        )}
      </section>
    </div>
  );
}

interface TeamCardProps {
  team: ProjectTeam;
  isExcluding: boolean;
  confirmingId: number | null;
  onAskExclude: (memberId: number) => void;
  onCancelExclude: () => void;
  onConfirmExclude: (applicationId: number) => void;
}

function TeamCard({
  team,
  isExcluding,
  confirmingId,
  onAskExclude,
  onCancelExclude,
  onConfirmExclude,
}: TeamCardProps): JSX.Element {
  return (
    <div className={styles.teamCard}>
      <div className={styles.teamHead}>
        <h3 className={styles.teamName}>{team.name}</h3>
        <span className={styles.teamMeta}>{team.members.length} участников</span>
      </div>
      <div className={styles.memberList}>
        {team.members.map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            confirming={confirmingId === m.id}
            isPending={isExcluding && confirmingId === m.id}
            onAsk={() => onAskExclude(m.id)}
            onCancel={onCancelExclude}
            onConfirm={() => onConfirmExclude(m.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface MemberRowProps {
  member: ProjectTeamMember;
  confirming: boolean;
  isPending: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}

function MemberRow({
  member,
  confirming,
  isPending,
  onAsk,
  onCancel,
  onConfirm,
}: MemberRowProps): JSX.Element {
  return (
    <div className={styles.member}>
      <div className={styles.memberInfo}>
        <span className={styles.memberName}>{member.fullName}</span>
        {member.role ? <span className={styles.memberRole}>{member.role}</span> : null}
      </div>
      {confirming ? (
        <div className={styles.btnRow}>
          <button
            type="button"
            className={styles.btnDanger}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? 'Исключаем…' : 'Подтвердить'}
          </button>
          <button type="button" className={styles.btnSecondary} onClick={onCancel}>
            Отмена
          </button>
        </div>
      ) : (
        <button type="button" className={styles.btnDanger} onClick={onAsk}>
          Исключить
        </button>
      )}
    </div>
  );
}

function statusToneClass(status: ProjectStatus): string {
  if (ACTIVE_STATUSES.has(status)) return styles.statusActive;
  if (status === PROJECT_STATUS_PENDING) return styles.statusPending;
  if (status === 'Черновик') return styles.statusDraft;
  return '';
}

function formatError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return `${fallback}: ${err.message}`;
  if (err instanceof Error) return `${fallback}: ${err.message}`;
  return fallback;
}
