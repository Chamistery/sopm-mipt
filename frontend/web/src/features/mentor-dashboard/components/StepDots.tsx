import styles from './StepDots.module.css';

interface Props {
  /** Количество шагов всего. */
  total: number;
  /** Индекс активного (0-based). */
  active: number;
  /** Клик по точке — переход на соответствующий шаг. */
  onSelect?: (index: number) => void;
}

/** Точки внизу form-card; активная растягивается до 28px. */
export function StepDots({ total, active, onSelect }: Props): JSX.Element {
  return (
    <div className={styles.row} role="tablist" aria-label="Шаги формы">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          aria-selected={i === active}
          aria-label={`Шаг ${i + 1}`}
          className={`${styles.dot} ${i === active ? styles.active : ''}`}
          onClick={() => onSelect?.(i)}
        />
      ))}
    </div>
  );
}
