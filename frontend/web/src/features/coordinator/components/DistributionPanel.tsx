import type { DistributionStatus } from '@/api/distribution';
import styles from './DistributionPanel.module.css';

export type DistributionState = 'idle' | 'running' | 'done' | 'error' | 'unavailable';

export interface DistributionPanelProps {
  state: DistributionState;
  status?: DistributionStatus;
  lastResultMessage?: string;
  errorMessage?: string;
  isRunning: boolean;
  onRun: () => void;
}

const STATE_LABEL: Record<DistributionState, string> = {
  idle: 'Готов к запуску',
  running: 'Распределение выполняется…',
  done: 'Распределение завершено',
  error: 'Ошибка распределения',
  unavailable: 'Сервис распределения временно недоступен',
};

export function DistributionPanel({
  state,
  status,
  lastResultMessage,
  errorMessage,
  isRunning,
  onRun,
}: DistributionPanelProps): JSX.Element {
  const disabled = isRunning || state === 'running' || state === 'unavailable';
  return (
    <section className={styles.panel} aria-labelledby="distribution-title">
      <header className={styles.head}>
        <div>
          <h2 id="distribution-title" className={styles.title}>
            Распределение студентов
          </h2>
          <p className={styles.subtitle}>{STATE_LABEL[state]}</p>
        </div>
        <button
          type="button"
          className={styles.primary}
          onClick={onRun}
          disabled={disabled}
        >
          {isRunning ? 'Запускаем…' : 'Запустить распределение'}
        </button>
      </header>

      {status?.progress != null && state === 'running' ? (
        <div className={styles.progressTrack} aria-label="Прогресс распределения">
          <div className={styles.progressFill} style={{ width: `${status.progress}%` }} />
        </div>
      ) : null}

      {status?.message ? <p className={styles.statusMessage}>{status.message}</p> : null}

      {lastResultMessage ? (
        <div className={styles.success}>
          <strong>Ответ сервиса:</strong> {lastResultMessage}
        </div>
      ) : null}

      {errorMessage ? <div className={styles.error}>{errorMessage}</div> : null}
    </section>
  );
}
