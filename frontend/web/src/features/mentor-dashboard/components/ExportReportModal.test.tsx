import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ExportReportModal } from './ExportReportModal';

const PERIODS = [
  { value: 'current', label: 'Текущий спринт' },
  { value: 'all', label: 'Все спринты' },
  { value: 'sprint:201', label: 'Спринт 2' },
];

describe('ExportReportModal', () => {
  it('рендерит select периода, radio формата (default PDF) и 4 чекбокса', () => {
    render(
      <ExportReportModal periodOptions={PERIODS} onClose={() => {}} onSubmit={() => {}} />,
    );

    expect(screen.getByLabelText(/Период/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'PDF' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'DOCX' })).not.toBeChecked();
    expect(screen.getByLabelText('Командные отчёты')).toBeChecked();
    expect(screen.getByLabelText('Личные вклады')).toBeChecked();
    expect(screen.getByLabelText('Оценки')).toBeChecked();
    expect(screen.getByLabelText('Встречи')).toBeChecked();
  });

  it('кнопка «Скачать» вызывает onSubmit с выбранными значениями', async () => {
    const onSubmit = vi.fn();
    render(
      <ExportReportModal periodOptions={PERIODS} onClose={() => {}} onSubmit={onSubmit} />,
    );

    await userEvent.selectOptions(screen.getByLabelText(/Период/), 'all');
    await userEvent.click(screen.getByRole('radio', { name: 'DOCX' }));
    await userEvent.click(screen.getByLabelText('Встречи'));
    await userEvent.click(screen.getByRole('button', { name: 'Скачать' }));

    expect(onSubmit).toHaveBeenCalledWith({
      period: 'all',
      format: 'docx',
      includeTeamReports: true,
      includePersonal: true,
      includeScores: true,
      includeMeetings: false,
    });
  });

  it('Esc вызывает onClose', async () => {
    const onClose = vi.fn();
    render(<ExportReportModal periodOptions={PERIODS} onClose={onClose} onSubmit={() => {}} />);

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('кнопка «Отмена» вызывает onClose', async () => {
    const onClose = vi.fn();
    render(<ExportReportModal periodOptions={PERIODS} onClose={onClose} onSubmit={() => {}} />);

    await userEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('клик на overlay закрывает, клик на модалку — нет', () => {
    const onClose = vi.fn();
    render(<ExportReportModal periodOptions={PERIODS} onClose={onClose} onSubmit={() => {}} />);

    const overlay = screen.getByRole('dialog');
    overlay.click();
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    overlay.querySelector('form')?.click();
    expect(onClose).not.toHaveBeenCalled();
  });
});
