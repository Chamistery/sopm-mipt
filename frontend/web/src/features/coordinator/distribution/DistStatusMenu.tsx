/*
 * DistStatusMenu — popover при клике на gchip-status-badge. 3 кнопки
 * (Принят / Заявка отправлена / Заявка не отправлена) — pixel-port из
 * admin.html .gstatus-popup (lines 571-592 + JS 2929-2960).
 *
 * Структура (как в прототипе):
 *   <div .gstatus-popup>
 *     <div .gstatus-popup-hint>Ручной выбор статуса</div>
 *     <div .gstatus-popup-item [.current]>
 *       <span .gstatus-popup-dot/>
 *       <span>{label}</span>
 *     </div>
 *     ...
 *   </div>
 *
 * Текущий статус — фон var(--surface-alt) + font-weight:700, БЕЗ галочки.
 * Закрывается по click outside и Esc.
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
    <div ref={ref} className={styles.popup} role="menu">
      <div className={styles.hint}>Ручной выбор статуса</div>
      {GDIST_STATUSES.map((s) => (
        <button
          key={s.key}
          type="button"
          role="menuitem"
          className={`${styles.item} ${s.key === currentKey ? styles.itemCurrent : ''}`}
          onClick={() => onSelect(s.key)}
          title={s.description}
        >
          <span className={`${styles.dot} ${styles[`dot_${s.className}`]}`} />
          <span>{s.label}</span>
        </button>
      ))}
    </div>
  );
}
