import { describe, expect, it } from 'vitest';

import { parseDistributionStatus } from './distribution';

describe('parseDistributionStatus', () => {
  it('returns idle for null/undefined/non-object input', () => {
    expect(parseDistributionStatus(null).stage).toBe('idle');
    expect(parseDistributionStatus(undefined).stage).toBe('idle');
    expect(parseDistributionStatus('whatever').stage).toBe('idle');
  });

  it('recognises running tokens regardless of casing or language', () => {
    expect(parseDistributionStatus({ stage: 'RUNNING' }).stage).toBe('running');
    expect(parseDistributionStatus({ status: 'in_progress' }).stage).toBe('running');
    expect(parseDistributionStatus({ status: 'выполняется' }).stage).toBe('running');
  });

  it('recognises done and error tokens', () => {
    expect(parseDistributionStatus({ stage: 'completed' }).stage).toBe('done');
    expect(parseDistributionStatus({ stage: 'завершено' }).stage).toBe('done');
    expect(parseDistributionStatus({ stage: 'failed' }).stage).toBe('error');
    expect(parseDistributionStatus({ status: 'ошибка' }).stage).toBe('error');
  });

  it('preserves progress, message, and timestamps when present', () => {
    const parsed = parseDistributionStatus({
      stage: 'running',
      progress: 42,
      message: 'Считаем веса',
      startedAt: '2026-05-04T10:00:00Z',
      finishedAt: undefined,
    });
    expect(parsed).toEqual({
      stage: 'running',
      progress: 42,
      message: 'Считаем веса',
      startedAt: '2026-05-04T10:00:00Z',
      finishedAt: undefined,
    });
  });

  it('falls back to idle when no recognisable tokens are present', () => {
    expect(parseDistributionStatus({ stage: 'unknown-thing' }).stage).toBe('idle');
  });
});
