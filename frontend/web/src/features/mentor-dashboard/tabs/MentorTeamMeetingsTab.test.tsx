import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { Meeting } from '@/api/types';
import type { Team } from '@/api/teams';

import { MentorTeamMeetingsTab } from './MentorTeamMeetingsTab';

vi.mock('@/api/meetings', () => ({
  listMeetings: vi.fn().mockResolvedValue([]),
  createMeeting: vi.fn().mockResolvedValue({}),
  updateMeeting: vi.fn().mockResolvedValue({}),
  deleteMeeting: vi.fn().mockResolvedValue(undefined),
}));

const TEAMLEAD = {
  id: 3,
  firstName: 'Иван',
  lastName: 'Петров',
  middleName: 'Алексеевич',
  email: 't@x',
  role: 'teamlead' as const,
};

function makeTeam(): Team {
  return {
    id: 300,
    projectId: 100,
    name: 'Команда 1',
    leaderId: 3,
    leader: TEAMLEAD,
    members: [
      {
        id: 1,
        teamId: 300,
        userId: 3,
        isLeader: true,
        roleInTeam: 'Backend',
        user: TEAMLEAD,
      },
    ],
  };
}

function renderWith(meetings: Meeting[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(['team', 300], makeTeam());
  client.setQueryData(['meetings', 300], meetings);
  return render(
    <QueryClientProvider client={client}>
      <MentorTeamMeetingsTab teamId={300} />
    </QueryClientProvider>,
  );
}

describe('MentorTeamMeetingsTab', () => {
  it('рендерит две секции и кнопку «+ Назначить встречу»', () => {
    renderWith([]);

    expect(screen.getByRole('heading', { name: 'Встречи команды' })).toBeInTheDocument();
    expect(screen.getByText('Предстоящие')).toBeInTheDocument();
    expect(screen.getByText('Прошедшие')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Назначить встречу/ })).toBeInTheDocument();
    expect(screen.getByText(/Предстоящих встреч пока нет/)).toBeInTheDocument();
    expect(screen.getByText(/Прошедших встреч ещё нет/)).toBeInTheDocument();
  });

  it('делит встречи на upcoming/past и сортирует обе группы', () => {
    const future = '2099-12-01';
    const past = '2020-03-17';
    renderWith([
      {
        id: 1,
        teamId: 300,
        title: 'Прошедший планёрка',
        meetingDate: past,
        startTime: '16:00',
        durationMinutes: 60,
        status: 'Состоялась',
      },
      {
        id: 2,
        teamId: 300,
        title: 'Будущая встреча',
        meetingDate: future,
        startTime: '15:00',
        durationMinutes: 45,
        status: 'Подтверждена',
      },
    ]);

    expect(screen.getByText('Будущая встреча')).toBeInTheDocument();
    expect(screen.getByText('Прошедший планёрка')).toBeInTheDocument();
    // Не должно быть "Предстоящих встреч пока нет" / "Прошедших встреч ещё нет"
    expect(screen.queryByText(/Предстоящих встреч пока нет/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Прошедших встреч ещё нет/)).not.toBeInTheDocument();
  });
});
