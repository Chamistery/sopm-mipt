import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { SprintScore } from '@/api/sprintScores';
import type { Sprint } from '@/api/teams';
import type { TeamReport } from '@/api/teamReports';
import { ToastProvider } from '@/_shared/Toast';

import { SprintReportCard, type SprintReportCardMember } from './SprintReportCard';

const SPRINT: Sprint = {
  id: 201,
  projectId: 100,
  number: 2,
  startDate: '2026-03-17',
  endDate: '2026-04-06',
  status: 'Активный',
};

const REPORT: TeamReport = {
  id: 600,
  sprintId: 201,
  teamId: 300,
  summary: 'Закончили auth.',
  problems: 'VDI-доступ задержался.',
  nextPlan: 'MSW e2e.',
  status: 'Отправлен',
};

const MEMBERS: SprintReportCardMember[] = [
  { userId: 3, shortName: 'Петров И.', avatarInitials: 'ПИ' },
  { userId: 4, shortName: 'Стародубов А.', avatarInitials: 'СА' },
];

function renderCard(opts: {
  expanded?: boolean;
  status?: TeamReport['status'];
  scores?: SprintScore[];
  onSaveScores?: ReturnType<typeof vi.fn>;
  onAcceptReport?: ReturnType<typeof vi.fn>;
  onToggle?: ReturnType<typeof vi.fn>;
} = {}) {
  const onToggle = opts.onToggle ?? vi.fn();
  const onSaveScores =
    opts.onSaveScores ?? vi.fn(async () => ({ ok: true as const, saved: [] }));
  const onAcceptReport =
    opts.onAcceptReport ?? vi.fn(async () => ({ ok: true as const }));
  const utils = render(
    <ToastProvider>
      <SprintReportCard
        report={{ ...REPORT, status: opts.status ?? REPORT.status }}
        sprint={SPRINT}
        members={MEMBERS}
        scores={opts.scores ?? []}
        scoresLoading={false}
        expanded={opts.expanded ?? true}
        onToggle={onToggle}
        onSaveScores={onSaveScores}
        onAcceptReport={onAcceptReport}
      />
    </ToastProvider>,
  );
  return { ...utils, onToggle, onSaveScores, onAcceptReport };
}

describe('SprintReportCard', () => {
  it('рендерит заголовок «Спринт 2 (17 мар — 6 апр)» и бейдж «Ждёт проверки» для статуса «Отправлен»', () => {
    renderCard({ status: 'Отправлен' });
    expect(screen.getByText('Спринт 2 (17 мар — 6 апр)')).toBeInTheDocument();
    expect(screen.getByText('Ждёт проверки')).toBeInTheDocument();
  });

  it('бейдж «Проверен · 8/10» для проверенного отчёта со средним 8', () => {
    renderCard({
      status: 'Проверен',
      scores: [
        { id: 1, sprintId: 201, teamId: 300, studentId: 3, score: 9, scoredById: 1 },
        { id: 2, sprintId: 201, teamId: 300, studentId: 4, score: 7, scoredById: 1 },
      ],
    });
    expect(screen.getByText('Проверен · 8/10')).toBeInTheDocument();
  });

  it('кнопка-header вызывает onToggle', async () => {
    const onToggle = vi.fn();
    renderCard({ expanded: false, onToggle });
    await userEvent.click(screen.getByRole('button', { expanded: false }));
    expect(onToggle).toHaveBeenCalled();
  });

  it('батчит «Сохранить оценки» через onSaveScores', async () => {
    const onSaveScores = vi.fn(async () => ({ ok: true as const, saved: [] }));
    renderCard({ onSaveScores });

    fireEvent.change(screen.getByLabelText(/Балл, Петров И\./), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/Балл, Стародубов А\./), { target: { value: '7' } });

    await userEvent.click(screen.getByRole('button', { name: /Сохранить оценки/ }));

    expect(onSaveScores).toHaveBeenCalledTimes(1);
    const firstCall = onSaveScores.mock.calls[0] as unknown as [
      Array<{ score: number | null }>,
    ];
    const passed = firstCall[0];
    expect(passed).toHaveLength(2);
    expect(passed.map((d) => d.score).sort()).toEqual([7, 8]);

    await waitFor(() => {
      expect(screen.getByText('Оценки сохранены')).toBeInTheDocument();
    });
  });

  it('кнопка «Принять отчёт» доступна только для статуса «Отправлен» и вызывает onAcceptReport', async () => {
    const onAcceptReport = vi.fn(async () => ({ ok: true as const }));
    renderCard({ status: 'Отправлен', onAcceptReport });

    const btn = screen.getByRole('button', { name: 'Принять отчёт' });
    await userEvent.click(btn);
    expect(onAcceptReport).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText('Отчёт принят')).toBeInTheDocument();
    });
  });

  it('для статуса «Проверен» кнопки «Принять отчёт» нет', () => {
    renderCard({ status: 'Проверен' });
    expect(screen.queryByRole('button', { name: 'Принять отчёт' })).not.toBeInTheDocument();
  });

  it('кнопка «Сохранить оценки» disabled, пока ничего не изменено', () => {
    renderCard();
    const btn = screen.getByRole('button', { name: /Сохранить оценки/ });
    expect(btn).toBeDisabled();
  });

  it('aria-expanded синхронизирован с expanded prop', () => {
    const { rerender } = renderCard({ expanded: false });
    let btn = screen.getByRole('button', { expanded: false });
    expect(btn).toHaveAttribute('aria-expanded', 'false');

    rerender(
      <ToastProvider>
        <SprintReportCard
          report={REPORT}
          sprint={SPRINT}
          members={MEMBERS}
          scores={[]}
          scoresLoading={false}
          expanded
          onToggle={vi.fn()}
          onSaveScores={vi.fn(async () => ({ ok: true as const, saved: [] }))}
          onAcceptReport={vi.fn(async () => ({ ok: true as const }))}
        />
      </ToastProvider>,
    );
    btn = screen.getByRole('button', { expanded: true });
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });
});
