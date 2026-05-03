import { describe, expect, it } from 'vitest';

import type { TeamMemberDto } from '@/api/teams';
import { avatarColor, findMember, fullNameWithMiddle, initials, shortName } from './people';

const STARODUBOV: TeamMemberDto = {
  userId: 1,
  firstName: 'Александр',
  lastName: 'Стародубов',
  middleName: 'Юрьевич',
  role: 'student',
  isLeader: false,
};

const KUZNETSOV: TeamMemberDto = {
  userId: 2,
  firstName: 'Михаил',
  lastName: 'Кузнецов',
  role: 'teamlead',
  isLeader: true,
};

describe('shortName / fullNameWithMiddle', () => {
  it('formats short name with first-letter initial', () => {
    expect(shortName(STARODUBOV)).toBe('Стародубов А.');
  });

  it('falls back when first name is missing', () => {
    expect(shortName({ firstName: '', lastName: 'Аноним' })).toBe('Аноним');
  });

  it('joins all three parts in full name', () => {
    expect(fullNameWithMiddle(STARODUBOV)).toBe('Стародубов Александр Юрьевич');
  });

  it('omits missing middleName cleanly', () => {
    expect(fullNameWithMiddle(KUZNETSOV)).toBe('Кузнецов Михаил');
  });
});

describe('initials', () => {
  it('returns two uppercase letters', () => {
    expect(initials(STARODUBOV)).toBe('СА');
  });

  it('returns ?? when both letters missing', () => {
    expect(initials({ firstName: '', lastName: '' })).toBe('??');
  });
});

describe('avatarColor', () => {
  it('is stable for the same userId', () => {
    expect(avatarColor(7)).toBe(avatarColor(7));
  });

  it('returns one of the palette colours', () => {
    const c = avatarColor(0);
    expect(typeof c).toBe('string');
    expect(c.length).toBeGreaterThan(0);
  });
});

describe('findMember', () => {
  it('finds an existing member', () => {
    expect(findMember([STARODUBOV, KUZNETSOV], 2)).toBe(KUZNETSOV);
  });

  it('returns undefined when not found', () => {
    expect(findMember([STARODUBOV], 99)).toBeUndefined();
  });
});
