import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError, submitApplication } from '@/api';
import { useRequireUser } from '@/auth/useCurrentUser';

import { ProjectCard } from './components/ProjectCard';
import { PrioritySlot } from './components/PrioritySlot';
import { ProjectDetailsView } from './components/ProjectDetailsView';
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
import { SLOT_INDICES, type CatalogProject, type PrioritySlots } from './types';
import styles from './StudentCatalogPage.module.css';

type Tab = 'projects' | 'choices';
type DetailsOrigin = 'catalog' | 'choices';

export function StudentCatalogPage(): JSX.Element {
  const me = useRequireUser();
  const queryClient = useQueryClient();
  const catalog = useCatalog();

  const [tab, setTab] = useState<Tab>('projects');
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [slots, setSlots] = useState<PrioritySlots>({});
  const [detailsId, setDetailsId] = useState<number | null>(null);
  const [detailsOrigin, setDetailsOrigin] = useState<DetailsOrigin>('catalog');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [justFilledSlot, setJustFilledSlot] = useState<number | null>(null);
  const [pulseKey, setPulseKey] = useState(0);

  const choicesTabRef = useRef<HTMLButtonElement | null>(null);

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

  useEffect(() => {
    if (justFilledSlot === null) return;
    const t = window.setTimeout(() => setJustFilledSlot(null), 400);
    return () => window.clearTimeout(t);
  }, [justFilledSlot]);

  const readOnly = hasSubmittedApplications;
  const selectionCount = countSelected(slots);
  const selectionFull = isSlotsFull(slots);

  const filteredProjects = useMemo(
    () => filterProjects(catalog.projects, filters),
    [catalog.projects, filters],
  );

  const companies = useMemo(() => uniqueCompanies(catalog.projects), [catalog.projects]);

  const detailsProject = useMemo<CatalogProject | null>(
    () => (detailsId !== null ? catalog.projects.find((p) => p.id === detailsId) ?? null : null),
    [detailsId, catalog.projects],
  );

  const detailsMentor = detailsProject
    ? catalog.mentorById.get(detailsProject.mentorId) ?? null
    : null;

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
    let filledSlot: number | null = null;
    setSlots((prev) => {
      const next = addToFirstFreeSlot(prev, id);
      for (const i of SLOT_INDICES) {
        if (prev[i] === undefined && next[i] !== undefined) {
          filledSlot = i;
          break;
        }
      }
      return next;
    });
    if (filledSlot !== null) {
      setJustFilledSlot(filledSlot);
      setPulseKey((k) => k + 1);
      flyCardToTab(id, choicesTabRef.current);
    }
  };

  const handleRemove = (id: number): void => {
    if (readOnly) return;
    setSlots((prev) => removeProject(prev, id));
  };

  const handleSwap = (from: number, to: number): void => {
    if (readOnly) return;
    setSlots((prev) => moveSlot(prev, from, to));
  };

  const openCatalogDetails = (id: number): void => {
    setDetailsOrigin('catalog');
    setDetailsId(id);
    window.scrollTo({ top: 0 });
  };

  const openChoicesDetails = (id: number): void => {
    setDetailsOrigin('choices');
    setDetailsId(id);
    window.scrollTo({ top: 0 });
  };

  const closeDetails = (): void => {
    setDetailsId(null);
  };

  const handleTabChange = (next: Tab): void => {
    if (next === 'choices' && detailsId !== null && detailsOrigin === 'choices') {
      setDetailsId(null);
    }
    setTab(next);
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

  const showCatalogDetails =
    detailsId !== null && detailsOrigin === 'catalog' && detailsProject !== null;
  const showChoicesDetails =
    detailsId !== null && detailsOrigin === 'choices' && detailsProject !== null;

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
          onClick={() => handleTabChange('projects')}
        >
          Доступные проекты
        </button>
        <button
          type="button"
          role="tab"
          ref={choicesTabRef}
          aria-selected={tab === 'choices'}
          className={[styles.tab, tab === 'choices' ? styles.tabActive : ''].join(' ')}
          onClick={() => handleTabChange('choices')}
        >
          Мои выборы
          <span key={pulseKey} className={styles.tabBadge}>
            {selectionCount}
          </span>
        </button>
      </div>

      {tab === 'projects' ? (
        showCatalogDetails && detailsProject ? (
          <ProjectDetailsView
            baseInfo={detailsProject}
            mentor={detailsMentor}
            origin="catalog"
            selected={isProjectSelected(slots, detailsProject.id)}
            selectionFull={selectionFull}
            readOnly={readOnly}
            onBack={closeDetails}
            onSelect={handleSelect}
            onRemove={handleRemove}
          />
        ) : (
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
            onShowDetails={openCatalogDetails}
          />
        )
      ) : showChoicesDetails && detailsProject ? (
        <ProjectDetailsView
          baseInfo={detailsProject}
          mentor={detailsMentor}
          origin="choices"
          selected={isProjectSelected(slots, detailsProject.id)}
          selectionFull={selectionFull}
          readOnly={readOnly}
          onBack={closeDetails}
          onSelect={handleSelect}
          onRemove={handleRemove}
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
          justFilledSlot={justFilledSlot}
          onRemove={handleRemove}
          onSwap={handleSwap}
          onShowDetails={openChoicesDetails}
          onSubmit={() => submitMutation.mutate()}
        />
      )}
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
          placeholder="Поиск по названию или технологии..."
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
  justFilledSlot: number | null;
  onRemove: (id: number) => void;
  onSwap: (from: number, to: number) => void;
  onShowDetails: (id: number) => void;
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
  justFilledSlot,
  onRemove,
  onSwap,
  onShowDetails,
  onSubmit,
}: ChoicesTabProps): JSX.Element {
  const projectsById = useMemo(() => {
    const m = new Map<number, ReturnType<typeof useCatalog>['projects'][number]>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);

  /*
   * Источник drag трекаем здесь, а не через DataTransfer — повторяем подход
   * прототипа (student.html: модульная переменная `dragFrom`). Так надёжнее
   * на всех браузерах и не зависит от MIME-типа в dataTransfer.
   */
  const dragFromRef = useRef<number | null>(null);

  const handleDragStartSlot = (from: number): void => {
    dragFromRef.current = from;
  };

  const handleDropOnSlot = (to: number): void => {
    const from = dragFromRef.current;
    dragFromRef.current = null;
    if (from === null || from === to) return;
    onSwap(from, to);
  };

  const handleDragEndSlot = (): void => {
    dragFromRef.current = null;
  };

  return (
    <div className={styles.choices}>
      <p className={styles.choicesHint}>
        {submitted
          ? 'Заявка отправлена. Изменить выбор пока нельзя — дождитесь распределения.'
          : 'Перетаскивайте карточки между слотами, чтобы расставить приоритеты. Выберите от 1 до 5 проектов.'}
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
              justFilled={justFilledSlot === i}
              onRemove={onRemove}
              onShowDetails={onShowDetails}
              onDragStartSlot={handleDragStartSlot}
              onDropOnSlot={handleDropOnSlot}
              onDragEndSlot={handleDragEndSlot}
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
            {submitting ? 'Отправляем…' : 'Отправить заявку'}
          </button>
        )}
      </div>
    </div>
  );
}

