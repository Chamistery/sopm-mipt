import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

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
import { clearApplicantFromTeam } from './lib/slotLayout';
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
  // Подсветка целевой priority-группы в пуле во время drag из команды.
  // null когда никто не драгается ИЛИ драгается чип из самого пула.
  const [poolDragTarget, setPoolDragTarget] = useState<{
    priority: number;
    qualified: boolean;
  } | null>(null);
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

  // Выбор проекта через ?projectId= в URL (bookmark-friendly).
  // Default — первый проект из списка незапущенных.
  const [searchParams, setSearchParams] = useSearchParams();
  const projectParam = Number.parseInt(searchParams.get('projectId') ?? '', 10);
  const defaultProjectId = projects[0]?.id ?? null;
  const selectedProjectId =
    Number.isFinite(projectParam) && projects.some((p) => p.id === projectParam)
      ? projectParam
      : defaultProjectId;
  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const setProjectId = (id: number): void => {
    const sp = new URLSearchParams(searchParams);
    sp.set('projectId', String(id));
    setSearchParams(sp, { replace: true });
  };

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
        {selectedProject ? (
          <div className={styles.subtitle}>
            Проект: {selectedProject.title}
            {selectedProject.deadline ? (
              <>
                <span className={styles.subtitleDot} />
                Дедлайн: {formatDeadline(selectedProject.deadline)}
              </>
            ) : null}
          </div>
        ) : null}
        {projects.length > 0 ? (
          <ProjectSwitcher
            projects={projects}
            selectedId={selectedProjectId}
            onChange={setProjectId}
          />
        ) : null}
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
      ) : selectedProject ? (
        <div className={styles.layout}>
          <div className={styles.left}>
            <ProjectGroup
              project={selectedProject}
              pendingApplicationId={pendingApplicationId}
              onDropApplicant={onDropApplicantInSlot}
              onRemoveMember={onRemoveMember}
              onInviteMember={onInviteMember}
              onLaunch={onLaunch}
              onChipDragStart={(priority, qualified) =>
                setPoolDragTarget({ priority, qualified })
              }
              onChipDragEnd={() => setPoolDragTarget(null)}
            />
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
            <div
              className={styles.poolBody}
              onDragOver={(e) => {
                if (poolDragTarget) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const payload = readApplicantDragData(e.dataTransfer);
                setPoolDragTarget(null);
                if (!payload || payload.sourceTeamId == null) return;
                clearApplicantFromTeam(payload.sourceTeamId, payload.applicationId);
                onRemoveMember(payload.applicationId);
              }}
            >
              <ProjectPool
                project={selectedProject}
                onReturnToPool={(applicationId) => onRemoveMember(applicationId)}
                pendingApplicationId={pendingApplicationId}
                dragTarget={poolDragTarget}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


interface ProjectSwitcherProps {
  projects: MentorDistributionProject[];
  selectedId: number | null;
  onChange: (id: number) => void;
}

function ProjectSwitcher({ projects, selectedId, onChange }: ProjectSwitcherProps): JSX.Element {
  const handle = (e: ChangeEvent<HTMLSelectElement>): void => {
    const id = Number.parseInt(e.target.value, 10);
    if (Number.isFinite(id)) onChange(id);
  };
  return (
    <label className={styles.switcher}>
      <span className={styles.switcherLabel}>Проект:</span>
      <select className={styles.switcherSelect} value={selectedId ?? ''} onChange={handle}>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title} ({p.teams.length}{' '}
            {pluralizeTeam(p.teams.length)})
          </option>
        ))}
      </select>
    </label>
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
  onChipDragStart: (priority: number, qualified: boolean) => void;
  onChipDragEnd: () => void;
}

function ProjectGroup({
  project,
  pendingApplicationId,
  onDropApplicant,
  onRemoveMember,
  onInviteMember,
  onLaunch,
  onChipDragStart,
  onChipDragEnd,
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
          onChipDragStart={onChipDragStart}
          onChipDragEnd={onChipDragEnd}
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
  /** Если задан — выделяем priority-группу (matched по priority+qualified)
   *  как «куда чип вернётся» при drop. Прототип mentor.html:2754-2768 +
   *  highlightTargetPoolGroup. */
  dragTarget: { priority: number; qualified: boolean } | null;
}

function ProjectPool({
  project,
  onReturnToPool,
  pendingApplicationId,
  dragTarget,
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
        dragTarget={dragTarget}
      />
      <PoolSection
        title="Не подходят по требованиям"
        kind="unqualified"
        projectId={project.id}
        buckets={project.pool.unqualified}
        onReturnToPool={onReturnToPool}
        pendingApplicationId={pendingApplicationId}
        dragTarget={dragTarget}
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
  dragTarget: { priority: number; qualified: boolean } | null;
  explanation?: string;
}

function PoolSection({
  title,
  kind,
  projectId,
  buckets,
  onReturnToPool,
  pendingApplicationId,
  dragTarget,
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
          isDragTarget={
            dragTarget != null &&
            dragTarget.priority === priority &&
            dragTarget.qualified === (kind === 'qualified')
          }
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
  /** Drag из команды, у студента такой же priority+qualified — подсвечиваем
   *  эту группу (там окажется чип после drop). */
  isDragTarget: boolean;
}

function PriorityGroup({
  priority,
  items,
  projectId,
  qualified,
  onReturnToPool,
  pendingApplicationId,
  isDragTarget,
}: PriorityGroupProps): JSX.Element {
  // По прототипу (mentor.html:2754-2758, 2963-2986): drop в **любую**
  // группу пула возвращает чип в его собственный priority/qualified.
  // Поэтому никакой priority-проверки на drop не делаем — payload даст
  // applicationId, бэк положит чип куда нужно. Подсветка целевой
  // группы — через isDragTarget (управляется state'ом Page).
  const onDragOver = (e: DragEvent<HTMLDivElement>): void => {
    if (!hasApplicantDragData(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    const payload = readApplicantDragData(e.dataTransfer);
    if (!payload) return;
    if (payload.projectId !== projectId) return;
    if (payload.sourceTeamId == null) return; // уже в пуле — нечего делать
    clearApplicantFromTeam(payload.sourceTeamId, payload.applicationId);
    onReturnToPool(payload.applicationId);
  };

  const cls = items.length === 0 ? styles.priorityGroupEmpty : '';
  const listCls = isDragTarget ? styles.priorityDropOk : '';

  return (
    <div className={`${styles.priorityGroup} ${cls}`}>
      <div className={styles.priorityGroupHead}>
        <span>Приоритет {priority}</span>
        <span className={styles.priorityGroupCount}>{items.length}</span>
      </div>
      <div
        className={`${styles.priorityGroupList} ${listCls}`}
        onDragOver={onDragOver}
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
