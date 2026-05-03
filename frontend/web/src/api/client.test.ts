import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { ApiError, apiFetch, setAuthHeaderProvider } from './client';

type FetchMock = Mock<typeof fetch>;

const originalFetch = globalThis.fetch;

function installFetchMock(impl: typeof fetch): FetchMock {
  const fn = vi.fn(impl) as unknown as FetchMock;
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
}

beforeEach(() => {
  setAuthHeaderProvider(() => ({ userId: 42, role: 'mentor' }));
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  setAuthHeaderProvider(() => null);
});

describe('apiFetch', () => {
  it('unwraps {data} envelope on success', async () => {
    installFetchMock(
      async () =>
        new Response(JSON.stringify({ data: { id: 1, name: 'Команда 1' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );

    const result = await apiFetch<{ id: number; name: string }>('/teams/1');
    expect(result).toEqual({ id: 1, name: 'Команда 1' });
  });

  it('throws ApiError with message from {error}', async () => {
    installFetchMock(
      async () =>
        new Response(JSON.stringify({ error: 'team not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }),
    );

    await expect(apiFetch('/teams/999')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'team not found',
    });
  });

  it('attaches X-User-Id and X-User-Role from the auth provider', async () => {
    const fetchMock = installFetchMock(
      async () => new Response(JSON.stringify({ data: null }), { status: 200 }),
    );

    await apiFetch('/health');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] ?? [];
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers['X-User-Id']).toBe('42');
    expect(headers['X-User-Role']).toBe('mentor');
  });

  it('serializes objects as JSON when the body is plain', async () => {
    const fetchMock = installFetchMock(
      async () => new Response(JSON.stringify({ data: { ok: true } }), { status: 200 }),
    );

    await apiFetch('/teams', { method: 'POST', body: { name: 'X' } });

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.body).toBe('{"name":"X"}');
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('appends query parameters', async () => {
    const fetchMock = installFetchMock(
      async () => new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );

    await apiFetch('/projects', { query: { company: 'МФТИ', course: 2, drafts: false } });

    const [url] = fetchMock.mock.calls[0] ?? [];
    expect(typeof url).toBe('string');
    const urlString = String(url);
    expect(urlString).toContain('/projects?');
    expect(urlString).toContain('company=%D0%9C%D0%A4%D0%A2%D0%98');
    expect(urlString).toContain('course=2');
    expect(urlString).toContain('drafts=false');
  });

  it('exposes ApiError instance', () => {
    const err = new ApiError(500, 'boom');
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(500);
  });
});
