import type { JSX } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { Project } from '@/api/projects';
import type { ProposalData } from './lib/projectFormState';
import { MentorProjectInfoPage } from './MentorProjectInfoPage';

vi.mock('@/auth/useCurrentUser', () => ({
  useRequireUser: (): { userId: number } => ({ userId: 1 }),
}));

const PROJECT_ID = 110;

const PROPOSAL: ProposalData = {
  title: 'Архивный: Цифровой двойник кампуса',
  company: 'ЦИТ МФТИ',
  mentor: {
    fullName: 'Тимохин В.А.',
    role: 'Доцент',
    email: 'timokhin@mipt.ru',
    telegram: '@vtimokhin',
    phone: '+7 (495) 000-00-00',
  },
  goal: 'Витрина цифрового двойника кампуса.',
  expectedResult: 'Веб-приложение с 3D-моделью.',
  technologies: 'React, Three.js, PostgreSQL',
  competencies: 'Знание JS/TS, базовое понимание 3D-графики.',
  minRating: 3.5,
  minGpa: 7.0,
  allowedCourses: [2],
  description: 'Подробное описание архивного проекта.',
  acceptanceCriteria: 'Стабильная работа.',
  eduResult: 'Frontend, 3D, командная работа.',
  durationSemesters: 1,
  sprints: { count: 5, startDate: '2026-09-01', mode: 'simple', durationWeeks: 2 },
  numTeams: 1,
  teamSizeMin: 3,
  teamSizeMax: 5,
  resources: 'Доступ к данным кампуса.',
  isContinuation: false,
  predecessorProjectId: null,
};

const PROJECT: Project = {
  id: PROJECT_ID,
  title: 'Архивный: Цифровой двойник кампуса',
  status: 'Завершён',
  mentorId: 1,
  company: 'ЦИТ МФТИ',
  teamSizeMin: 3,
  teamSizeMax: 5,
  numTeams: 1,
  createdAt: '2025-09-01T08:00:00Z',
  updatedAt: '2025-10-30T08:00:00Z',
};

function makeClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  client.setQueryData(['project', PROJECT_ID], PROJECT);
  client.setQueryData(['project', PROJECT_ID, 'proposal'], PROPOSAL);
  return client;
}

function renderPage(initialPath: string): JSX.Element {
  const client = makeClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/mentor/archive" element={<div>Архив</div>} />
          <Route path="/mentor" element={<div>Дашборд</div>} />
          <Route
            path="/mentor/projects/:projectId/info"
            element={<MentorProjectInfoPage />}
          />
          <Route
            path="/mentor/archive/projects/:projectId/info"
            element={<MentorProjectInfoPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  ) as unknown as JSX.Element;
}

describe('MentorProjectInfoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('readonly mode: рендерит банер архива и поля как readOnly', async () => {
    renderPage(`/mentor/archive/projects/${PROJECT_ID}/info`);

    await waitFor(() =>
      expect(screen.getByDisplayValue(PROPOSAL.title)).toBeInTheDocument(),
    );

    // Жёлтый банер
    const banner = screen.getByRole('note');
    expect(banner).toHaveTextContent(/завершённого/);

    // title input — readOnly
    const titleInput = screen.getByDisplayValue(PROPOSAL.title);
    expect(titleInput).toHaveAttribute('readonly');

    // Кнопок навигации «Далее» / «Создать» нет; есть «Закрыть»
    expect(screen.queryByTestId('form-next')).not.toBeInTheDocument();
    expect(screen.getByTestId('info-close')).toBeInTheDocument();
  });

  it('edit mode: рендерит синий банер и инпуты не readOnly', async () => {
    renderPage(`/mentor/projects/${PROJECT_ID}/info`);

    await waitFor(() =>
      expect(screen.getByDisplayValue(PROPOSAL.title)).toBeInTheDocument(),
    );

    const banner = screen.getByRole('note');
    expect(banner).toHaveTextContent(/Редактирование проекта/);

    const titleInput = screen.getByDisplayValue(PROPOSAL.title);
    expect(titleInput).not.toHaveAttribute('readonly');

    // В edit есть кнопка «Далее» (на section 0). Save disabled.
    const nextBtn = screen.getByTestId('form-next');
    expect(nextBtn).toBeInTheDocument();
  });

  it('показывает скелетон пока данные грузятся', () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    // Не пресидим: useQuery попытается реально fetch — без MSW в jsdom это
    // будет pending. Скелетон должен появиться.
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[`/mentor/projects/${PROJECT_ID}/info`]}>
          <Routes>
            <Route
              path="/mentor/projects/:projectId/info"
              element={<MentorProjectInfoPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByTestId('info-skeleton')).toBeInTheDocument();
  });
});
