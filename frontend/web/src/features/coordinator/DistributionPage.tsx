import { useMemo } from 'react';

import { ApiError } from '@/api/client';
import type { DistributionStage } from '@/api/distribution';
import { DistributionPanel } from './components/DistributionPanel';
import {
  useDistributionStatusQuery,
  useGenerateDistribution,
} from './hooks/useDistribution';
import styles from './DistributionPage.module.css';

const UNAVAILABLE_STATUSES = new Set([404, 501, 503]);

export function DistributionPage(): JSX.Element {
  const statusQuery = useDistributionStatusQuery();
  const runMutation = useGenerateDistribution();

  const stage: DistributionStage = useMemo(() => {
    if (runMutation.isPending) return 'running';
    return statusQuery.data?.stage ?? 'idle';
  }, [runMutation.isPending, statusQuery.data?.stage]);

  const errorMessage = computeErrorMessage(statusQuery.error, runMutation.error, stage);
  const lastResultMessage = runMutation.data?.message;

  return (
    <div className={styles.page}>
      <DistributionPanel
        state={stage}
        status={statusQuery.data}
        lastResultMessage={lastResultMessage}
        errorMessage={errorMessage}
        isRunning={runMutation.isPending}
        onRun={() => runMutation.mutate()}
      />

      <aside className={styles.notes}>
        <h2 className={styles.notesTitle}>Как это работает</h2>
        <ul className={styles.notesList}>
          <li>
            Распределение запускается отдельным сервисом, недоступным напрямую с фронта.
          </li>
          <li>
            После запуска статус опрашивается каждые 5 секунд до завершения работы сервиса.
          </li>
          <li>
            Если сервис временно недоступен — кнопка «Запустить» останется неактивной до
            восстановления.
          </li>
        </ul>
      </aside>
    </div>
  );
}

function computeErrorMessage(
  statusError: unknown,
  runError: unknown,
  stage: DistributionStage,
): string | undefined {
  if (stage === 'unavailable') {
    return 'Сервис распределения временно недоступен. Попробуйте позже.';
  }

  if (runError instanceof ApiError && UNAVAILABLE_STATUSES.has(runError.status)) {
    return 'Сервис распределения временно недоступен. Попробуйте позже.';
  }
  if (runError instanceof ApiError) {
    return `Ошибка запуска: ${runError.message}`;
  }
  if (runError instanceof Error) {
    return `Ошибка запуска: ${runError.message}`;
  }

  if (statusError instanceof ApiError && UNAVAILABLE_STATUSES.has(statusError.status)) {
    return 'Сервис распределения временно недоступен. Попробуйте позже.';
  }
  if (statusError instanceof Error) {
    return `Не удалось получить статус: ${statusError.message}`;
  }

  return undefined;
}
