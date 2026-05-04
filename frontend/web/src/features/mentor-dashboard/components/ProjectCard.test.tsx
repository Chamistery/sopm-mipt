import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type { MentorDashboardProject } from '@/api/projects';
import { ProjectCard } from './ProjectCard';

const SPRINTS = [
  { id: 1, number: 1, startDate: '2026-02-24', endDate: '2026-03-16', status: 'Завершён' as const },
  { id: 2, number: 2, startDate: '2026-03-17', endDate: '2026-04-06', status: 'Активный' as const },
  { id: 3, number: 3, startDate: '2026-04-07', endDate: '2026-04-27', status: 'Запланирован' as const },
  { id: 4, number: 4, startDate: '2026-04-28', endDate: '2026-05-18', status: 'Запланирован' as const },
  { id: 5, number: 5, startDate: '2026-05-19', endDate: '2026-06-08', status: 'Запланирован' as const },
];

function makeProject(overrides: Partial<MentorDashboardProject> = {}): MentorDashboardProject {
  return {
    id: 1,
    title: 'Система управления проектным практикумом ВШПИ',
    status: 'Активный',
    company: 'МФТИ',
    durationSemesters: 1,
    currentSemester: 1,
    startedAt: '2026-02-15',
    sprints: SPRINTS,
    teams: [
      {
        id: 11,
        name: 'Команда 1',
        lead: { id: 3, firstName: 'Александр', lastName: 'Стародубов' },
        memberCount: 4,
        launched: true,
        sprintStatuses: ['reviewed', 'pending-review', 'future', 'future', 'future'],
      },
    ],
    ...overrides,
  };
}

function renderCard(project: MentorDashboardProject) {
  return render(
    <MemoryRouter>
      <ProjectCard project={project} />
    </MemoryRouter>,
  );
}

describe('ProjectCard', () => {
  it('renders title, status badge, sprint header and team row', () => {
    renderCard(makeProject());

    expect(
      screen.getByRole('heading', { name: /Система управления проектным практикумом ВШПИ/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Активен')).toBeInTheDocument();
    expect(screen.getByText(/Спринт 2 из 5/)).toBeInTheDocument();
    // 21-day sprint = 3 weeks; checking the formatted detail line exists
    expect(screen.getByText(/по 3 недели/)).toBeInTheDocument();
    expect(screen.getByText(/17 мар — 6 апр/)).toBeInTheDocument();
    expect(screen.getByText('Команда 1')).toBeInTheDocument();
    expect(screen.getByText(/4 чел\./)).toBeInTheDocument();
    expect(screen.getByText(/Лидер: Стародубов А\./)).toBeInTheDocument();
  });

  it('shows continuation pill and predecessor footer link when predecessorId set', () => {
    renderCard(
      makeProject({
        predecessorId: 100,
        durationSemesters: 2,
        currentSemester: 2,
      }),
    );

    expect(screen.getByText('Продолжение')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Открыть предшественника/ });
    expect(link).toHaveAttribute('href', '/mentor/archive?highlight=100');
    expect(screen.getByText(/2 семестра.*2-й из 2/)).toBeInTheDocument();
  });

  it('renders «Ожидает запуска» dashed row instead of iter-track for non-launched team', () => {
    renderCard(
      makeProject({
        teams: [
          {
            id: 21,
            name: 'Команда 4',
            lead: null,
            memberCount: 2,
            launched: false,
            sprintStatuses: [],
          },
        ],
      }),
    );

    expect(screen.getByText('Команда 4')).toBeInTheDocument();
    expect(screen.getByText('Ожидает запуска')).toBeInTheDocument();
    expect(screen.queryByText(/Лидер:/)).not.toBeInTheDocument();
  });

  it('renders empty-team message + «Дозаполнить заявку» for draft without teams', () => {
    renderCard(
      makeProject({
        status: 'Черновик',
        sprints: [],
        teams: [],
      }),
    );

    expect(screen.getByText('Черновик')).toBeInTheDocument();
    expect(screen.getByText(/Заявка ещё не отправлена/)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Дозаполнить заявку/ });
    expect(link).toHaveAttribute('href', '/mentor/projects/new?continueProjectId=1');
    // Black-list: sprint header should NOT show
    expect(screen.queryByText(/Спринт/)).not.toBeInTheDocument();
  });

  it('omits team-list when there are zero teams', () => {
    renderCard(makeProject({ teams: [] }));

    expect(screen.getByText(/Заявка ещё не отправлена/)).toBeInTheDocument();
  });

  it('team-row links to /mentor/teams/:teamId for launched teams (default tab — gantt)', () => {
    renderCard(makeProject());

    const teamLink = screen.getByRole('link', { name: /Команда 1/ });
    expect(teamLink).toHaveAttribute('href', '/mentor/teams/11');
  });

  it('shows footer «Начат: <month YYYY>» for active project', () => {
    renderCard(makeProject({ startedAt: '2025-09-01' }));

    expect(screen.getByText(/Начат: сентябрь 2025/)).toBeInTheDocument();
  });

  it('shows footer «Создан: <month YYYY>» for draft project', () => {
    renderCard(
      makeProject({
        status: 'Черновик',
        sprints: [],
        teams: [],
        startedAt: '2026-03-25',
      }),
    );

    expect(screen.getByText(/Создан: март 2026/)).toBeInTheDocument();
  });
});
