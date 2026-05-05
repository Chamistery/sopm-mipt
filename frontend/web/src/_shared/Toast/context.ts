/*
 * Контекст и типы выделены в отдельный файл, чтобы Vite fast-refresh
 * корректно работал с ToastProvider.tsx (правило
 * react-refresh/only-export-components — компонент-файл не должен
 * экспортить нон-компоненты).
 */

import { createContext } from 'react';

import type { ToastKind } from './Toast';

export interface ShowToastOptions {
  /** Тип toast'а — определяет цвет и aria-роль. По умолчанию `success`. */
  kind?: ToastKind;
  /** Авто-скрытие через `duration` ms. `0` — sticky (только клик). */
  duration?: number;
}

export interface ToastApi {
  showToast: (message: string, options?: ShowToastOptions) => string;
  showSuccess: (message: string, options?: Omit<ShowToastOptions, 'kind'>) => string;
  showError: (message: string, options?: Omit<ShowToastOptions, 'kind'>) => string;
  dismissToast: (id: string) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);
