/*
 * Popup, который показывается координатору после успешного запуска
 * автоматического распределения. Бэкенд (через C++ Гейля-Шепли)
 * возвращает recommendedCount / notRecommendedCount, плюс applied /
 * skipped — сколько заявок реально переведено и сколько защищено
 * от перезаписи (статусы «Принят» / «Принято ментором»).
 */

import { useEffect, type JSX } from 'react';

import type { DistributionRunResult } from '@/api/distribution';

import styles from './DistributionResultModal.module.css';

interface Props {
  result: DistributionRunResult;
  onClose: () => void;
}

export function DistributionResultModal({ result, onClose }: Props): JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h2 className={styles.title}>Распределение завершено</h2>
          <p className={styles.subtitle}>
            Алгоритм Гейля-Шепли проставил рекомендации по проектам и командам.
          </p>
        </header>

        <div className={styles.body}>
          <div className={styles.row}>
            <span className={styles.label}>Рекомендовано</span>
            <span className={`${styles.value} ${styles.valueAccent}`}>{result.recommendedCount}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Не рекомендовано</span>
            <span className={`${styles.value} ${styles.valueMuted}`}>{result.notRecommendedCount}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Применено к БД</span>
            <span className={styles.value}>{result.applied}</span>
          </div>
          {result.skipped > 0 ? (
            <div className={styles.row}>
              <span className={styles.label}>Пропущено (ручные решения)</span>
              <span className={`${styles.value} ${styles.valueMuted}`}>{result.skipped}</span>
            </div>
          ) : null}
        </div>

        {result.skipped > 0 ? (
          <p className={styles.note}>
            Заявки в статусах «Принят» и «Принято ментором» алгоритм не
            перезаписывает — ручные решения ментора и студентов сохранены.
          </p>
        ) : null}

        <footer className={styles.footer}>
          <button type="button" className={styles.btn} onClick={onClose}>
            Закрыть
          </button>
        </footer>
      </div>
    </div>
  );
}
