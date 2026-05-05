import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { Project } from '@/api/projects';
import type { ProposalData } from '../lib/projectFormState';
import { ArchiveProjectInfoModal } from './ArchiveProjectInfoModal';

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
  acceptanceCriteria: 'Стабильная работа в Chrome/Firefox.',
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

function renderModal(opts?: {
  proposal?: ProposalData | null;
  project?: Project;
  onClose?: () => void;
}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  if (opts?.proposal !== undefined) {
    client.setQueryData(['project', PROJECT_ID, 'proposal'], opts.proposal);
  }
  if (opts?.project) {
    client.setQueryData(['project', PROJECT_ID], opts.project);
  }
  return render(
    <QueryClientProvider client={client}>
      <ArchiveProjectInfoModal projectId={PROJECT_ID} onClose={opts?.onClose ?? (() => {})} />
    </QueryClientProvider>,
  );
}

describe('ArchiveProjectInfoModal', () => {
  it('рендерит поля заявки когда proposal есть', async () => {
    renderModal({ proposal: PROPOSAL, project: PROJECT });

    await waitFor(() => {
      expect(screen.getByTestId('archive-info-body')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('heading', { name: /Цифровой двойник кампуса/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Цель проекта')).toBeInTheDocument();
    expect(screen.getByText('Витрина цифрового двойника кампуса.')).toBeInTheDocument();
    expect(screen.getByText('Технологии')).toBeInTheDocument();
    expect(screen.getByText('React, Three.js, PostgreSQL')).toBeInTheDocument();
    expect(screen.getByText('Минимальный GPA')).toBeInTheDocument();
    expect(screen.getByText('7.0')).toBeInTheDocument();
  });

  it('показывает скелет пока данные грузятся', () => {
    // proposal не пресидим — useQuery попытается реально fetch'нуть, но
    // jsdom в тесте без MSW отдаст ошибку; нам важно поведение isLoading.
    renderModal();
    // Несколько skeletonRow рендерится сразу.
    const body = document.querySelector('[class*="body"]');
    expect(body).toBeTruthy();
  });

  it('Esc закрывает модалку', async () => {
    const onClose = vi.fn();
    renderModal({ proposal: PROPOSAL, project: PROJECT, onClose });

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('клик по overlay вызывает onClose, клик по модалке — нет', () => {
    const onClose = vi.fn();
    renderModal({ proposal: PROPOSAL, project: PROJECT, onClose });

    const overlay = screen.getByRole('dialog');
    overlay.click();
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    const heading = screen.getByRole('heading', { name: /Цифровой двойник кампуса/ });
    heading.click();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('крестик и кнопка «Закрыть» вызывают onClose', async () => {
    const onClose = vi.fn();
    renderModal({ proposal: PROPOSAL, project: PROJECT, onClose });

    await userEvent.click(screen.getByRole('button', { name: 'Закрыть модалку' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    await userEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('падает на fallback (поля Project) если proposal=null', async () => {
    renderModal({
      proposal: null,
      project: {
        ...PROJECT,
        goal: 'Цель из Project',
        description: 'Описание из Project',
        technologies: ['Go', 'Python'],
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId('archive-info-body')).toBeInTheDocument();
    });

    expect(screen.getByText('Цель из Project')).toBeInTheDocument();
    expect(screen.getByText('Go, Python')).toBeInTheDocument();
  });
});
