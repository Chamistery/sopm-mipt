/*
 * Thin fetch wrapper used by everything that talks to the backend.
 *
 * Two responsibilities:
 *   1. Inject `X-User-Id` / `X-User-Role` headers from the auth store
 *      (dev-mode авторизация — пока OAuth МФТИ не подключён).
 *   2. Unwrap the standard envelope: success is `{"data": ...}`, errors
 *      are `{"error": "..."}` (see backend internal/httputil/response.go).
 *
 * Generated SDK from `npm run gen:api` lives under `./generated/` so it
 * never overwrites this file. When versions of @hey-api/openapi-ts and
 * @hey-api/client-fetch are aligned, we'll wire the SDK through the
 * configureApiClient hook below.
 */

import type { Role } from '@/auth/roles';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

type AuthHeaderProvider = () => { userId: number; role: Role } | null;

let authHeaderProvider: AuthHeaderProvider = () => null;

export function setAuthHeaderProvider(provider: AuthHeaderProvider): void {
  authHeaderProvider = provider;
}

export function buildAuthHeaders(): Record<string, string> {
  const auth = authHeaderProvider();
  if (!auth) return {};
  return {
    'X-User-Id': String(auth.userId),
    'X-User-Role': auth.role,
  };
}

/*
 * `query` accepts any object — `object` is intentionally weak so feature
 * code can pass typed structures (`type ProjectListQuery = { mentorId?: number }`)
 * without an index signature. `Record<string, unknown>` would still require
 * an index signature on the source type, which named object types lack.
 *
 * Values are filtered at runtime: only string/number/boolean make it onto
 * the wire; null/undefined drop out; nested objects and arrays are skipped
 * silently (features should pre-serialise them — joined string, JSON, etc).
 */
export type QueryValue = string | number | boolean | null | undefined;

export interface ApiRequestInit extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: object;
}

function buildQuery(query?: object): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(query as Record<string, unknown>)) {
    if (raw === undefined || raw === null) continue;
    if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
      params.append(key, String(raw));
    }
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function extractError(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const err = (body as { error: unknown }).error;
    if (typeof err === 'string') return err;
  }
  return `HTTP ${status}`;
}

function extractData<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export async function apiFetch<T = unknown>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { body, query, headers, ...rest } = init;

  const url = `${API_BASE_URL}${path}${buildQuery(query)}`;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...buildAuthHeaders(),
    ...(headers as Record<string, string> | undefined),
  };

  let payload: BodyInit | undefined;
  if (body === undefined) {
    payload = undefined;
  } else if (isFormData) {
    payload = body;
  } else if (typeof body === 'string') {
    payload = body;
    finalHeaders['Content-Type'] ??= 'application/json';
  } else {
    payload = JSON.stringify(body);
    finalHeaders['Content-Type'] ??= 'application/json';
  }

  const response = await fetch(url, {
    ...rest,
    headers: finalHeaders,
    body: payload,
  });

  const parsed = await parseJsonSafe(response);

  if (!response.ok) {
    throw new ApiError(response.status, extractError(parsed, response.status), parsed);
  }

  return extractData<T>(parsed);
}

/*
 * Hook for wiring the generated SDK once we sort out the version mismatch
 * between @hey-api/openapi-ts (0.64) and @hey-api/client-fetch (0.7).
 * Currently a no-op; called from main.tsx so the wiring point is stable.
 */
export function configureApiClient(): void {
  // Future: import { client } from './generated/client.gen' and call
  // client.setConfig({ baseUrl: API_BASE_URL, headers: buildAuthHeaders });
}
