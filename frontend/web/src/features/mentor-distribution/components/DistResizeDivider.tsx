import { useEffect, useRef, useState, type MouseEvent } from 'react';

import styles from './DistResizeDivider.module.css';

export interface DistResizeDividerProps {
  /** Текущая ширина правой панели в пикселях. */
  rightWidth: number;
  /** Хук обновления ширины. Page сам clamp-ит и сохраняет в localStorage. */
  onResize: (next: number) => void;
  /** Минимальная ширина (default 280). */
  minWidth?: number;
  /** Максимальная ширина (default 600). */
  maxWidth?: number;
}

/**
 * Resizable splitter между списком команд и пулом заявок.
 * Используем mousedown → document.onmousemove → mouseup, чтобы drag не
 * прерывался при выходе курсора за пределы 6px-полоски. На время drag
 * блокируем text-selection через body.style.userSelect.
 */
export function DistResizeDivider({
  rightWidth,
  onResize,
  minWidth = 280,
  maxWidth = 600,
}: DistResizeDividerProps): JSX.Element {
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!dragging) return;
    draggingRef.current = true;

    const onMove = (e: globalThis.MouseEvent): void => {
      if (!draggingRef.current) return;
      const next = window.innerWidth - e.clientX;
      const clamped = Math.max(minWidth, Math.min(maxWidth, next));
      onResize(clamped);
    };
    const onUp = (): void => {
      draggingRef.current = false;
      setDragging(false);
    };

    const prevSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = prevSelect;
      document.body.style.cursor = prevCursor;
    };
  }, [dragging, onResize, minWidth, maxWidth]);

  const onMouseDown = (e: MouseEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragging(true);
  };

  return (
    <div
      className={`${styles.divider} ${dragging ? styles.dragging : ''}`}
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={rightWidth}
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      title="Потяните, чтобы изменить ширину пула"
    />
  );
}

