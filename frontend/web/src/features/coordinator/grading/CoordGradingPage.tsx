/*
 * Page координатора «Итоговое оценивание». Pixel-port из admin.html
 * (view-grading, lines 1831-2014).
 *
 * Структура:
 *   page-header  — «Итоговое оценивание»
 *   formula-box  — «Итоговая = Ментор (×0.4) + Трекер (×0.3) + ...»
 *   tabs         — Текущие оценки | Защиты
 *   tab1: data-table со строками-студентами (агрегат /coordinator/grading)
 *   tab2: defense-cards (CRUD) — список + кнопка «Назначить защиту»
 */

import { useState, type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { getCoordinatorGrading } from '@/api/coordinatorGrading';
import { listDefenses } from '@/api/defenses';
import { GradesTable } from './GradesTable';
import { DefensesTab } from './DefensesTab';
import styles from './CoordGradingPage.module.css';

type Tab = 'grades' | 'defenses';

export function CoordGradingPage(): JSX.Element {
  const [tab, setTab] = useState<Tab>('grades');

  const gradesQuery = useQuery({
    queryKey: ['coordinator', 'grading'],
    queryFn: getCoordinatorGrading,
    enabled: tab === 'grades',
  });

  const defensesQuery = useQuery({
    queryKey: ['defenses'],
    queryFn: listDefenses,
    enabled: tab === 'defenses',
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Итоговое оценивание</h1>
      </header>

      <div className={styles.formula}>
        Итоговая = Ментор (×0.4) + Трекер (×0.3) + Защита (×0.2) + Peer Review (×0.1)
      </div>

      <nav className={styles.tabs} role="tablist">
        <button
          type="button"
          className={`${styles.tab} ${tab === 'grades' ? styles.tabActive : ''}`}
          onClick={() => setTab('grades')}
          role="tab"
        >
          Текущие оценки
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'defenses' ? styles.tabActive : ''}`}
          onClick={() => setTab('defenses')}
          role="tab"
        >
          Защиты
        </button>
      </nav>

      {tab === 'grades' ? (
        <div className={styles.tabContent}>
          {gradesQuery.isLoading ? (
            <div className={styles.placeholder}>Загружаем оценки…</div>
          ) : null}
          {gradesQuery.error ? (
            <div className={styles.error}>
              {formatError(gradesQuery.error, 'Не удалось загрузить оценки')}
            </div>
          ) : null}
          {gradesQuery.data ? <GradesTable rows={gradesQuery.data.rows} /> : null}
        </div>
      ) : null}

      {tab === 'defenses' ? (
        <div className={styles.tabContent}>
          {defensesQuery.isLoading ? (
            <div className={styles.placeholder}>Загружаем защиты…</div>
          ) : null}
          {defensesQuery.error ? (
            <div className={styles.error}>
              {formatError(defensesQuery.error, 'Не удалось загрузить защиты')}
            </div>
          ) : null}
          {defensesQuery.data ? (
            <DefensesTab defenses={defensesQuery.data.defenses} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function formatError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return `${fallback}: ${err.message}`;
  if (err instanceof Error) return `${fallback}: ${err.message}`;
  return fallback;
}
