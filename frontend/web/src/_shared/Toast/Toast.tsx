/*
 * Презентационная карточка одного toast'а. Умеет ровно одно: показать
 * текст с правильным background-цветом по `kind` и сообщить наверх о
 * клике (закрытие). Анимация ухода — через `leaving` prop: ToastProvider
 * сначала помечает toast как leaving (fade 0.2s), затем удаляет из state.
 */

import type { JSX } from 'react';
import styles from './Toast.module.css';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastViewProps {
  message: string;
  kind: ToastKind;
  leaving?: boolean;
  onDismiss: () => void;
}

export function ToastView({
  message,
  kind,
  leaving = false,
  onDismiss,
}: ToastViewProps): JSX.Element {
  const kindCls =
    kind === 'error'
      ? styles.toastError
      : kind === 'info'
        ? styles.toastInfo
        : kind === 'warning'
          ? styles.toastWarning
          : '';

  // role + aria-live: error → assertive (alert), остальное — polite (status).
  // Сделано осознанно: success/info — фоновая обратная связь, не должна
  // прерывать фокус; ошибки — да.
  const role = kind === 'error' ? 'alert' : 'status';
  const ariaLive = kind === 'error' ? 'assertive' : 'polite';

  return (
    <button
      type="button"
      className={`${styles.toast} ${kindCls} ${leaving ? styles.toastLeaving : ''}`}
      role={role}
      aria-live={ariaLive}
      onClick={onDismiss}
    >
      {message}
    </button>
  );
}
