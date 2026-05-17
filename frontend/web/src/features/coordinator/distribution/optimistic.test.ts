import { describe, it, expect } from 'vitest';

import type { CoordinatorDistributionResponse } from '@/api/coordinatorDistribution';

import { moveMemberToTeam, recommendFromPool, unrecommendToPool } from './optimistic';

function makeData(): CoordinatorDistributionResponse {
  return {
    projects: [
      {
        id: 1,
        title: 'P1',
        status: 'Активный',
        company: 'X',
        mentor: { id: 9, firstName: 'Иван', lastName: 'Иванов' },
        teamSizeMin: 1,
        teamSizeMax: 5,
        numTeams: 2,
        teams: [
          {
            id: 10,
            name: 'T1',
            launched: false,
            members: [
              { applicationId: 100, studentId: 200, firstName: 'A', lastName: 'A', course: 2, group: 'g', gpa: 7.5, priority: 1, status: 'Рекомендован', qualified: true },
            ],
          },
          { id: 11, name: 'T2', launched: false, members: [] },
        ],
      },
    ],
    pool: [
      {
        studentId: 300,
        firstName: 'B',
        lastName: 'B',
        course: 2,
        group: 'g',
        gpa: 8.0,
        priorities: [
          { applicationId: 500, projectId: 1, projectTitle: 'P1', priority: 2, status: 'Ожидает' },
        ],
      },
    ],
  };
}

describe('moveMemberToTeam', () => {
  it('moves member from source team to target team within the same project', () => {
    const out = moveMemberToTeam(100, 11, 'Принято ментором')(makeData())!;
    const p = out.projects[0];
    expect(p.teams[0].members).toHaveLength(0);
    expect(p.teams[1].members).toHaveLength(1);
    expect(p.teams[1].members[0].applicationId).toBe(100);
    expect(p.teams[1].members[0].status).toBe('Принято ментором');
  });

  it('updates status in-place when dropping on the same team', () => {
    const out = moveMemberToTeam(100, 10, 'Принят')(makeData())!;
    expect(out.projects[0].teams[0].members[0].status).toBe('Принят');
  });

  it('returns prev unchanged when applicationId not found', () => {
    const data = makeData();
    expect(moveMemberToTeam(999, 11, 'Рекомендован')(data)).toBe(data);
  });
});

describe('recommendFromPool', () => {
  it('removes student from pool and adds member to target team', () => {
    const out = recommendFromPool(500, 300, 1, 11, 'Рекомендован')(makeData())!;
    expect(out.pool.find((s) => s.studentId === 300)).toBeUndefined();
    expect(out.projects[0].teams[1].members[0].applicationId).toBe(500);
    expect(out.projects[0].teams[1].members[0].status).toBe('Рекомендован');
  });
});

describe('unrecommendToPool', () => {
  it('removes member from team and pushes priority into the pool', () => {
    const out = unrecommendToPool(100)(makeData())!;
    expect(out.projects[0].teams[0].members).toHaveLength(0);
    const poolStudent = out.pool.find((s) => s.studentId === 200);
    expect(poolStudent).toBeDefined();
    expect(poolStudent!.priorities.find((p) => p.applicationId === 100)).toBeDefined();
  });
});
