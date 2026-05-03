/*
 * Distribution service is a separate microservice that is not yet on origin.
 * The project-service exposes thin proxy stubs at /api/distribution/*; we
 * call them directly and translate transport errors into domain values so
 * the UI can render «временно недоступен» without exposing stack traces.
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

export interface DistributionRunResult {
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

export async function generateDistribution(): Promise<DistributionRunResult> {
  const data = await apiFetch<unknown>('/distribution/generate', { method: 'POST' });
  return {
    message: extractMessage(data) ?? 'Запуск распределения принят сервисом',
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
