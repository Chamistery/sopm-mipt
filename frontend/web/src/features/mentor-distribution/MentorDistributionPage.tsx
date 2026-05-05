import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';

import { ApiError } from '@/api/client';
import {
  flattenPriorityBuckets,
  type ApplicantPriorityBuckets,
} from '@/api/applications';
import type { MentorDistributionProject } from '@/api/mentorDistribution';
import { useToast } from '@/_shared/Toast';
import { useMentorDistribution } from './hooks/useMentorDistribution';
import { useDistributionMutations } from './hooks/useDistributionMutations';
import { DistTeamCard } from './components/DistTeamCard';
import { DistPoolChip } from './components/DistPoolChip';
import { DistResizeDivider } from './components/DistResizeDivider';
import { POOL_WIDTH_DEFAULT, loadPoolWidth, savePoolWidth } from './lib/poolWidth';
import {
  hasApplicantDragData,
  readApplicantDragData,
  type ApplicantDragPayload,
} from './lib/dragData';
import styles from './MentorDistributionPage.module.css';

/**
 * Агрегированная страница «Незапущенные команды».
 *
 * D&D state живёт целиком на DOM-уровне (HTML5 Drag and Drop API): каждый
 * чип сам кладёт payload в DataTransfer на dragstart, drop-target читает
 * его в drop. Никакого глобального redux/zustand-стора — все мутации
 * идут через TanStack Query, которая инвалидирует единственный ключ
 * MENTOR_DISTRIBUTION_KEY и пересобирает всю страницу.
 */
