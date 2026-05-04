import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError, submitApplication } from '@/api';
import { useRequireUser } from '@/auth/useCurrentUser';

import { ProjectCard } from './components/ProjectCard';
import { PrioritySlot } from './components/PrioritySlot';
import { ProjectDetailsModal } from './components/ProjectDetailsModal';
import {
  EMPTY_FILTERS,
  addToFirstFreeSlot,
  countSelected,
  filterProjects,
  isProjectSelected,
  isSlotsFull,
  moveSlot,
  removeProject,
  slotsFromApplications,
  uniqueCompanies,
  type CatalogFilters,
} from './hooks/catalogLogic';
import { useCatalog } from './hooks/useCatalog';
import { SLOT_COUNT, SLOT_INDICES, type PrioritySlots } from './types';
import styles from './StudentCatalogPage.module.css';

type Tab = 'projects' | 'choices';

export function StudentCatalogPage(): JSX.Element {
  const me = useRequireUser();
  const queryClient = useQueryClient();
  const catalog = useCatalog();

  const [tab, setTab] = useState<Tab>('projects');
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [slots, setSlots] = useState<PrioritySlots>({});
  const [detailsId, setDetailsId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Restore slots from existing applications (read-only mode after refresh).
  const persistedSlots = useMemo(
    () => slotsFromApplications(catalog.applications),
    [catalog.applications],
  );
  const hasSubmittedApplications = catalog.applications.length > 0;

  useEffect(() => {
    if (hasSubmittedApplications) {
      setSlots(persistedSlots);
    }
  }, [hasSubmittedApplications, persistedSlots]);

  const readOnly = hasSubmittedApplications;
  const selectionCount = countSelected(slots);
  const selectionFull = isSlotsFull(slots);

  const filteredProjects = useMemo(
    () => filterProjects(catalog.projects, filters),
    [catalog.projects, filters],
  );

  const companies = useMemo(() => uniqueCompanies(catalog.projects), [catalog.projects]);

  const detailsProject = useMemo(
    () => (detailsId !== null ? catalog.projects.find((p) => p.id === detailsId) ?? null : null),
    [detailsId, catalog.projects],
  );

  const submitMutation = useMutation({
    mutationFn: async () => {
      const entries = SLOT_INDICES.flatMap((i) => {
        const pid = slots[i];
        return pid !== undefined ? [{ priority: i, projectId: pid }] : [];
      });
      const results = await Promise.allSettled(
        entries.map(({ projectId, priority }) =>
          submitApplication({ projectId, studentId: me.userId, priority }),
        ),
      );
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failed.length > 0) {
        const messages = failed
          .map((r) => (r.reason instanceof ApiError ? r.reason.message : String(r.reason)))
          .join('; ');
        throw new Error(`Не удалось отправить ${failed.length} из ${entries.length}: ${messages}`);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['applications', 'student', me.userId] });
      setSubmitError(null);
    },
    onError: (e: unknown) => {
      setSubmitError(e instanceof Error ? e.message : 'Не удалось отправить заявку.');
    },
  });

  const handleSelect = (id: number): void => {
    if (readOnly) return;
    setSlots((prev) => addToFirstFreeSlot(prev, id));
  };

  const handleRemove = (id: number): void => {
    if (readOnly) return;
    setSlots((prev) => removeProject(prev, id));
  };

  const handleMoveSlot = (from: number, to: number): void => {
    if (readOnly) return;
    setSlots((prev) => moveSlot(prev, from, to));
  };

  if (catalog.isError) {
    return (
      <div className={styles.errorBox}>
        <h2 className={styles.errorTitle}>Не удалось загрузить каталог проектов</h2>
        <p className={styles.errorBody}>
          {catalog.error instanceof ApiError ? catalog.error.message : 'Неизвестная ошибка.'}
        </p>
        <p className={styles.errorHint}>
          Проверьте, поднят ли бэкенд (<code>cd backend/project-service &amp;&amp; make docker-up</code>),
          и обновите страницу.
        </p>
        <button type="button" className={styles.retryBtn} onClick={catalog.refetch}>
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Выбор проекта</h1>
        <p className={styles.context}>
          Доступно проектов: <b>{catalog.projects.length}</b>
          {catalog.studentCourse ? <> · ваш курс: <b>{catalog.studentCourse}</b></> : null}
        </p>
      </header>

      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'projects'}
          className={[styles.tab, tab === 'projects' ? styles.tabActive : ''].join(' ')}
          onClick={() => setTab('projects')}
        >
          Доступные проекты
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'choices'}
          className={[styles.tab, tab === 'choices' ? styles.tabActive : ''].join(' ')}
          onClick={() => setTab('choices')}
        >
          Мои выборы
          <span className={styles.tabBadge}>
            {selectionCount}/{SLOT_COUNT}
          </span>
        </button>
      </div>

      {tab === 'projects' ? (
        <ProjectsTab
          loading={catalog.isLoading}
          filters={filters}
          companies={companies}
          onFiltersChange={setFilters}
          projects={filteredProjects}
          slots={slots}
          selectionFull={selectionFull}
          readOnly={readOnly}
          onSelect={handleSelect}
          onRemove={handleRemove}
          onShowDetails={setDetailsId}
        />
      ) : (
        <ChoicesTab
          slots={slots}
          projects={catalog.projects}
          readOnly={readOnly}
          submitting={submitMutation.isPending}
          submitError={submitError}
          submitted={readOnly}
          canSubmit={selectionFull && !readOnly}
          onRemove={handleRemove}
          onMoveSlot={handleMoveSlot}
          onSubmit={() => submitMutation.mutate()}
        />
      )}

      {detailsProject ? (
        <ProjectDetailsModal baseInfo={detailsProject} onClose={() => setDetailsId(null)} />
      ) : null}
    </div>
  );
}

