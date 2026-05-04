import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AddMeetingModal } from './AddMeetingModal';

describe('AddMeetingModal', () => {
  it('рендерит все поля и default duration = 45 мин', () => {
    render(<AddMeetingModal onClose={() => {}} onSubmit={() => {}} />);

    expect(screen.getByLabelText(/Тема встречи/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Дата/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Время/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Повестка/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ссылка на конференцию/)).toBeInTheDocument();

    const radio45 = screen.getByRole('radio', { name: '45 мин' });
    expect(radio45).toBeChecked();
  });

  it('валидирует обязательные поля и не вызывает onSubmit без них', async () => {
    const onSubmit = vi.fn();
    render(<AddMeetingModal onClose={() => {}} onSubmit={onSubmit} />);

    // браузерная required-валидация может перехватить клик; используем
    // submit формы программно — компонент должен сам сообщить об ошибке.
    await userEvent.click(screen.getByRole('button', { name: 'Назначить' }));

    // onSubmit не должен быть вызван когда нет title/date/time
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('вызывает onSubmit с заполненными полями', async () => {
    const onSubmit = vi.fn();
    render(<AddMeetingModal onClose={() => {}} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/Тема встречи/), 'Спринт-планирование');
    // jsdom не пускает userEvent.type на input[type="date"|"time"]:
    // используем fireEvent.change — он триггерит React onChange.
    fireEvent.change(screen.getByLabelText(/Дата/), { target: { value: '2026-04-15' } });
    fireEvent.change(screen.getByLabelText(/Время/), { target: { value: '15:00' } });

    await userEvent.click(screen.getByRole('radio', { name: '60 мин' }));
    await userEvent.type(screen.getByLabelText(/Повестка/), 'Обсудим backlog');

    await userEvent.click(screen.getByRole('button', { name: 'Назначить' }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Спринт-планирование',
      meetingDate: '2026-04-15',
      startTime: '15:00',
      durationMinutes: 60,
      description: 'Обсудим backlog',
      conferenceLink: undefined,
    });
  });

  it('Esc вызывает onClose', async () => {
    const onClose = vi.fn();
    render(<AddMeetingModal onClose={onClose} onSubmit={() => {}} />);

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('клик на overlay вызывает onClose, клик на модалку — нет', async () => {
    const onClose = vi.fn();
    render(<AddMeetingModal onClose={onClose} onSubmit={() => {}} />);

    const overlay = screen.getByRole('dialog');
    // Используем fireEvent через native click — userEvent имитирует
    // полноценное взаимодействие, но overlay перехватывает event.target.
    overlay.click();
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    const modal = overlay.querySelector('form');
    modal?.click();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('крестик и кнопка «Отмена» вызывают onClose', async () => {
    const onClose = vi.fn();
    render(<AddMeetingModal onClose={onClose} onSubmit={() => {}} />);

    await userEvent.click(screen.getByRole('button', { name: 'Закрыть модалку' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    await userEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('показывает serverError, если передан', () => {
    render(
      <AddMeetingModal
        onClose={() => {}}
        onSubmit={() => {}}
        serverError="Ошибка 500: серверу плохо"
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Ошибка 500: серверу плохо');
  });
});
