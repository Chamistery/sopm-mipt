import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { ToastProvider } from './ToastProvider';
import { useToast } from './useToast';

function Trigger({
  message,
  options,
  label = 'show',
}: {
  message: string;
  options?: Parameters<ReturnType<typeof useToast>['showToast']>[1];
  label?: string;
}): JSX.Element {
  const { showToast } = useToast();
  return (
    <button type="button" onClick={() => showToast(message, options)}>
      {label}
    </button>
  );
}

describe('ToastProvider + useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('showToast добавляет toast в стек', () => {
    render(
      <ToastProvider>
        <Trigger message="Команда запущена" />
      </ToastProvider>,
    );

    expect(screen.queryByText('Команда запущена')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'show' }));
    expect(screen.getByText('Команда запущена')).toBeInTheDocument();
  });

  it('auto-dismiss закрывает toast через duration', () => {
    render(
      <ToastProvider>
        <Trigger message="Сохранено" options={{ duration: 1500 }} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'show' }));
    expect(screen.getByText('Сохранено')).toBeInTheDocument();

    // По истечении duration — toast помечается leaving, потом удаляется
    // через EXIT_ANIMATION_MS (200ms).
    act(() => {
      vi.advanceTimersByTime(1500 + 200);
    });
    expect(screen.queryByText('Сохранено')).toBeNull();
  });

  it('клик по toast-у закрывает его', () => {
    render(
      <ToastProvider>
        <Trigger message="Нажми меня" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'show' }));
    const toast = screen.getByText('Нажми меня');
    fireEvent.click(toast);
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.queryByText('Нажми меня')).toBeNull();
  });

  it('sticky toast (duration: 0) не закрывается по таймеру', () => {
    render(
      <ToastProvider>
        <Trigger message="Идёт сохранение..." options={{ duration: 0, kind: 'info' }} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'show' }));
    expect(screen.getByText('Идёт сохранение...')).toBeInTheDocument();

    // Прошло сильно больше дефолтного duration — toast всё ещё на месте.
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText('Идёт сохранение...')).toBeInTheDocument();
  });

  it('error toast получает role="alert" и aria-live="assertive"', () => {
    render(
      <ToastProvider>
        <Trigger message="Сетевая ошибка" options={{ kind: 'error' }} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'show' }));
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    expect(alert).toHaveTextContent('Сетевая ошибка');
  });

  it('стек: несколько toast-ов рендерятся одновременно', () => {
    render(
      <ToastProvider>
        <Trigger message="Первый" label="a" options={{ duration: 0 }} />
        <Trigger message="Второй" label="b" options={{ duration: 0 }} />
        <Trigger message="Третий" label="c" options={{ duration: 0 }} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'a' }));
    fireEvent.click(screen.getByRole('button', { name: 'b' }));
    fireEvent.click(screen.getByRole('button', { name: 'c' }));
    expect(screen.getByText('Первый')).toBeInTheDocument();
    expect(screen.getByText('Второй')).toBeInTheDocument();
    expect(screen.getByText('Третий')).toBeInTheDocument();
  });

  it('useToast вне провайдера — кидает ошибку', () => {
    function Boom(): JSX.Element {
      useToast();
      return <span />;
    }
    // Подавим React-ный console.error для этого теста.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Boom />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});