interface ProjectsTabProps {
  loading: boolean;
  filters: CatalogFilters;
  companies: string[];
  onFiltersChange: (next: CatalogFilters) => void;
  projects: ReturnType<typeof useCatalog>['projects'];
  slots: PrioritySlots;
  selectionFull: boolean;
  readOnly: boolean;
  onSelect: (id: number) => void;
  onRemove: (id: number) => void;
  onShowDetails: (id: number) => void;
}

function ProjectsTab({
  loading,
  filters,
  companies,
  onFiltersChange,
  projects,
  slots,
  selectionFull,
  readOnly,
  onSelect,
  onRemove,
  onShowDetails,
}: ProjectsTabProps): JSX.Element {
  return (
    <>
      <div className={styles.filters}>
        <input
          type="search"
          aria-label="Поиск по проектам"
          className={styles.searchInput}
          placeholder="Поиск по названию, технологии или ментору…"
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
        />
        <select
          aria-label="Фильтр по компании"
          className={styles.companySelect}
          value={filters.company}
          onChange={(e) => onFiltersChange({ ...filters, company: e.target.value })}
        >
          <option value="">Все организации</option>
          {companies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className={styles.qualifiedLabel}>
          <input
            type="checkbox"
            checked={filters.onlyQualified}
            onChange={(e) => onFiltersChange({ ...filters, onlyQualified: e.target.checked })}
          />
          Только подходящие
        </label>
      </div>

      {loading ? (
        <div className={styles.placeholder}>Загружаем проекты…</div>
      ) : projects.length === 0 ? (
        <div className={styles.placeholder}>
          Нет проектов, соответствующих фильтрам. Попробуйте снять «Только подходящие».
        </div>
      ) : (
        <div className={styles.grid}>
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              selected={isProjectSelected(slots, p.id)}
              selectionFull={selectionFull}
              readOnly={readOnly}
              onSelect={onSelect}
              onRemove={onRemove}
              onShowDetails={onShowDetails}
            />
          ))}
        </div>
      )}
    </>
  );
}

interface ChoicesTabProps {
  slots: PrioritySlots;
  projects: ReturnType<typeof useCatalog>['projects'];
  readOnly: boolean;
  submitting: boolean;
  submitError: string | null;
  submitted: boolean;
  canSubmit: boolean;
  onRemove: (id: number) => void;
  onMoveSlot: (from: number, to: number) => void;
  onSubmit: () => void;
}

function ChoicesTab({
  slots,
  projects,
  readOnly,
  submitting,
  submitError,
  submitted,
  canSubmit,
  onRemove,
  onMoveSlot,
  onSubmit,
}: ChoicesTabProps): JSX.Element {
  const projectsById = useMemo(() => {
    const m = new Map<number, ReturnType<typeof useCatalog>['projects'][number]>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);

  return (
    <div className={styles.choices}>
      <p className={styles.choicesHint}>
        {submitted
          ? 'Заявка отправлена. Изменить выбор пока нельзя — дождитесь распределения.'
          : 'Распределите выбранные проекты по 5 приоритетам. 1 — самый желаемый.'}
      </p>
      <div className={styles.slots}>
        {SLOT_INDICES.map((i) => {
          const pid = slots[i];
          const project = pid !== undefined ? projectsById.get(pid) ?? null : null;
          return (
            <PrioritySlot
              key={i}
              index={i}
              project={project}
              readOnly={readOnly}
              canMoveUp={i > 1 && pid !== undefined}
              canMoveDown={i < SLOT_COUNT && pid !== undefined}
              onRemove={onRemove}
              onMoveUp={(idx) => onMoveSlot(idx, idx - 1)}
              onMoveDown={(idx) => onMoveSlot(idx, idx + 1)}
            />
          );
        })}
      </div>

      {submitError ? <div className={styles.submitError}>{submitError}</div> : null}

      <div className={styles.submitRow}>
        {submitted ? (
          <div className={styles.submittedBadge}>
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M3 8l4 4 6-6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Заявка отправлена
          </div>
        ) : (
          <button
            type="button"
            className={styles.submitBtn}
            disabled={!canSubmit || submitting}
            onClick={onSubmit}
          >
            {submitting ? 'Отправляем…' : 'Подать заявку'}
          </button>
        )}
      </div>
    </div>
  );
}
