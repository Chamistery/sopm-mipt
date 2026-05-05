import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import type { MentorDistributionTeam } from '@/api/mentorDistribution';
import { DistTeamCard } from './DistTeamCard';

function makeTeam(overrides: Partial<MentorDistributionTeam> = {}): MentorDistributionTeam {
  return {
    id: 4,
    name: 'Команда 1',
    launched: false,
    members: [],
    ...overrides,
  };
}

describe('DistTeamCard', () => {
  it('renders empty slots equal to max size', () => {
    render(
      <DistTeamCard
        projectId={1}
        team={makeTeam()}
        maxSize={5}
        onDropApplicant={vi.fn()}
        onRemoveMember={vi.fn()}
        onInviteMember={vi.fn()}
        onLaunch={vi.fn()}
      />,
    );
    expect(screen.getAllByText('Свободное место')).toHaveLength(5);
    expect(screen.getByText('0 / 5')).toBeInTheDocument();
  });

  it('shows disabled launch when not all accepted', () => {
    const onLaunch = vi.fn();
    render(
      <DistTeamCard
        projectId={1}
        team={makeTeam({
          members: [
            {
              applicationId: 1,
              studentId: 11,
              firstName: 'Иван',
              lastName: 'Иванов',
              course: 2,
              group: 'Б05-200',
              gpa: 7,
              priority: 1,
              status: 'Рекомендован',
              qualified: true,
            },
          ],
        })}
        maxSize={3}
        onDropApplicant={vi.fn()}
        onRemoveMember={vi.fn()}
        onInviteMember={vi.fn()}
        onLaunch={onLaunch}
      />,
    );
    const btn = screen.getByRole('button', { name: /Не все участники приняты/i });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onLaunch).not.toHaveBeenCalled();
  });

  it('enables launch when all members are accepted', () => {
    const onLaunch = vi.fn();
    render(
      <DistTeamCard
        projectId={1}
        team={makeTeam({
          members: [
            {
              applicationId: 1,
              studentId: 11,
              firstName: 'Иван',
              lastName: 'Иванов',
              course: 2,
              group: 'Б05-200',
              gpa: 7,
              priority: 1,
              status: 'Принят',
              qualified: true,
            },
            {
              applicationId: 2,
              studentId: 12,
              firstName: 'Пётр',
              lastName: 'Петров',
              course: 2,
              group: 'Б05-200',
              gpa: 6,
              priority: 1,
              status: 'Принят',
              qualified: true,
            },
          ],
        })}
        maxSize={3}
        onDropApplicant={vi.fn()}
        onRemoveMember={vi.fn()}
        onInviteMember={vi.fn()}
        onLaunch={onLaunch}
      />,
    );
    const btn = screen.getByRole('button', { name: /Запустить команду/i });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onLaunch).toHaveBeenCalledWith(4);
  });

  it('shows just-launched banner when flag is set', () => {
    render(
      <DistTeamCard
        projectId={1}
        team={makeTeam()}
        maxSize={5}
        onDropApplicant={vi.fn()}
        onRemoveMember={vi.fn()}
        onInviteMember={vi.fn()}
        onLaunch={vi.fn()}
        justLaunched
      />,
    );
    expect(screen.getByText(/Команда запущена/)).toBeInTheDocument();
  });
});
