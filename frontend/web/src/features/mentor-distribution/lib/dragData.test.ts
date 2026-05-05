import { describe, expect, it } from 'vitest';

import {
  APPLICANT_MIME,
  hasApplicantDragData,
  readApplicantDragData,
  setApplicantDragData,
} from './dragData';

class FakeDataTransfer {
  private map = new Map<string, string>();
  effectAllowed: DataTransfer['effectAllowed'] = 'none';

  setData(format: string, data: string): void {
    this.map.set(format, data);
  }
  getData(format: string): string {
    return this.map.get(format) ?? '';
  }
  get types(): readonly string[] {
    return Array.from(this.map.keys());
  }
}

function makeDt(): DataTransfer {
  return new FakeDataTransfer() as unknown as DataTransfer;
}

describe('dragData', () => {
  it('roundtrips a valid payload', () => {
    const dt = makeDt();
    setApplicantDragData(dt, {
      applicationId: 7,
      projectId: 100,
      priority: 2,
      sourceTeamId: null,
      qualified: true,
    });
    expect(dt.types).toContain(APPLICANT_MIME);
    expect(dt.effectAllowed).toBe('move');

    const out = readApplicantDragData(dt);
    expect(out).toEqual({
      applicationId: 7,
      projectId: 100,
      priority: 2,
      sourceTeamId: null,
      qualified: true,
    });
  });

  it('reads sourceTeamId when set', () => {
    const dt = makeDt();
    setApplicantDragData(dt, {
      applicationId: 9,
      projectId: 100,
      priority: 1,
      sourceTeamId: 4,
      qualified: false,
    });
    expect(readApplicantDragData(dt)?.sourceTeamId).toBe(4);
  });

  it('returns null on garbage input', () => {
    const dt = makeDt();
    dt.setData('text/plain', '{not json');
    expect(readApplicantDragData(dt)).toBeNull();
  });

  it('returns null on empty data', () => {
    const dt = makeDt();
    expect(readApplicantDragData(dt)).toBeNull();
  });

  it('returns null when fields are missing', () => {
    const dt = makeDt();
    dt.setData(APPLICANT_MIME, JSON.stringify({ applicationId: 1 }));
    expect(readApplicantDragData(dt)).toBeNull();
  });

  it('hasApplicantDragData detects mime', () => {
    const dt = makeDt();
    expect(hasApplicantDragData(dt)).toBe(false);
    setApplicantDragData(dt, {
      applicationId: 1,
      projectId: 1,
      priority: 1,
      sourceTeamId: null,
      qualified: true,
    });
    expect(hasApplicantDragData(dt)).toBe(true);
  });
});
