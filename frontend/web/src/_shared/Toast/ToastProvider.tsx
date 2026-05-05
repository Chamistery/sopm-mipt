/*
 * Глобальный ToastProvider. Заменяет накопившиеся inline-«баннеры»
 * (`useState<string|null>(banner)` + `setTimeout`) на единый
 * централизованный механизм.
 *
 * Дизайн:
 *  - Контекст хранит только imperative API (`showToast` и хелперы).
 *    Подписываться на список тостов из feature-кода не нужно — рендер
 *    происходит внутри провайдера.
 *  - Очередь тостов — `useState<Toast[]>` + ref для id. Reducer не
 *    нужен: операции тривиальные (push / mark-leaving / drop), и нам
 *    важна стабильная identity функций (`useCallback` + ref).
 *  - Портал в `document.body` — чтобы position:fixed не зависел от
 *    transform-стэков родителей и тосты висели над всеми модалками.
 *  - Auto-dismiss — `setTimeout(duration)` → mark leaving → ещё
 *    `setTimeout(EXIT_MS)` → удалить из state. Sticky (`duration: 0`)
 *    скипает первый таймер, ждёт ручной dismiss.
 */

import type { JSX, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { ToastView, type ToastKind } from './Toast';
import { ToastContext, type ShowToastOptions, type ToastApi } from './context';
import styles from './Toast.module.css';

const DEFAULT_DURATION_MS = 3000;
const EXIT_ANIMATION_MS = 200;

interface ToastEntry {
  id: string;
  message: string;
  kind: ToastKind;
  duration: number;
  leaving: boolean;
}

export interface ToastProviderProps {
  children: ReactNode;
  /**
   * DOM-узел для портала. По умолчанию — `document.body`. Прокидывается
   * в тестах, чтобы render() мог проверить контент без дополнительной
   * настройки jsdom.
   */
  container?: HTMLElement | null;
}

export function ToastProvider({ children, container }: ToastProviderProps): JSX.Element {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const idCounterRef = useRef(0);
  // Таймеры — отдельная мапа, чтобы dismissToast мог их отменить и не
  // словить «двойной dismiss» (timeout + клик).
  const dismissTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const removeTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearDismissTimer = useCallback((id: string): void => {
    const t = dismissTimersRef.current.get(id);
    if (t != null) {
      clearTimeout(t);
      dismissTimersRef.current.delete(id);
    }
  }, []);

  const dismissToast = useCallback(
    (id: string): void => {
      clearDismissTimer(id);
      // Если уже leaving — не запускаем второй remove-таймер.
      let alreadyLeaving = false;
      setToasts((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          if (t.leaving) {
            alreadyLeaving = true;
            return t;
          }
          return { ...t, leaving: true };
        }),
      );
      if (alreadyLeaving) return;
      const removeTimer = setTimeout(() => {
        removeTimersRef.current.delete(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, EXIT_ANIMATION_MS);
      removeTimersRef.current.set(id, removeTimer);
    },
    [clearDismissTimer],
  );

  const showToast = useCallback(
    (message: string, options: ShowToastOptions = {}): string => {
      const id = `toast-${++idCounterRef.current}`;
      const kind = options.kind ?? 'success';
      const duration = options.duration ?? DEFAULT_DURATION_MS;
      const entry: ToastEntry = { id, message, kind, duration, leaving: false };
      setToasts((prev) => [...prev, entry]);
      if (duration > 0) {
        const timer = setTimeout(() => {
          dismissTimersRef.current.delete(id);
          dismissToast(id);
        }, duration);
        dismissTimersRef.current.set(id, timer);
      }
      return id;
    },
    [dismissToast],
  );

  const showSuccess = useCallback(
    (message: string, options: Omit<ShowToastOptions, 'kind'> = {}): string =>
      showToast(message, { ...options, kind: 'success' }),
    [showToast],
  );

  const showError = useCallback(
    (message: string, options: Omit<ShowToastOptions, 'kind'> = {}): string =>
      showToast(message, { ...options, kind: 'error' }),
    [showToast],
  );

  // Чистим все висящие таймеры при размонтаже — иначе SSR/тесты могут
  // получить «toast пришёл после teardown».
  useEffect(() => {
    const dismiss = dismissTimersRef.current;
    const remove = removeTimersRef.current;
    return () => {
      for (const t of dismiss.values()) clearTimeout(t);
      for (const t of remove.values()) clearTimeout(t);
      dismiss.clear();
      remove.clear();
    };
  }, []);

  const api: ToastApi = { showToast, showSuccess, showError, dismissToast };

  // Портал может быть недоступен в SSR / на самом первом тике до mount —
  // в таком случае рендерим только children, тосты появятся со следующим
  // микро-тиком.
  const portalTarget =
    container ??
    (typeof document !== 'undefined' ? document.body : null);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {portalTarget
        ? createPortal(
            <div className={styles.container} aria-label="Уведомления" data-testid="toast-stack">
              {toasts.map((t) => (
                <ToastView
                  key={t.id}
                  message={t.message}
                  kind={t.kind}
                  leaving={t.leaving}
                  onDismiss={() => dismissToast(t.id)}
                />
              ))}
            </div>,
            portalTarget,
          )
        : null}
    </ToastContext.Provider>
  );
}
