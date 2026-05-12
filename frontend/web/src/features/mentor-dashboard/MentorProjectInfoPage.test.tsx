import type { JSX } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { Project } from '@/api/projects';
import * as projectsApi from '@/api/projects';
import { ToastProvider } from '@/_shared/Toast';
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

const PROJECT_WITH_PENDING: Project = {
  ...PROJECT,
  pendingProposalData: PROPOSAL,
  pendingSubmittedAt: '2026-05-12T10:30:00Z',
  pendingSubmittedById: 1,
};

function makeClient(project: Project = PROJECT): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  client.setQueryData(['project', PROJECT_ID], project);
  client.setQueryData(['project', PROJECT_ID, 'proposal'], PROPOSAL);
  return client;
}

function renderPage(initialPath: string, project: Project = PROJECT): JSX.Element {
  const client = makeClient(project);
  return render(
    <ToastProvider>
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
      </QueryClientProvider>
    </ToastProvider>,
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

  it('edit mode без pending: синий банер и кнопка «Отправить на согласование» на последней секции', async () => {
    renderPage(`/mentor/projects/${PROJECT_ID}/info`);

    await waitFor(() =>
      expect(screen.getByDisplayValue(PROPOSAL.title)).toBeInTheDocument(),
    );

    const banner = screen.getByRole('note');
    expect(banner).toHaveTextContent(/Редактирование проекта/);
    expect(banner).not.toHaveTextContent(/отправлены координатору/);

    const titleInput = screen.getByDisplayValue(PROPOSAL.title);
    expect(titleInput).not.toHaveAttribute('readonly');

    // На section 0 — кнопка «Далее», не submit.
    const nextBtn = screen.getByTestId('form-next');
    expect(nextBtn).toHaveTextContent(/Далее/);
    expect(nextBtn).not.toBeDisabled();
  });

  it('edit mode с pending: рисует оранжевый pending-banner с датой', async () => {
    renderPage(`/mentor/projects/${PROJECT_ID}/info`, PROJECT_WITH_PENDING);

    await waitFor(() =>
      expect(screen.getByDisplayValue(PROPOSAL.title)).toBeInTheDocument(),
    );

    const banner = screen.getByTestId('pending-banner');
    expect(banner).toHaveTextContent(/отправлены координатору/);
    expect(banner).toHaveTextContent(/12\.05\.2026/);
  });

  it('submit на section 3 вызывает submitProjectChangeRequest и показывает toast', async () => {
    const spy = vi
      .spyOn(projectsApi, 'submitProjectChangeRequest')
      .mockResolvedValue({ ...PROJECT_WITH_PENDING });

    renderPage(`/mentor/projects/${PROJECT_ID}/info`);

    await waitFor(() =>
      expect(screen.getByDisplayValue(PROPOSAL.title)).toBeInTheDocument(),
    );

    // Прокликиваем секции 0..3 через step-dots: на каждой step-dots
    // используют data-testid из StepDots. Проще — пройдём через «Далее»
    // 3 раза, у нас всё валидное (fixture-данные).
    const next = screen.getByTestId('form-next');
    fireEvent.click(next); // → section 1
    fireEvent.click(screen.getByTestId('form-next')); // → section 2
    fireEvent.click(screen.getByTestId('form-next')); // → section 3
    // На section 3 кнопка превращается в submit
    const submitBtn = screen.getByTestId('form-next');
    expect(submitBtn).toHaveTextContent(/Отправить на согласование/);
    fireEvent.click(submitBtn);

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const call = spy.mock.calls[0]!;
    expect(call[0]).toBe(PROJECT_ID);
    expect(call[1].proposalData.title).toBe(PROPOSAL.title);

    // Toast вышел
    await waitFor(() =>
      expect(screen.getByText(/Изменения отправлены координатору/)).toBeInTheDocument(),
    );
  });

  it('показывает скелетон пока данные грузятся', () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    // Не пресидим: useQuery попытается реально fetch — без MSW в jsdom это
    // будет pending. Скелетон должен появиться.
    render(
      <ToastProvider>
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={[`/mentor/projects/${PROJECT_ID}/info`]}>
            <Routes>
              <Route
                path="/mentor/projects/:projectId/info"
                element={<MentorProjectInfoPage />}
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </ToastProvider>,
    );
    expect(screen.getByTestId('info-skeleton')).toBeInTheDocument();
  });
});
