import styles from './SectionNav.module.css';

export interface SectionNavItem {
  label: string;
}

interface Props {
  items: SectionNavItem[];
  active: number;
  onSelect: (index: number) => void;
}

/** Sticky-навигация по 4 секциям заявки слева от form-card. */
export function SectionNav({ items, active, onSelect }: Props): JSX.Element {
  return (
    <nav className={styles.outer} aria-label="Разделы заявки">
      <div className={styles.inner}>
        <div className={styles.title}>Разделы заявки</div>
        {items.map((item, idx) => {
          const isActive = idx === active;
          return (
            <button
              key={item.label}
              type="button"
              className={`${styles.item} ${isActive ? styles.active : ''}`}
              onClick={() => onSelect(idx)}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className={styles.dot} aria-hidden />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