export function MentorDistributionPage(): JSX.Element {
  const dataQuery = useMentorDistribution();
  const { recommend, unrecommend, invite, launch } = useDistributionMutations();

  const [poolWidth, setPoolWidth] = useState(POOL_WIDTH_DEFAULT);
  const [pendingApplicationId, setPendingApplicationId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { showSuccess } = useToast();

  useEffect(() => {
    setPoolWidth(loadPoolWidth());
  }, []);

  const handleResize = (next: number): void => {
    setPoolWidth(next);
    savePoolWidth(next);
  };

  const handleError = (err: unknown): void => {
    setActionError(
      err instanceof ApiError
        ? `Ошибка ${err.status}: ${err.message}`
        : err instanceof Error
          ? err.message
          : 'Не удалось выполнить действие',
    );
  };

  const onDropApplicantInSlot = (payload: ApplicantDragPayload, slotTeamId: number): void => {
    if (payload.sourceTeamId === slotTeamId) return; // drop в ту же команду — no-op
    setActionError(null);
    setPendingApplicationId(payload.applicationId);
    recommend.mutate(
      { applicationId: payload.applicationId, teamId: slotTeamId },
      {
        onError: handleError,
        onSettled: () => setPendingApplicationId(null),
      },
    );
  };

  const onRemoveMember = (applicationId: number): void => {
    setActionError(null);
    setPendingApplicationId(applicationId);
    unrecommend.mutate(applicationId, {
      onError: handleError,
      onSettled: () => setPendingApplicationId(null),
    });
  };

  const onInviteMember = (applicationId: number): void => {
    setActionError(null);
    setPendingApplicationId(applicationId);
    invite.mutate(applicationId, {
      onError: handleError,
      onSettled: () => setPendingApplicationId(null),
    });
  };

  const onLaunch = (teamId: number): void => {
    setActionError(null);
    launch.mutate(teamId, {
      onSuccess: () => {
        showSuccess('Команда запущена');
      },
      onError: handleError,
    });
  };

  const projects = useMemo(() => dataQuery.data?.projects ?? [], [dataQuery.data]);

  // Метаданные подзаголовка — берём из первого проекта (или несколько,
  // если их больше; для верхнего хедера используем агрегированную информацию).
  const headerSubtitle = useMemo(() => buildHeaderSubtitle(projects), [projects]);

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link to="/mentor">Дашборд</Link>
        <svg width="16" height="16" fill="none" viewBox="0 0 16 16" aria-hidden>
          <path
            d="M6 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className={styles.breadcrumbCurrent}>Распределение</span>
      </div>

      <header className={styles.header}>
        <h1 className={styles.title}>Незапущенные команды</h1>
        {headerSubtitle ? <div className={styles.subtitle}>{headerSubtitle}</div> : null}
      </header>

      {actionError ? <div className={styles.error}>{actionError}</div> : null}

      {dataQuery.isLoading ? (
        <div className={styles.placeholder}>Загружаем заявки…</div>
      ) : dataQuery.error ? (
        <div className={styles.error}>
          {dataQuery.error instanceof ApiError
            ? `Ошибка ${dataQuery.error.status}: ${dataQuery.error.message}`
            : 'Не удалось загрузить распределение'}
        </div>
      ) : projects.length === 0 ? (
        <div className={styles.empty}>
          У вас нет незапущенных команд. Все команды по вашим проектам уже запущены или ещё не сформированы.
        </div>
      ) : (
        <div className={styles.layout}>
          <div className={styles.left}>
            {projects.map((project) => (
              <ProjectGroup
                key={project.id}
                project={project}
                pendingApplicationId={pendingApplicationId}
                onDropApplicant={onDropApplicantInSlot}
                onRemoveMember={onRemoveMember}
                onInviteMember={onInviteMember}
                onLaunch={onLaunch}
              />
            ))}
            <div className={styles.note}>
              После запуска изменения в составе команды возможны только через координатора.
            </div>
          </div>

          <DistResizeDivider rightWidth={poolWidth} onResize={handleResize} />

          <div className={styles.right} style={{ width: poolWidth }}>
            <div className={styles.poolHead}>
              <h2 className={styles.poolHeadTitle}>Пул заявок</h2>
              <div className={styles.poolHeadHint}>
                Бросьте карточку сюда, чтобы вернуть студента в свой приоритет.
                Перенос между приоритетами невозможен.
              </div>
            </div>
            <div className={styles.poolBody}>
              {projects.map((project) => (
                <ProjectPool
                  key={project.id}
                  project={project}
                  onReturnToPool={(applicationId) => onRemoveMember(applicationId)}
                  pendingApplicationId={pendingApplicationId}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ProjectGroup ────────────────────────────────────────────────────────

interface ProjectGroupProps {
  project: MentorDistributionProject;
  pendingApplicationId: number | null;
  onDropApplicant: (payload: ApplicantDragPayload, slotTeamId: number) => void;
  onRemoveMember: (applicationId: number) => void;
  onInviteMember: (applicationId: number) => void;
  onLaunch: (teamId: number) => void;
}

function ProjectGroup({
  project,
  pendingApplicationId,
  onDropApplicant,
  onRemoveMember,
  onInviteMember,
  onLaunch,
}: ProjectGroupProps): JSX.Element {
  const meta = [
    project.company,
    `${project.numTeams} ${pluralizeTeam(project.numTeams)}`,
    `${project.teamSizeMin}–${project.teamSizeMax} чел.`,
    project.sprintsCount > 0
      ? `${project.sprintsCount} ${pluralizeSprint(project.sprintsCount)} × ${project.sprintWeeks} нед.`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className={styles.projectGroup} data-project-id={project.id}>
      <h2 className={styles.projectName}>{project.title}</h2>
      <div className={styles.projectMeta}>{meta}</div>
      {project.teams.map((team) => (
        <DistTeamCard
          key={team.id}
          projectId={project.id}
          team={team}
          maxSize={project.teamSizeMax}
          onDropApplicant={onDropApplicant}
          onRemoveMember={onRemoveMember}
          onInviteMember={onInviteMember}
          onLaunch={onLaunch}
          disabled={team.members.some((m) => m.applicationId === pendingApplicationId)}
        />
      ))}
    </section>
  );
}

// ─── ProjectPool — qualified + unqualified секции для одного проекта ────

interface ProjectPoolProps {
  project: MentorDistributionProject;
  pendingApplicationId: number | null;
  onReturnToPool: (applicationId: number) => void;
}

function ProjectPool({
  project,
  onReturnToPool,
  pendingApplicationId,
}: ProjectPoolProps): JSX.Element {
  return (
    <>
      <PoolSection
        title="Подходят по требованиям"
        kind="qualified"
        projectId={project.id}
        buckets={project.pool.qualified}
        onReturnToPool={onReturnToPool}
        pendingApplicationId={pendingApplicationId}
      />
      <PoolSection
        title="Не подходят по требованиям"
        kind="unqualified"
        projectId={project.id}
        buckets={project.pool.unqualified}
        onReturnToPool={onReturnToPool}
        pendingApplicationId={pendingApplicationId}
        explanation="Студенты, не соответствующие требованиям по курсу или среднему баллу. Ментор может взять их в команду вручную."
      />
    </>
  );
}

interface PoolSectionProps {
  title: string;
  kind: 'qualified' | 'unqualified';
  projectId: number;
  buckets: ApplicantPriorityBuckets;
  onReturnToPool: (applicationId: number) => void;
  pendingApplicationId: number | null;
  explanation?: string;
}

function PoolSection({
  title,
  kind,
  projectId,
  buckets,
  onReturnToPool,
  pendingApplicationId,
  explanation,
}: PoolSectionProps): JSX.Element {
  const flat = flattenPriorityBuckets(buckets);
  const total = flat.reduce((sum, p) => sum + p.items.length, 0);
  const countCls = kind === 'qualified' ? styles.sectionCountQual : styles.sectionCountUnqual;

  return (
    <div className={styles.poolSection}>
      <div className={styles.sectionHead}>
        <span>{title}</span>
        <span className={`${styles.sectionCount} ${countCls}`}>{total}</span>
      </div>
      {explanation ? <div className={styles.poolEmptyNote}>{explanation}</div> : null}
      {flat.map(({ priority, items }) => (
        <PriorityGroup
          key={`${kind}-${priority}`}
          priority={priority}
          items={items}
          projectId={projectId}
          qualified={kind === 'qualified'}
          onReturnToPool={onReturnToPool}
          pendingApplicationId={pendingApplicationId}
        />
      ))}
    </div>
  );
}

interface PriorityGroupProps {
  priority: number;
  items: ApplicantPriorityBuckets['priority1'];
  projectId: number;
  qualified: boolean;
  onReturnToPool: (applicationId: number) => void;
  pendingApplicationId: number | null;
}

function PriorityGroup({
  priority,
  items,
  projectId,
  qualified,
  onReturnToPool,
  pendingApplicationId,
}: PriorityGroupProps): JSX.Element {
  const [dropState, setDropState] = useState<'none' | 'ok' | 'denied'>('none');

  const onDragOver = (e: DragEvent<HTMLDivElement>): void => {
    if (!hasApplicantDragData(e.dataTransfer)) return;
    const payload = peekPayloadFromTypes(e);
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!payload) {
      setDropState('ok');
      return;
    }
    if (
      payload.projectId === projectId &&
      payload.priority === priority &&
      payload.qualified === qualified
    ) {
      setDropState('ok');
    } else {
      setDropState('denied');
    }
  };

  const onDragLeave = (): void => setDropState('none');

  const onDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDropState('none');
    const payload = readApplicantDragData(e.dataTransfer);
    if (!payload) return;
    if (payload.projectId !== projectId) return;
    if (payload.priority !== priority || payload.qualified !== qualified) return;
    if (payload.sourceTeamId == null) return; // уже в пуле — нечего делать
    onReturnToPool(payload.applicationId);
  };

  const cls = items.length === 0 ? styles.priorityGroupEmpty : '';
  const listCls =
    dropState === 'ok'
      ? styles.priorityDropOk
      : dropState === 'denied'
        ? styles.priorityDropDenied
        : '';

  return (
    <div className={`${styles.priorityGroup} ${cls}`}>
      <div className={styles.priorityGroupHead}>
        <span>Приоритет {priority}</span>
        <span className={styles.priorityGroupCount}>{items.length}</span>
      </div>
      <div
        className={`${styles.priorityGroupList} ${listCls}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        data-priority={priority}
        data-qualified={qualified}
      >
        {items.map((item) => (
          <DistPoolChip
            key={item.applicationId}
            item={item}
            projectId={projectId}
            priority={priority}
            qualified={qualified}
            disabled={pendingApplicationId === item.applicationId}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Во время dragover мы не имеем доступа к данным DataTransfer (защита от
 * утечки). Но можем посмотреть на `dataTransfer.types` — там видны custom
 * MIME-типы. Если payload-MIME отсутствует — drag не наш, разрешаем drop
 * по умолчанию (сценарий приоритетной фильтрации не сработает, но это всё
 * равно лишь визуальная подсказка). На drop читаем настоящий payload.
 */
function peekPayloadFromTypes(_e: DragEvent<HTMLDivElement>): ApplicantDragPayload | null {
  return null;
}

function buildHeaderSubtitle(projects: MentorDistributionProject[]): string {
  if (projects.length === 0) return '';
  if (projects.length === 1) {
    const p = projects[0]!;
    const parts = [`Проект: ${p.title}`];
    if (p.deadline) parts.push(`Дедлайн: ${formatDeadline(p.deadline)}`);
    return parts.join(' · ');
  }
  const totalTeams = projects.reduce((sum, p) => sum + p.teams.length, 0);
  return `Проектов: ${projects.length} · Команд к запуску: ${totalTeams}`;
}

const RU_MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

function formatDeadline(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${RU_MONTHS[m - 1] ?? ''} ${y}`.trim();
}

function pluralizeTeam(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'команда';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'команды';
  return 'команд';
}

function pluralizeSprint(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'спринт';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'спринта';
  return 'спринтов';
}
