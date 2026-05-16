/*
 * Distribution-сервис — отдельный C++ микросервис, project-service
 * проксирует его через POST /api/distribution/generate и GET
 * /api/distribution/status. При DISTRIBUTION_SERVICE_URL="" Go-сторона
 * фолбэчится на встроенный наивный алгоритм; при недоступности —
 * возвращает 503, который мы здесь маппим в stage='unavailable'.
 */

import { ApiError, apiFetch } from './client';

export type DistributionStage = 'idle' | 'running' | 'done' | 'error' | 'unavailable';

export interface DistributionStatus {
  stage: DistributionStage;
  progress?: number;
  message?: string;
  startedAt?: string;
  finishedAt?: string;
}

/**
 * Результат вызова /api/distribution/generate. Бэкенд (после интеграции
 * с C++ Гейля-Шепли) возвращает счётчики; UI показывает их в popup'е.
 *
 * `applied` — сколько заявок реально перевели в новый статус;
 * `skipped` — сколько пропустили (защита ручных решений: статусы
 * «Принят» / «Принято ментором» алгоритм не перезаписывает).
 */
export interface DistributionRunResult {
  state: string;
  applied: number;
  skipped: number;
  recommendedCount: number;
  notRecommendedCount: number;
  message: string;
  raw: unknown;
}

interface RawDistributionStatus {
  status?: string;
  stage?: string;
  progress?: number;
  message?: string;
  startedAt?: string;
  finishedAt?: string;
}

interface RawDistributionRunResult {
  state?: string;
  applied?: number;
  skipped?: number;
  recommendedCount?: number;
  notRecommendedCount?: number;
  message?: string;
}

const RUNNING_TOKENS = ['running', 'in_progress', 'processing', 'в работе', 'выполняется'];
const DONE_TOKENS = ['done', 'completed', 'finished', 'завершено', 'готово'];
const ERROR_TOKENS = ['error', 'failed', 'ошибка'];

function normalizeStage(raw: string | undefined): DistributionStage {
  if (!raw) return 'idle';
  const lower = raw.toLowerCase().trim();
  if (RUNNING_TOKENS.some((t) => lower.includes(t))) return 'running';
  if (DONE_TOKENS.some((t) => lower.includes(t))) return 'done';
  if (ERROR_TOKENS.some((t) => lower.includes(t))) return 'error';
  return 'idle';
}

export function parseDistributionStatus(raw: unknown): DistributionStatus {
  if (!raw || typeof raw !== 'object') {
    return { stage: 'idle' };
  }
  const r = raw as RawDistributionStatus;
  return {
    stage: normalizeStage(r.stage ?? r.status),
    progress: typeof r.progress === 'number' ? r.progress : undefined,
    message: r.message,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
  };
}

function isUnavailable(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  return err.status === 404 || err.status === 501 || err.status === 503;
}

/** Признак, что распределение недоступно (для catch в UI). */
export function isDistributionUnavailable(err: unknown): boolean {
  return isUnavailable(err);
}

export async function generateDistribution(): Promise<DistributionRunResult> {
  const data = await apiFetch<unknown>('/distribution/generate', { method: 'POST' });
  const r = (data && typeof data === 'object' ? (data as RawDistributionRunResult) : {}) as RawDistributionRunResult;
  return {
    state: r.state ?? 'завершено',
    applied: typeof r.applied === 'number' ? r.applied : 0,
    skipped: typeof r.skipped === 'number' ? r.skipped : 0,
    recommendedCount: typeof r.recommendedCount === 'number' ? r.recommendedCount : 0,
    notRecommendedCount: typeof r.notRecommendedCount === 'number' ? r.notRecommendedCount : 0,
    message: r.message ?? extractMessage(data) ?? 'Распределение завершено',
    raw: data,
  };
}

export async function getDistributionStatus(): Promise<DistributionStatus> {
  try {
    const data = await apiFetch<unknown>('/distribution/status');
    return parseDistributionStatus(data);
  } catch (err) {
    if (isUnavailable(err)) {
      return { stage: 'unavailable', message: 'Сервис распределения временно недоступен' };
    }
    throw err;
  }
}

function extractMessage(payload: unknown): string | null {
  if (typeof payload === 'string') return payload;
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const m = (payload as { message: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return null;
}
