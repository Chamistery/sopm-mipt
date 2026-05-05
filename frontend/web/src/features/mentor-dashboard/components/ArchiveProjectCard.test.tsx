import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import type { ArchiveDashboardProject } from '../hooks/useMentorArchiveDashboard';
import { ArchiveProjectCard } from './ArchiveProjectCard';

const BASE: ArchiveDashboardProject = {
  id: 110,
  title: 'Архивный: Цифровой двойник кампуса',
  company: 'ЦИТ МФТИ',
  predecessorId: null,
  durationSemesters: 1,
  currentSemester: 1,
  semesterLabel: 'Осенний семестр 2025/26',
  finishedAt: '2025-10-26',
  finalGrade: 'Зачтено',
  sprintsCount: 2,
  teams: [
    {
      id: 310,
      name: 'Команда «Кампус-2»',
      leader: 'Петров И.',
      memberCount: 3,
      sprintCount: 2,
      avgScore: 4.7,
    },
  ],
};

function renderCard(project: ArchiveDashboardProject, onOpenInfo = vi.fn()) {
  return {
    onOpenInfo,
    ...render(
      <MemoryRouter>
        <ArchiveProjectCard project={project} onOpenInfo={onOpenInfo} />
      </MemoryRouter>,
    ),
  };
}

describe('ArchiveProjectCard', () => {
  it('рендерит заголовок, бейдж «Новый», статус, итог и команды', () => {
    renderCard(BASE);
    expect(screen.getByText(BASE.title)).toBeInTheDocument();
    expect(screen.getByText('Новый')).toBeInTheDocument();
    expect(screen.getByText('Завершён')).toBeInTheDocument();
    expect(screen.getByText('Зачтено')).toBeInTheDocument();
    expect(screen.getByText('Команда «Кампус-2»')).toBeInTheDocument();
    expect(screen.getByText('Ср. балл: 4.7')).toBeInTheDocument();
  });

  it('показывает бейдж «Продолжение» и ссылку на предшественника', () => {
    renderCard({ ...BASE, predecessorId: 100 });
    expect(screen.getByText('Продолжение')).toBeInTheDocument();
    const predLink = screen.getByRole('link', { name: /Открыть предшественника/i });
    expect(predLink).toHaveAttribute('href', '/mentor/archive?highlight=100');
  });

  it('клик «Полная информация» вызывает onOpenInfo с id проекта', async () => {
    const onOpenInfo = vi.fn();
    renderCard(BASE, onOpenInfo);
    await userEvent.click(screen.getByRole('button', { name: /Полная информация/ }));
    expect(onOpenInfo).toHaveBeenCalledWith(110);
  });

  it('показывает «—» когда у команды нет средней оценки', () => {
    renderCard({
      ...BASE,
      teams: [{ ...BASE.teams[0]!, avgScore: null }],
    });
    expect(screen.getByText('Ср. балл: —')).toBeInTheDocument();
  });

  it('показывает empty-плашку если команд нет', () => {
    renderCard({ ...BASE, teams: [], sprintsCount: 0 });
    expect(screen.getByText('В этом проекте не было команд.')).toBeInTheDocument();
  });

  it('форматирует дату завершения в RU-формате', () => {
    renderCard(BASE);
    expect(screen.getByText(/Завершён: 26 октября 2025/)).toBeInTheDocument();
  });

  it('teamRow ведёт на /mentor/archive/teams/:id', () => {
    renderCard(BASE);
    const teamLink = screen.getByRole('link', { name: /Команда «Кампус-2»/ });
    expect(teamLink).toHaveAttribute('href', '/mentor/archive/teams/310');
  });
});