function flyCardToTab(projectId: number, tabEl: HTMLElement | null): void {
  if (!tabEl || typeof document === 'undefined') return;
  const sourceEl = document.querySelector<HTMLElement>(
    `[data-testid="project-card-${projectId}"]`,
  );
  if (!sourceEl) return;

  const src = sourceEl.getBoundingClientRect();
  const tgt = tabEl.getBoundingClientRect();
  const clone = sourceEl.cloneNode(true) as HTMLElement;
  clone.style.cssText = [
    'position:fixed',
    `left:${src.left}px`,
    `top:${src.top}px`,
    `width:${src.width}px`,
    `height:${src.height}px`,
    'margin:0',
    'z-index:1000',
    'pointer-events:none',
    'border-radius:10px',
    'overflow:hidden',
    'transition:all 0.5s cubic-bezier(0.4,0,0.2,1)',
  ].join(';');
  document.body.appendChild(clone);

  requestAnimationFrame(() => {
    clone.style.left = `${tgt.left + tgt.width / 2 - 60}px`;
    clone.style.top = `${tgt.top}px`;
    clone.style.width = '120px';
    clone.style.height = '40px';
    clone.style.opacity = '0';
    clone.style.transform = 'scale(0.3)';
    clone.style.borderRadius = '20px';
  });

  window.setTimeout(() => clone.remove(), 550);
}
