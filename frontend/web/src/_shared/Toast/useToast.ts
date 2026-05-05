/*
 * `useToast()` — единственный публичный API для feature-кода. Кидает,
 * если ToastProvider не подмонтирован в дереве (бросаем рано — лучше
 * увидеть в dev'е, чем тихо терять уведомления). В тестах — оборачиваем
 * рендер в <ToastProvider>, см. Toast.test.tsx.
 */

import { useContext } from 'react';

import { ToastContext, type ToastApi } from './context';

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within <ToastProvider>');
  }
  return ctx;
}
