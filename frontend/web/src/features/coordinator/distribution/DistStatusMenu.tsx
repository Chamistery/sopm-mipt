/*
 * DistStatusMenu — popover при клике на gchip-status-badge. 3 кнопки
 * (Принят / Заявка отправлена / Заявка не отправлена) — pixel-port из
 * admin.html GDIST_STATUSES (lines 2654-2664).
 *
 * Внутрь передаётся applicationId, текущий статус и onSelect callback.
 * Popover закрывается на click outside и Esc.
 */

import { useEffect, useRef, type JSX } from 'react';

import { GDIST_STATUSES, type GdistStatusKey } from './statusInfo';
import styles from './DistStatusMenu.module.css';

interface Props {
  currentKey: GdistStatusKey;
  onSelect: (key: GdistStatusKey) => void;
  onClose: () => void;
}

export function DistStatusMenu({ currentKey, onSelect, onClose }: Props): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div ref={ref} className={styles.menu} role="menu">
      <div className={styles.title}>Статус заявки</div>
      {GDIST_STATUSES.map((s) => (
        <button
          key={s.key}
          type="button"
          role="menuitem"
          className={`${styles.item} ${s.key === currentKey ? styles.itemActive : ''}`}
          onClick={() => onSelect(s.key)}
        >
          <span className={`${styles.dot} ${styles[`dot_${s.className}`]}`} />
          <span className={styles.label}>{s.label}</span>
          {s.key === currentKey ? <CheckIcon /> : null}
        </button>
      ))}
    </div>
  );
}

function CheckIcon(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
