import { ApiError } from '@/api/client';
import { getFieldValue } from '@/api/projects';

import { useProjectDetails } from '../hooks/useCatalog';
import type { CatalogProject } from '../types';
import styles from './ProjectDetailsModal.module.css';

interface Props {
  /** Catalog row already in memory — gives us mentorName, company etc. while details load. */
  baseInfo: CatalogProject;
  onClose: () => void;
}

export function ProjectDetailsModal({ baseInfo, onClose }: Props): JSX.Element {
  const { data, isLoading, error } = useProjectDetails(baseInfo.id);

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={baseInfo.title}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
          ✕
        </button>
        <div className={styles.company}>{baseInfo.company ?? '—'}</div>
        <h2 className={styles.title}>{baseInfo.title}</h2>

        {isLoading ? <div className={styles.placeholder}>Загружаем детали…</div> : null}
        {error ? (
          <div className={styles.error}>
            {error instanceof ApiError ? error.message : 'Не удалось загрузить детали проекта.'}
          </div>
        ) : null}

        {data ? (
          <>
            {renderSection('Описание проекта', getFieldValue(data, 'description'))}
            {renderSection('Технологии', getFieldValue(data, 'technologies'))}
            {renderSection('Размер команды', getFieldValue(data, 'team_size'))}
            {renderSection('Требования к участникам', getFieldValue(data, 'requirements'))}
            {renderSection('Образовательные цели', getFieldValue(data, 'goals'))}
            {renderSection('Платформа', getFieldValue(data, 'platform'))}
          </>
        ) : null}

        <div className={styles.footer}>
          <span className={styles.meta}>
            <b>{baseInfo.maxSlots}</b> мест ·{' '}
            {baseInfo.filledSlots != null ? <><b>{baseInfo.filledSlots}</b> занято · </> : null}
            <b>{baseInfo.mentorName}</b>
          </span>
        </div>
      </div>
    </div>
  );
}

function renderSection(title: string, value: string): JSX.Element | null {
  if (!value) return null;
  return (
    <section className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      <div className={styles.sectionBody}>{value}</div>
    </section>
  );
}
